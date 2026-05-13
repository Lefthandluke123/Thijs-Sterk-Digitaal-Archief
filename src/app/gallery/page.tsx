
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, ChevronLeft, ChevronRight, Info, RefreshCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>("Alle");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
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
      {/* Titelstrook */}
      <div className="w-full bg-secondary/10 border-b border-border/10 py-12 md:py-20">
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
            {/* Filter Paneel */}
            <div className="bg-background/80 backdrop-blur-md sticky top-14 z-30 border-b border-border/10 py-8 mb-12 space-y-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-6 overflow-x-auto no-scrollbar w-full md:w-auto">
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
                <button onClick={() => setShowHelp(!showHelp)} className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                  <Info className="w-3 h-3" /> Verbindingshulp
                </button>
              </div>

              {allAvailableTags.length > 0 && (
                <div className="flex flex-col gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/5">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Stel je eigen collectie samen</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-medium transition-all border",
                          activeTags.includes(tag) 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-background text-muted-foreground border-border hover:border-primary/40"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                    {activeTags.length > 0 && (
                      <button onClick={() => setActiveTags([])} className="text-[9px] uppercase font-bold text-accent ml-2 hover:underline">Wis filters</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showHelp && (
              <Alert className="mb-12 bg-secondary/20 border-none max-w-2xl mx-auto rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col gap-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Laden mislukt?</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm" className="rounded-full text-[9px] uppercase px-6" onClick={() => window.open('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/', '_blank')}>Verbinding Openen</Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-[9px] uppercase px-6" onClick={() => window.location.reload()}><RefreshCcw className="w-3 h-3 mr-2" /> Verversen</Button>
                  </div>
                </div>
              </Alert>
            )}

            {filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {filteredArtworks.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedArtwork(item)}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                        unoptimized={isExternalStorage(item.imageUrl)}
                      />
                      <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="text-white/60 w-6 h-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center">
                <p className="text-muted-foreground font-light text-xl italic">Geen werken gevonden met deze combinatie.</p>
                <Button variant="ghost" className="mt-6 uppercase text-[10px] tracking-widest" onClick={() => {setActiveSeries("Alle"); setActiveTags([]);}}>Wis alle filters</Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none outline-none">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/5">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-4 md:p-12"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
              />
            )}
            
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }}
                className="p-3 rounded-full bg-background/10 backdrop-blur-md hover:bg-background/40 transition-colors pointer-events-auto"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }}
                className="p-3 rounded-full bg-background/10 backdrop-blur-md hover:bg-background/40 transition-colors pointer-events-auto"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>

            <DialogClose className="absolute top-8 right-8 z-50 p-2 hover:bg-black/5 rounded-full transition-colors bg-background/10 backdrop-blur-sm">
              <X className="w-5 h-5 opacity-50" />
            </DialogClose>
          </div>

          <div className="w-full bg-background/90 backdrop-blur-md py-4 px-10 border-t border-border/10">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
              <div className="flex-1">
                <DialogTitle className="font-headline text-xl md:text-2xl font-light text-foreground leading-none mb-1">
                  {selectedArtwork?.title}
                </DialogTitle>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-80 flex gap-3 flex-wrap">
                  <span>{selectedArtwork?.series}</span>
                  <span className="opacity-30">|</span>
                  <span>{selectedArtwork?.medium}</span>
                  <span className="opacity-30">|</span>
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
              <div className="flex gap-4">
                <Button variant="outline" size="sm" className="rounded-full text-[9px] uppercase tracking-widest px-8 h-9 border-border/50 hover:bg-accent hover:text-accent-foreground hover:border-accent">
                  Interesse?
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedArtwork(null)} className="rounded-full text-[9px] uppercase tracking-widest px-8 h-9">
                  Sluiten
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
