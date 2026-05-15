
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Maximize2, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function GalleryContent() {
  const searchParams = useSearchParams();
  const initialSeriesFromUrl = searchParams.get('series');
  
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(initialSeriesFromUrl);
  const firestore = useFirestore();
  
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks || dbArtworks.length === 0) {
      return PlaceHolderImages.map(img => ({ ...img, createdAt: new Date() }));
    }
    return dbArtworks;
  }, [dbArtworks]);

  const seriesNames = useMemo(() => {
    const names = Array.from(new Set(artworks.map(art => art.series || "Andere")));
    return names.sort();
  }, [artworks]);

  useEffect(() => {
    const s = searchParams.get('series');
    if (s) {
      setActiveSeries(s);
    } else if (seriesNames.length > 0 && !activeSeries) {
      setActiveSeries(seriesNames[0]);
    }
  }, [searchParams, seriesNames, activeSeries]);

  const filteredArtworks = useMemo(() => {
    if (!activeSeries) return [];
    return artworks.filter(art => (art.series || "Andere") === activeSeries);
  }, [artworks, activeSeries]);

  const navigateGallery = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !filteredArtworks.length) return;
    const currentIndex = filteredArtworks.findIndex(art => art.id === selectedArtwork.id);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setSelectedArtwork(filteredArtworks[nextIndex]);
  }, [selectedArtwork, filteredArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedArtwork) return;
      if (e.key === 'ArrowRight') navigateGallery('next');
      if (e.key === 'ArrowLeft') navigateGallery('prev');
      if (e.key === 'Escape') setSelectedArtwork(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, navigateGallery]);

  return (
    <main className="min-h-screen bg-background pt-14">
      <div className="w-full bg-secondary/5 border-b border-border/10 py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <h1 className="font-headline text-lg md:text-xl font-light text-foreground text-center tracking-tighter">
            <span className="italic">{activeSeries || "Laden..."}</span>
          </h1>
          <p className="text-center text-accent mt-4 uppercase tracking-[0.5em] text-[8px] font-black opacity-80">
            Zaal &bull; {activeSeries || "..."}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 pb-32">
        {loading && dbArtworks?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-accent/40" /></div>
        ) : (
          <>
            <div className="bg-background/80 backdrop-blur-md sticky top-14 z-30 border-b border-border/10 py-6 mb-12">
              <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                <div className="flex gap-10 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 justify-center">
                  {seriesNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSeries(name)}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap pb-2 border-b-2",
                        activeSeries === name ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
              {filteredArtworks.map((item) => (
                <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-[1.05]"
                      style={{
                        clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                        filter: `brightness(${item.brightness || 1})`
                      }}
                    />
                    <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white w-6 h-6 drop-shadow-2xl" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Viewer (85/15)</DialogTitle>
          <div className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden bg-black/5 group">
            {selectedArtwork && (
              <img 
                src={selectedArtwork.imageUrl} 
                alt={selectedArtwork.title} 
                className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all duration-700"
                style={{
                  clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`,
                  filter: `brightness(${selectedArtwork.brightness || 1})`
                }}
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button onClick={() => navigateGallery('prev')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all shadow-xl">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={() => navigateGallery('next')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all shadow-xl">
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>

          <div className="h-[15vh] w-full bg-background/95 backdrop-blur-md py-4 px-12 border-t border-border/10 shadow-2xl flex flex-col items-center justify-center overflow-y-auto">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-1.5">
              <h2 className="font-headline text-[14px] md:text-[16px] font-light text-foreground tracking-tight leading-tight uppercase">
                {selectedArtwork?.title}
              </h2>
              <div className="text-[9px] md:text-[11px] uppercase font-black tracking-[0.3em] text-accent flex flex-wrap gap-x-8 gap-y-2 justify-center items-center opacity-90">
                <span>{selectedArtwork?.series}</span>
                <span className="hidden md:inline w-1 h-1 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.year}</span>
                <span className="hidden md:inline w-1 h-1 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.medium}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>}>
      <GalleryContent />
    </Suspense>
  );
}
