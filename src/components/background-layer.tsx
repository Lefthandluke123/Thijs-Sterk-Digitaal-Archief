"use client";

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

/**
 * @fileOverview BackgroundLayer: Beheert de achtergrondafbeelding.
 * Ondersteunt pagina-specifieke overrides en vloeiende transities.
 */
export function BackgroundLayer() {
  const firestore = useFirestore();
  const pathname = usePathname();

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

  // Bepaal de huidige page-key op basis van het pad
  const getPageKey = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/gallery')) return 'gallery';
    if (pathname.startsWith('/shop')) return 'shop';
    if (pathname.startsWith('/curator')) return 'curator';
    if (pathname.startsWith('/exhibition')) return 'exhibition';
    if (pathname.startsWith('/beatrijs')) return 'beatrijs';
    if (pathname.startsWith('/hanneke')) return 'hanneke';
    if (pathname.startsWith('/peter-bes')) return 'peter-bes';
    if (pathname.startsWith('/leo-duppen')) return 'leo-duppen';
    return 'global';
  };

  const pageKey = getPageKey();
  
  // Zoek naar pagina-specifieke instellingen, anders fallback naar global
  const bgUrl = settings?.[`backgroundImageUrl_${pageKey}`] || settings?.backgroundImageUrl;
  
  // Opacity: gebruik page-specifiek, anders global, anders fallback naar 10% als er een URL is
  let rawOpacity = settings?.[`backgroundOpacity_${pageKey}`] ?? settings?.backgroundOpacity;
  
  // Als er een afbeelding is maar geen opacity ingesteld, gebruik 10%
  if (bgUrl && (rawOpacity === undefined || rawOpacity === null)) {
    rawOpacity = 10;
  }
  
  const opacity = typeof rawOpacity === 'number' ? rawOpacity / 100 : 0;

  if (!bgUrl) return null;

  return (
    <div 
      className="bg-fade-layer"
      style={{ 
        opacity: opacity,
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        zIndex: -1, // Zorg dat het achter de content staat
      }}
      aria-hidden="true"
    />
  );
}