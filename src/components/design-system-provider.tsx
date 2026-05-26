
"use client";

import React, { useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

/**
 * @fileOverview DesignSystemProvider: Injecteert dynamische stijlen uit Firestore.
 * Verwerkt zowel globale typografie-tokens als specifieke overrides.
 */
export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

  const dynamicStyles = useMemo(() => {
    if (!settings) return "";

    const background = settings.bgColor || '40 15% 97%';
    const primary = settings.primaryColor || '201 45% 5%';
    const accent = settings.accentColor || '142 30% 25%';
    const baseFontSize = settings.baseFontSize || '16px';
    const radius = settings.radius || '2rem';
    
    const bodyFont = settings.bodyFont === 'serif' ? '"Playfair Display", serif' : '"Inter", sans-serif';
    const headFont = settings.headFont === 'sans' ? '"Inter", sans-serif' : '"Playfair Display", serif';

    // Typography Tokens uit database (met harde fallbacks uit globals.css)
    const t = settings.typography || {};
    const h1Size = t.h1?.fontSize || 64;
    const h2Size = t.h2?.fontSize || 48;
    const h3Size = t.h3?.fontSize || 32;
    const btnSize = t.button?.fontSize || 14;
    const navSize = t.nav?.fontSize || 10;

    // Pas de globale schaal toe (indien aanwezig)
    const scale = settings.headingScale ?? 1;
    
    // CSS Variables bouwen
    let css = `
      :root {
        --background: ${background};
        --primary: ${primary};
        --accent: ${accent};
        --radius: ${radius};
        
        --font-body: ${bodyFont};
        --font-headline: ${headFont};

        --h1-size: ${h1Size * scale}px;
        --h2-size: ${h2Size * scale}px;
        --h3-size: ${h3Size * scale}px;
        --button-size: ${btnSize}px;
        --nav-size: ${navSize}px;
      }
    `;

    // Pas individuele overrides toe (locked elements)
    const overrides = settings.typographyOverrides || {};
    Object.entries(overrides).forEach(([id, style]: [string, any]) => {
      if (style.fontSize) {
        css += `[data-dtp-id="${id}"] { font-size: ${style.fontSize}px !important; } `;
      }
    });

    return css;
  }, [settings]);

  return (
    <>
      <style id="dynamic-design-tokens" dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      {children}
    </>
  );
}
