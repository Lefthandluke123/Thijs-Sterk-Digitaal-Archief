
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, RefreshCcw, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>("Alle");
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

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    if (activeSeries === "Alle") return artworks;
    return artworks.filter(art => (art.series || "Andere") === activeSeries);
  }, [artworks, activeSeries]);

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
    <main className="min-h-screen bg-background pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-7xl">
        <header className="mb-16 text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-light mb-4">Galerie</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">Overzicht van de collectie</p>
        </header>

        {showHelp && (
          <Alert className="mb-12 bg-secondary/20 border-border/40 max-w-2xl mx-auto rounded-3xl p-6 border-none shadow-sm">
            <div className="flex flex-col gap-4 text-center">
              <h4 className="text-sm font-headline italic">Laden van afbeeldingen mislukt?</h4>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Je browser blokkeert soms de directe verbinding met de lokale opslag. Open de verbinding en ververs daarna deze pagina.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  size="sm"
                  className="rounded-full text-[9px] uppercase tracking-widest px-6"
                  onClick={() => window.open('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/', '_blank')}
                >1. Verbinding Openen</Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[9px] uppercase tracking-widest px-6"
                  onClick={() => window.location.reload()}
                ><RefreshCcw className="w-3 h-3 mr-2" /> 2. Verversen</Button>
              </div>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-accent/40" />
            <p className="text-muted-foreground text-[9px] uppercase tracking-[0.2em] opacity-40">Laden...</p>
          </div>
        ) : (
          <>
            <div className="sticky top-20 z-30 bg-background/40 backdrop-blur-md py-6 mb-12 border-y border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-6 overflow-x-auto no-scrollbar">
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
              <button onClick={() => setShowHelp(!showHelp)} className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-accent transition-colors">
                <Info className="w-3 h-3" /> Hulp bij laden
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                      className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.03] opacity-90 group-hover:opacity-100"
                      unoptimized={isExternalStorage(item.imageUrl)}
                    />
                    <div className="absolute inset-0 bg-background/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white/40 w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col md:flex-row bg-background/98 backdrop-blur-2xl border-none">
          <div className="relative flex-1 bg-black/5 flex items-center justify-center overflow-hidden group">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-6 md:p-16"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
              />
            )}
            
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }}
                className="p-3 rounded-full bg-background/20 backdrop-blur-md hover:bg-background/40 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }}
                className="p-3 rounded-full bg-background/20 backdrop-blur-md hover:bg-background/40 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>

            <DialogClose className="absolute top-6 left-6 z-10 p-2 hover:bg-black/5 rounded-full transition-colors">
              <X className="w-4 h-4 opacity-40" />
            </DialogClose>
          </div>
          <div className="w-full md:w-[320px] p-10 flex flex-col justify-center bg-background border-l border-border/30">
            <div className="mb-8">
              <div className="text-accent font-bold uppercase text-[9px] tracking-widest mb-3 opacity-60">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-3xl font-light mb-3">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-[10px] uppercase tracking-widest text-muted-foreground border-l-2 border-accent/20 pl-4 py-1 italic">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </div>
            <div className="space-y-8">
              <p className="text-muted-foreground leading-relaxed text-[13px] font-light">{selectedArtwork?.description}</p>
              <div className="pt-8 border-t border-border/20 flex flex-col gap-3">
                <Button variant="outline" className="rounded-full w-full text-[10px] uppercase tracking-widest h-11 border-muted">Interesse?</Button>
                <div className="text-[8px] text-muted-foreground/40 break-all bg-muted/5 p-2 rounded italic">
                  Ref: {selectedArtwork?.imageUrl}
                </div>
              </div>
            </div>
            <div className="mt-auto pt-6 flex justify-between text-[9px] uppercase tracking-widest text-muted-foreground/40">
              <span>Pijltjes om te bladeren</span>
              <span>{filteredArtworks.findIndex(a => a.id === selectedArtwork?.id) + 1} / {filteredArtworks.length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
