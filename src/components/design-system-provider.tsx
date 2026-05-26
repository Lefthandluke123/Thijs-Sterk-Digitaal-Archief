
"use client";

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

/**
 * @fileOverview DesignSystemProvider: Vertaalt Firestore instellingen naar dynamische CSS variabelen.
 * Dit vormt het 'stramien' van de website (fonts, kleuren, spatiëring, regelafstand).
 * Fix: Krachtigere heading scaling toegevoegd.
 */
export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings } = useDoc(settingsRef);

  if (!settings) return <>{children}</>;

  // Extract HSL or Hex values (fallback to defaults if empty)
  const background = settings.bgColor || '40 15% 97%';
  const primary = settings.primaryColor || '201 45% 5%';
  const accent = settings.accentColor || '142 30% 25%';
  const baseFontSize = settings.baseFontSize || '16px';
  const lineHeight = settings.lineHeight || '1.7';
  const headingScale = settings.headingScale || 1.25; 
  const containerWidth = settings.containerWidth || '1280px';
  const radius = settings.radius || '2rem';
  
  // Custom Fonts selection
  const bodyFont = settings.bodyFont === 'serif' ? '"Playfair Display", serif' : '"Inter", sans-serif';
  const headFont = settings.headFont === 'sans' ? '"Inter", sans-serif' : '"Playfair Display", serif';

  const dynamicStyles = `
    :root {
      --background: ${background};
      --primary: ${primary};
      --accent: ${accent};
      --radius: ${radius};
      
      --site-base-font-size: ${baseFontSize};
      --site-line-height: ${lineHeight};
      --site-heading-scale: ${headingScale};
      --site-container-max-width: ${containerWidth};
      
      --font-body: ${bodyFont};
      --font-headline: ${headFont};
    }

    body {
      font-size: var(--site-base-font-size);
      line-height: var(--site-line-height);
      font-family: var(--font-body);
    }

    h1, h2, h3, .font-headline {
      font-family: var(--font-headline);
    }

    /* Krachtige Heading Scaling die Tailwind utility classes overleeft */
    h1, .text-h1 { font-size: calc(clamp(2.5rem, 8vw, 5rem) * var(--site-heading-scale)) !important; line-height: 1.1 !important; }
    h2, .text-h2 { font-size: calc(clamp(2rem, 5vw, 3.5rem) * var(--site-heading-scale)) !important; line-height: 1.2 !important; }
    h3, .text-h3 { font-size: calc(clamp(1.5rem, 3vw, 2.5rem) * var(--site-heading-scale)) !important; line-height: 1.3 !important; }

    .container {
      max-width: var(--site-container-max-width) !important;
    }
    
    .prose-text {
      line-height: var(--site-line-height);
      font-size: var(--site-base-font-size);
    }
  `;

  return (
    <>
      <style id="dynamic-stramien-styles" dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      {children}
    </>
  );
}
