
'use client';

import { useEffect, useState } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(collectionQuery: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(!!collectionQuery);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionQuery) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      async (serverError: FirestoreError) => {
        // Alleen een Permission Error emitten als het daadwerkelijk om rechten gaat op de server.
        // Andere fouten (zoals privemodus-blokkades) negeren we voor de UI om verwarring te voorkomen.
        if (serverError.code === 'permission-denied') {
          // Haal het pad op voor context, maar voorkom circular structure errors
          const path = (collectionQuery as any)._query?.path?.segments?.join('/') || 'collection';
          const permissionError = new FirestorePermissionError({
            path,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          // Log andere fouten (netwerk, etc.) alleen in de console
          console.warn('Firestore non-critical error:', serverError.code, serverError.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [collectionQuery]); // Vertrouw op useMemoFirebase in de componenten

  return { data, loading, error };
}
