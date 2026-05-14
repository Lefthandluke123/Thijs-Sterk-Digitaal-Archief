
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, ChevronLeft, ChevronRight, LayoutGrid, Palette, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function GalleryContent() {
  const searchParams = useSearchParams();
  const initialSeries = searchParams.get('series') || "Alle";
  
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>(initialSeries);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const firestore = useFirestore();
  
  useEffect(() => {
    setActiveSeries(searchParams.get('series') || "Alle");
  }, [searchParams]);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, navigateGallery]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const artworksBySeries = useMemo(() => {
    if (!artworks || activeSeries !== "Alle") return null;
    const grouped: { [key: string]: any[] } = {};
    artworks.forEach(art => {
      const s = art.series || "Andere";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(art);
    });
    return grouped;
  }, [artworks, activeSeries]);

  return (
    <main className="min-h-screen bg-background pt-14">
      <div className="w-full bg-secondary/5 border-b border-border/10 py-12 md:py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <h1 className="font-headline text-5xl md:text-7xl font-light text-foreground text-center tracking-tight">
            {activeSeries === "Alle" ? "Galerie" : <span className="italic">{activeSeries}</span>}
          </h1>
          <p className="text-center text-accent mt-4 uppercase tracking-[0.3em] text-[10px] font-bold">
            {activeSeries === "Alle" ? "Het Volledige Oeuvre" : `Collectie: ${activeSeries}`}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-accent/40" />
          </div>
        ) : (
          <>
            <div className="bg-background/80 backdrop-blur-md sticky top-14 z-30 border-b border-border/10 py-6 mb-12">
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
              </div>

              {activeSeries !== "Alle" && allAvailableTags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border/5 mt-4">
                  {allAvailableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border",
                        activeTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-accent"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeSeries === "Alle" && artworksBySeries ? (
              <div className="space-y-24">
                {Object.entries(artworksBySeries).map(([series, items]) => (
                  <section key={series} className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border/10 pb-4">
                      <h2 className="font-headline text-3xl font-light italic">{series}</h2>
                      <button 
                        onClick={() => setActiveSeries(series)}
                        className="text-[10px] uppercase font-bold tracking-widest text-accent flex items-center gap-2 hover:translate-x-1 transition-transform"
                      >
                        Open deze zaal <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {items.slice(0, 6).map((item) => (
                        <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                              style={{
                                clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                                filter: `brightness(${item.brightness || 1})`
                              }}
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+Fout'; }}
                            />
                          </div>
                          <div className="mt-2 text-center opacity-60 group-hover:opacity-100 transition-opacity">
                            <h3 className="text-[8px] font-bold uppercase tracking-widest truncate">{item.title}</h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {filteredArtworks.map((item) => (
                  <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]"
                        style={{
                          clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                          filter: `brightness(${item.brightness || 1})`
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+Fout'; }}
                      />
                      <div className="absolute bottom-2 right-2 z-10 pointer-events-none opacity-20 text-[6px] uppercase tracking-widest text-white font-bold bg-black/20 px-1 rounded-sm">
                        &copy; Erven Thijs Sterk
                      </div>
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
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/5">
            {selectedArtwork && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={selectedArtwork.imageUrl} 
                  alt={selectedArtwork.title} 
                  className="max-w-full max-h-full object-contain p-4 md:p-12"
                  style={{
                    clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`,
                    filter: `brightness(${selectedArtwork.brightness || 1})`
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+Fout'; }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none rotate-[-45deg]">
                  <span className="text-6xl md:text-9xl font-bold uppercase tracking-[0.5em] text-foreground">
                    Erven Thijs Sterk
                  </span>
                </div>
              </div>
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

          <div className="w-full bg-background/95 backdrop-blur-md py-8 md:py-12 px-8 border-t border-border/10">
            <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
              <div className="space-y-3">
                <DialogTitle className="font-headline text-3xl md:text-5xl font-light text-foreground tracking-tight">
                  {selectedArtwork?.title}
                </DialogTitle>
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-accent font-bold flex flex-wrap gap-x-6 gap-y-2 justify-center items-center opacity-80">
                  <span>{selectedArtwork?.series}</span>
                  <span className="hidden md:inline w-1 h-1 rounded-full bg-accent/30" />
                  <span>{selectedArtwork?.year}</span>
                  <span className="hidden md:inline w-1 h-1 rounded-full bg-accent/30" />
                  <span>{selectedArtwork?.medium}</span>
                </div>
              </div>
              <Button variant="outline" size="lg" className="rounded-full text-[10px] uppercase tracking-[0.2em] px-12 h-12 border-primary/20 hover:bg-primary/5 hover:border-primary transition-all">
                Interesse in dit werk?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <GalleryContent />
    </Suspense>
  );
}
