
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export const FirebaseClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Gebruik state om te zorgen dat we pas initialiseren op de client
  const [instances, setInstances] = useState(() => initializeFirebase());

  useEffect(() => {
    // Forceer een re-init op de client mocht de eerste pass (SSR) nulls hebben opgeleverd
    setInstances(initializeFirebase());
    
    // Globale event listeners om het kopiëren van foto's te bemoeilijken
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img') || target.closest('.navigator')) {
        e.preventDefault();
        return false;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Als we nog geen instances hebben (tijdens SSR), renderen we de provider met nulls
  // De FirebaseProvider context is al ingesteld om hiermee om te gaan.
  return (
    <FirebaseProvider 
      firebaseApp={instances.firebaseApp as any} 
      firestore={instances.firestore as any} 
      auth={instances.auth as any} 
      storage={instances.storage as any}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
};
