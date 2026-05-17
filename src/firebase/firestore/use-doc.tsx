'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const lastDocPath = useRef<string | null>(null);
  const docPath = docRef?.path || null;

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      return;
    }

    if (docPath !== lastDocPath.current) {
      setLoading(true);
      lastDocPath.current = docPath;
    }

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(new Error('Firestore request timed out'));
      }
    }, 15000);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<T>) => {
        setData(snapshot.exists() ? { ...snapshot.data()!, id: snapshot.id } : null);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      async (serverError) => {
        clearTimeout(timeoutId);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
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
  }, [docRef, docPath]);

  return { data, loading, error };
}
