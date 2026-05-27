"use client";

import React, { useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

/**
 * @fileOverview BackgroundLayer: Beheert de atmosferische achtergrond op de hele site.
 * Gebruikt standaard useMemo voor stabiele Firestore document references.
 */
export function BackgroundLayer() {
  const firestore = useFirestore();
  const pathname = usePathname();

  const settingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

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
    if (!settings || pathname.startsWith('/admin')) return;

    const pageKey = getPageKey();
    const prefix = pageKey === 'global' ? '' : `_${pageKey}`;
    
    const bgUrl = settings[`backgroundImageUrl${prefix}`] || settings.backgroundImageUrl || '';
    const opacity = settings[`backgroundOpacity${prefix}`] ?? settings.backgroundOpacity ?? 10;
    const blur = settings[`backgroundBlur${prefix}`] ?? settings.backgroundBlur ?? 0;
    const scale = settings[`backgroundScale${prefix}`] ?? settings.backgroundScale ?? 100;
    const brightness = settings[`backgroundBrightness${prefix}`] ?? settings.backgroundBrightness ?? 100;

    const root = document.documentElement;
    root.style.setProperty('--bg-image', bgUrl ? `url("${bgUrl}")` : 'none');
    root.style.setProperty('--bg-opacity', (opacity / 100).toString());
    root.style.setProperty('--bg-blur', `${blur}px`);
    root.style.setProperty('--bg-scale', (scale / 100).toString());
    root.style.setProperty('--bg-brightness', (brightness / 100).toString());
  }, [settings, pathname]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <div 
      className="bg-fade-layer"
      aria-hidden="true"
    />
  );
}
