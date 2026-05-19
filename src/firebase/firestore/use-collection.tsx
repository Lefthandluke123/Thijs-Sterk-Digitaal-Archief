
'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(collectionQuery: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(!!collectionQuery);
  const [error, setError] = useState<Error | null>(null);
  
  const queryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!collectionQuery) {
      setLoading(false);
      setData(null);
      return;
    }

    // Genereer een stabiele sleutel voor de query om onnodige re-renders te voorkomen
    const currentQueryKey = JSON.stringify((collectionQuery as any)._query || 'default');
    
    if (currentQueryKey !== queryRef.current) {
      if (!data) setLoading(true);
      queryRef.current = currentQueryKey;
    }

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
      async (serverError) => {
        // Bepaal het pad voor de foutmelding
        let path = 'collection';
        try {
          path = (collectionQuery as any)._query?.path?.segments?.join('/') || 'artworks';
        } catch (e) {
          path = 'artworks';
        }

        const permissionError = new FirestorePermissionError({
          path,
          operation: 'list',
        });
        
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionQuery]);

  return { data, loading, error };
}
