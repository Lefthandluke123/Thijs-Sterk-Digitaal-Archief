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
import { useAuth } from '../provider';

/**
 * @fileOverview Hook voor het realtime ophalen van een collectie met verbeterde foutafhandeling.
 * Voorkomt runtime crashes bij permissiefouten.
 */
export function useCollection<T = DocumentData>(collectionQuery: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(!!collectionQuery);
  const [error, setError] = useState<Error | null>(null);
  const auth = useAuth();

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
      (serverError: FirestoreError) => {
        // Log gedetailleerde diagnostiek naar de console
        console.group('🔥 Firestore Query Error');
        console.error('Message:', serverError.message);
        console.error('Code:', serverError.code);
        console.info('Auth State:', auth?.currentUser ? `Logged in as ${auth.currentUser.uid}` : 'Anonymous');
        console.groupEnd();

        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'collection_query',
            operation: 'list',
          });
          
          // Emitter zorgt voor de Toast melding, maar we laten de app niet crashen
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          setError(new Error(serverError.message));
        }
        
        setData([]); // Fallback naar lege lijst
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionQuery, auth]);

  return { data, loading, error };
}