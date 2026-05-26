"use client";

import React, { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

/**
 * @fileOverview BackgroundLayer: Beheert de achtergrondafbeelding.
 * STABILIZED VERSION - Gebruikt CSS variabelen voor realtime feedback zonder lag.
 */
export function BackgroundLayer() {
  const firestore = useFirestore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!mounted || !settings) return;

    const pageKey = getPageKey();
    
    // 1. URL bepalen
    const bgUrl = settings[`backgroundImageUrl_${pageKey}`] || settings.backgroundImageUrl || '';
    
    // 2. Opacity bepalen
    let opacity = settings[`backgroundOpacity_${pageKey}`] ?? settings.backgroundOpacity ?? (bgUrl ? 10 : 0);
    
    // 3. Blur bepalen
    let blur = settings[`backgroundBlur_${pageKey}`] ?? settings.backgroundBlur ?? 0;
    
    // 4. Scale bepalen
    let scale = settings[`backgroundScale_${pageKey}`] ?? settings.backgroundScale ?? 100;

    // Injecteer in :root voor de .bg-fade-layer class
    const root = document.documentElement;
    root.style.setProperty('--bg-image', bgUrl ? `url("${bgUrl}")` : 'none');
    root.style.setProperty('--bg-opacity', (opacity / 100).toString());
    root.style.setProperty('--bg-blur', `${blur}px`);
    root.style.setProperty('--bg-scale', (scale / 100).toString());

  }, [settings, pathname, mounted]);

  if (!mounted) return null;

  return (
    <div 
      className="bg-fade-layer"
      aria-hidden="true"
    />
  );
}
