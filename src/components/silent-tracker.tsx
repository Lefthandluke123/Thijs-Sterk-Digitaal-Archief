
"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview SilentTracker: Legt onzichtbaar elke actie van de bezoeker vast.
 */
export function SilentTracker() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user } = useUser();
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    // Genereer een eenmalige sessie-ID voor deze bezoeker
    if (!sessionIdRef.current) {
      sessionIdRef.current = Math.random().toString(36).substring(2, 15);
    }
  }, []);

  const logEvent = async (type: string, data: any = {}) => {
    if (!firestore) return;
    
    try {
      await addDoc(collection(firestore, 'activity_logs'), {
        type,
        path: pathname,
        sessionId: sessionIdRef.current,
        userId: user?.uid || null,
        userName: user?.displayName || null,
        timestamp: serverTimestamp(),
        ...data
      });
    } catch (e) {
      // Stil falen om de gebruiker niet te storen
    }
  };

  // Log paginabezoeken
  useEffect(() => {
    logEvent('page_view');
  }, [pathname, firestore]);

  // Luister naar custom events vanuit de app (zoals artwork views)
  useEffect(() => {
    const handleArtworkView = (e: any) => {
      logEvent('artwork_view', { 
        targetId: e.detail?.id, 
        targetTitle: e.detail?.title 
      });
    };

    const handleInteraction = (e: any) => {
      logEvent('interaction', { 
        action: e.detail?.action,
        meta: e.detail?.meta || {}
      });
    };

    window.addEventListener('track-artwork', handleArtworkView);
    window.addEventListener('track-interaction', handleInteraction);

    return () => {
      window.removeEventListener('track-artwork', handleArtworkView);
      window.removeEventListener('track-interaction', handleInteraction);
    };
  }, [pathname, firestore, user]);

  return null; // Volledig onzichtbaar
}
