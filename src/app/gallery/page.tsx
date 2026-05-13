
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>("Alle");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const firestore = useFirestore();
  
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('gofile.me') || url.includes('192-168');
  };

  const seriesNames = useMemo(() => {
    if (!artworks) return ["Alle"];
    const names = Array.from(new Set(artworks.map(art => art.series || "Andere")));
    return ["Alle", ...names.sort()];
  }, [artworks]);

  const allAvailableTags = useMemo(() => {
    if (!artworks) return [];
    const tags = new Set<string>();
    artworks.forEach(art => {
      art.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    
    return artworks.filter(art => {
      const matchesSeries = activeSeries === "Alle" || (art.series || "Andere") === activeSeries;
      const matchesTags = activeTags.length === 0 || activeTags.every(tag => art.tags?.includes(tag));
      return matchesSeries && matchesTags;
    });
  }, [artworks, activeSeries, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const navigateGallery = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !filteredArtworks.length) return;
    
    const currentIndex = filteredArtworks.findIndex(art => art.id === selectedArtwork.id);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % filteredArtworks.length;
    } else {
      nextIndex = (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    }
    
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
      <div className="w-full bg-secondary/5 border-b border-border/10 py-12 md:py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <h1 className="font-headline text-5xl md:text-7xl font-light text-foreground text-center tracking-tight">Galerie</h1>
          <p className="text-center text-muted-foreground mt-4 uppercase tracking-[0.3em] text-[10px] font-medium">Beeldend Kunstenaar Portfolio</p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-accent/40" />
          </div>
        ) : (
          <>
            <div className="bg-background/80 backdrop-blur-md sticky top-14 z-30 border-b border-border/10 py-6 mb-12 space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-6 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
                  {seriesNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSeries(name)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap pb-1 border-b-2",
                        activeSeries === name ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  {activeTags.length > 0 && (
                    <button onClick={() => setActiveTags([])} className="text-[9px] uppercase font-bold text-accent">Wis filters</button>
                  )}
                </div>
              </div>

              {allAvailableTags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/5">
                  <div className="flex items-center gap-2 text-primary/40 mr-2">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  {allAvailableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border",
                        activeTags.includes(tag) 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {filteredArtworks.map((item) => (
                  <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20">
                      <Image 
                        src={item.imageUrl} 
                        alt={item.title} 
                        fill 
                        className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]" 
                        unoptimized={isExternalStorage(item.imageUrl)} 
                        style={{
                          clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                          filter: `brightness(${item.brightness || 1})`
                        }}
                      />
                      <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="text-white/60 w-6 h-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center">
                <p className="text-muted-foreground font-light text-xl italic">Geen werken gevonden voor deze selectie.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/5">
            {selectedArtwork && (
              <Image 
                src={selectedArtwork.imageUrl} 
                alt={selectedArtwork.title} 
                fill 
                className="object-contain p-4 md:p-12" 
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)} 
                style={{
                  clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`,
                  filter: `brightness(${selectedArtwork.brightness || 1})`
                }}
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }} className="p-3 rounded-full bg-background/10 backdrop-blur-md pointer-events-auto hover:bg-background/20 transition-colors">
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }} className="p-3 rounded-full bg-background/10 backdrop-blur-md pointer-events-auto hover:bg-background/20 transition-colors">
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-2 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-colors">
              <X className="w-5 h-5 opacity-50" />
            </DialogClose>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md py-1.5 px-8 border-t border-border/10 flex items-center justify-center min-h-[48px]">
            <div className="max-w-6xl w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 overflow-hidden">
                <DialogTitle className="font-headline text-sm font-light text-foreground leading-none whitespace-nowrap">
                  {selectedArtwork?.title}
                </DialogTitle>
                <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground opacity-70 flex gap-3 items-center overflow-hidden whitespace-nowrap">
                  <span className="hidden sm:inline">{selectedArtwork?.series}</span>
                  <span className="hidden sm:inline opacity-30">|</span>
                  <span>{selectedArtwork?.year}</span>
                  {selectedArtwork?.tags?.length > 0 && (
                    <>
                      <span className="opacity-30">|</span>
                      <div className="flex gap-2">
                        {selectedArtwork.tags.map((t: string) => (
                          <span key={t} className="text-primary font-bold">#{t}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-full text-[8px] uppercase tracking-widest px-4 h-7 border-primary/20 hover:bg-primary/5 shrink-0">
                Interesse?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
