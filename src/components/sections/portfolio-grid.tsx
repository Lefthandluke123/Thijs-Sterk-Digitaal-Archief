"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Maximize2, Loader2, X, Star, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Exclusief database-artikelen, deduplicatie op imageUrl
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
                  <img src={art.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.05]" style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }} />
                  {art.featured && <Star className="absolute top-4 left-4 w-4 h-4 text-accent fill-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white w-6 h-6" /></div>
                </div>
                <div className="mt-4 text-center"><h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{art.title}</h3></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center opacity-30 text-[10px] uppercase font-black tracking-widest">Voeg uw eigen werken toe via het beheerpaneel</div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Viewer (75/25)</DialogTitle>
          <div className="relative h-[75vh] w-full bg-black/5 flex items-center justify-center overflow-hidden group">
            {selectedArtwork && (
              <img src={selectedArtwork.imageUrl} className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all" style={{ clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`, filter: `brightness(${selectedArtwork.brightness || 1})` }} />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <button onClick={() => navigateDisplay('prev')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40"><ChevronLeft className="w-8 h-8" /></button>
              <button onClick={() => navigateDisplay('next')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40"><ChevronRight className="w-8 h-8" /></button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20"><X className="w-6 h-6 opacity-40" /></DialogClose>
          </div>
          <div className="h-[25vh] w-full bg-background/95 backdrop-blur-md py-8 px-12 border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center">
            <h2 className="text-[10px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 mb-4">{selectedArtwork?.title}</h2>
            <div className="text-[12px] md:text-[14px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-4 justify-center items-center opacity-100">
              <span className="bg-accent/10 px-6 py-1.5 rounded-sm">Zaal: {selectedArtwork?.series}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.year}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.medium}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}