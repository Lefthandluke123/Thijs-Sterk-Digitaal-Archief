
"use client";

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

/**
 * @fileOverview BackgroundLayer: Beheert de globale achtergrondafbeelding van het museum.
 * De opacity en afbeelding zijn instelbaar via de Admin settings.
 */
export function BackgroundLayer() {
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

  const bgUrl = settings?.backgroundImageUrl;
  const opacity = typeof settings?.backgroundOpacity === 'number' ? settings.backgroundOpacity / 100 : 0;

  if (!bgUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[-1] pointer-events-none transition-opacity duration-1000"
      style={{ 
        opacity: opacity,
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
      aria-hidden="true"
    />
  );
}
