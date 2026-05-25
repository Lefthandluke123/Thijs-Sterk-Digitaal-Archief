'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

/**
 * @fileOverview Beheert de Firebase lifecycle op de client.
 * Fix: Initialiseert met null-instances om SSR/Hydration mismatches te voorkomen.
 */
export const FirebaseClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Start ALTIJD met nulls om de server output exact te matchen tijdens hydration
  const [instances, setInstances] = useState(() => ({
    firebaseApp: null,
    firestore: null,
    auth: null,
    storage: null
  }));

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Initialiseer pas op de client ná de eerste render
    const inits = initializeFirebase();
    setInstances(inits as any);
    
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img') || target.closest('.navigator')) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

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
