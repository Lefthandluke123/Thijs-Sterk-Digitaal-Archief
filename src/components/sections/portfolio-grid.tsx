
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, Star } from 'lucide-react';

export function PortfolioGrid() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), where('featured', '==', true), limit(12));
  }, [firestore]);

  const latestQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'), limit(12));
  }, [firestore]);

  const { data: featuredArtworks, loading: loadingFeatured } = useCollection(artworksQuery);
  const { data: latestArtworks, loading: loadingLatest } = useCollection(latestQuery);

  const displayArtworks = useMemo(() => {
    const raw = featuredArtworks && featuredArtworks.length > 0 
      ? featuredArtworks 
      : (latestArtworks || []);
    
    const seen = new Set();
    return raw.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [featuredArtworks, latestArtworks]);

  const navigateDisplay = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !displayArtworks.length) return;
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

  const loading = loadingFeatured && loadingLatest;

  return (
    <section className="py-24 bg-background px-4" id="portfolio">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="font-headline text-[14px] md:text-[16px] font-light mb-4 tracking-tight uppercase">
              Meester <span className="italic">Selectie</span>
            </h2>
          </div>
          <div className="flex gap-10 text-[9px] font-black tracking-[0.3em] uppercase">
            <a href="/gallery" className="text-muted-foreground hover:text-foreground transition-all pb-1 border-b border-transparent hover:border-accent">Bekijk de Zalen</a>
          </div>
        </div>

        {loading && displayArtworks.length === 0 ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin opacity-30" /></div>
        ) : displayArtworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {displayArtworks.map(art => (
              <div key={art.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(art)}>
                <div className="relative aspect-square overflow-hidden rounded-sm bg-muted/30 transition-all duration-700 group-hover:shadow-2xl">
                  <img 
                    src={art.imageUrl} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.05]" 
                    style={{ 
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, 
                      filter: `brightness(${art.brightness || 1})` 
                    }} 
                    alt={art.displayTitle || art.title}
                  />
                  {art.featured && <Star className="absolute top-4 left-4 w-4 h-4 text-accent fill-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{art.displayTitle || art.title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center opacity-30 text-[10px] uppercase font-black tracking-widest">Voeg uw eigen werken toe via het beheerpaneel</div>
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
