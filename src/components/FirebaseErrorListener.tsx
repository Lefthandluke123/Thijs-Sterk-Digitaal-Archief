
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: any) => {
      console.error('Firestore Permission Error:', error);
      toast({
        variant: "destructive",
        title: "Toegang Geweigerd",
        description: "Je hebt geen toestemming om deze actie uit te voeren. Controleer de database-regels.",
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null;
}
