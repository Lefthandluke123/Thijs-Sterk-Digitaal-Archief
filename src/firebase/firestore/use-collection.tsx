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
  
  const lastQueryRef = useRef<string | null>(null);
  // Brittle but effective way to detect structural query changes for loading state
  const queryIdentifier = (collectionQuery as any)?._query?.path?.toString() || null;

  useEffect(() => {
    if (!collectionQuery) {
      setLoading(false);
      return;
    }

    // Only trigger loading state if the query is fundamentally different
    if (queryIdentifier !== lastQueryRef.current) {
      setLoading(true);
      lastQueryRef.current = queryIdentifier;
    }

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: queryIdentifier || 'unknown',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionQuery, queryIdentifier]);

  return { data, loading, error };
}
