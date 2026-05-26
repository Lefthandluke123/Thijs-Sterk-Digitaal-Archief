"use client";

import React, { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

/**
 * @fileOverview BackgroundLayer: Beheert de atmosferische achtergrond op de hele site.
 * Deze component luistert naar de realtime settings in Firestore.
 */
export function BackgroundLayer() {
  const firestore = useFirestore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);

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

  useEffect(() => {
    if (!mounted || !settings) return;

    // Als we in de admin zijn, wordt de preview afgehandeld door de AdminPage zelf
    // om conflicten tussen editor-state en database-state te voorkomen.
    if (pathname.startsWith('/admin')) return;

    const pageKey = getPageKey();
    const prefix = pageKey === 'global' ? '' : `_${pageKey}`;
    
    // 1. Bron van waarheid: Check eerst de pagina-override, dan de globale waarde
    const bgUrl = settings[`backgroundImageUrl${prefix}`] || settings.backgroundImageUrl || '';
    
    // 2. Waarden bepalen met correcte fallbacks
    const opacity = settings[`backgroundOpacity${prefix}`] ?? settings.backgroundOpacity ?? 10;
    const blur = settings[`backgroundBlur${prefix}`] ?? settings.backgroundBlur ?? 0;
    const scale = settings[`backgroundScale${prefix}`] ?? settings.backgroundScale ?? 100;
    const brightness = settings[`backgroundBrightness${prefix}`] ?? settings.backgroundBrightness ?? 100;

    // 3. Toepassen op de CSS variabelen in de :root
    const root = document.documentElement;
    root.style.setProperty('--bg-image', bgUrl ? `url("${bgUrl}")` : 'none');
    root.style.setProperty('--bg-opacity', (opacity / 100).toString());
    root.style.setProperty('--bg-blur', `${blur}px`);
    root.style.setProperty('--bg-scale', (scale / 100).toString());
    root.style.setProperty('--bg-brightness', (brightness / 100).toString());

    // Debug log voor publieke sync
    console.log(`[BACKGROUND SYNC] Page: ${pageKey} | Image: ${bgUrl ? 'YES' : 'NONE'} | Opacity: ${opacity}%`);

  }, [settings, pathname, mounted]);

  if (!mounted || pathname.startsWith('/admin')) return null;

  return (
    <div 
      className="bg-fade-layer"
      aria-hidden="true"
    />
  );
}