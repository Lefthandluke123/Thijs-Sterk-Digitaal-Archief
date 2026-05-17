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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track current query path to prevent unnecessary re-loading states
  const lastQueryPath = useRef<string | null>(null);
  const queryPath = (collectionQuery as any)?._query?.path?.toString() || null;

  useEffect(() => {
    if (!collectionQuery) {
      setLoading(false);
      return;
    }

    // Only set loading to true if the query path has actually changed
    if (queryPath !== lastQueryPath.current) {
      setLoading(true);
      lastQueryPath.current = queryPath;
    }

    // Timeout guard: never hang indefinitely
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(new Error('Firestore request timed out'));
      }
    }, 15000);

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      async (serverError) => {
        clearTimeout(timeoutId);
        const permissionError = new FirestorePermissionError({
          path: queryPath || 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [collectionQuery, queryPath]);

  return { data, loading, error };
}
