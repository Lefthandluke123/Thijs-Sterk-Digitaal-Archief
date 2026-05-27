'use client';

import { useEffect, useState } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData,
  FirestoreError 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useAuth } from '../provider';

/**
 * @fileOverview Hook voor het realtime ophalen van een document met verbeterde foutafhandeling.
 * Voorkomt runtime crashes bij permissiefouten.
 */
export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!docRef);
  const [error, setError] = useState<Error | null>(null);
  const auth = useAuth();

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<T>) => {
        setData(snapshot.exists() ? { ...(snapshot.data() as any), id: snapshot.id } : null);
        setLoading(false);
        setError(null);
      },
      (serverError: FirestoreError) => {
        console.group('🔥 Firestore Document Error');
        console.error('Path:', docRef.path);
        console.error('Message:', serverError.message);
        console.info('Auth State:', auth?.currentUser ? `Logged in as ${auth.currentUser.uid}` : 'Anonymous');
        console.groupEnd();

        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          setError(new Error(serverError.message));
        }
        
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef, auth]);

  return { data, loading, error };
}