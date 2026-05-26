
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, ArrowRight, Palette } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

export function PortfolioGrid() {
  const [mounted, setMounted] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'artworks'), where('featured', '==', true), limit(18));
  }, [firestore, mounted]);

  const { data: displayArtworks, loading } = useCollection(artworksQuery);

  const navigateDisplay = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !displayArtworks?.length) return;
    const currentIndex = displayArtworks.findIndex(art => art.id === selectedArtwork.id);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % displayArtworks.length 
      : (currentIndex - 1 + displayArtworks.length) % displayArtworks.length;
    setSelectedArtwork(displayArtworks[nextIndex]);
  }, [selectedArtwork, displayArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedArtwork) return;
      if (e.key === 'ArrowRight') navigateDisplay('next');
      if (e.key === 'ArrowLeft') navigateDisplay('prev');
      if (e.key === 'Escape') setSelectedArtwork(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, navigateDisplay]);

  const portfolioTitle = (mounted && language !== 'nl' && siteSettings?.[`homePortfolioTitle_${language}`])
    ? siteSettings[`homePortfolioTitle_${language}`]
    : siteSettings?.homePortfolioTitle || t('homePortfolioTitle');

  return (
    <section className="py-20 bg-background px-4" id="portfolio" aria-labelledby="portfolio-heading">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-8">
          <div className="max-w-2xl">
            <h2 id="portfolio-heading" className="font-headline text-[13px] md:text-[15px] font-light mb-2 tracking-tight uppercase">
              {portfolioTitle.split(' ').map((word, i, arr) => 
                i === arr.length - 1 ? <span key={i} className="italic">{word}</span> : word + ' '
              )}
            </h2>
            <div className="h-px w-12 bg-accent/30" aria-hidden="true" />
          </div>
        </div>

        {!mounted || loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin opacity-20 w-8 h-8" />
          </div>
        ) : displayArtworks && displayArtworks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {displayArtworks.map(art => {
              const imgSrc = art.image || art.imageUrl;
              const title = art.displayTitle || art.title;
              return (
                <article 
                  key={art.id} 
                  className="group relative"
                >
                  <button 
                    onClick={() => setSelectedArtwork(art)}
                    aria-label={`Bekijk detail van ${title}`}
                    className="w-full text-left focus-visible:ring-4 focus-visible:ring-accent rounded-2xl overflow-hidden"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/30 transition-all duration-700 group-hover:shadow-2xl flex items-center justify-center">
                      {imgSrc ? (
                        <img 
                          src={imgSrc} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.1]" 
                          style={{ filter: `brightness(${art.brightness || 1})` }} 
                          alt={`Schilderij: ${title}`}
                          loading="lazy"
                        />
                      ) : (
                        <Palette className="w-8 h-8 opacity-10" aria-hidden="true" />
                      )}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="text-white w-6 h-6" aria-hidden="true" />
                      </div>
                    </div>
                  </button>
                  <div className="mt-3 text-center px-1">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {title}
                    </h3>
                    <Link 
                      href={`/art/${art.slug}`} 
                      className="mt-1 text-[8px] font-bold text-accent opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-all focus-visible:opacity-100"
                    >
                      Details <ArrowRight className="w-2 h-2" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
           <div className="py-24 text-center opacity-20 italic">
              Nog geen hoogtepunten geselecteerd.
           </div>
        )}
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onPrev={() => navigateDisplay('prev')}
        onNext={() => navigateDisplay('next')}
      />
    </section>
  );
}
