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
  
  // Gebruik een ref om het query-pad te tracken in plaats van de query-instantie zelf
  const queryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!collectionQuery) {
      setLoading(false);
      setData(null);
      return;
    }

    // Stabiliseer de query-check op basis van de interne query-structuur
    const currentQueryKey = (collectionQuery as any)._query?.path?.toString() || 'unknown';
    
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
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'collection',
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
