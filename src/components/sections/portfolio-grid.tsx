
"use client";

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, Star } from 'lucide-react';

export function PortfolioGrid() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We proberen eerst uitgelichte werken te tonen, anders de nieuwste
    return query(
      collection(firestore, 'artworks'), 
      where('featured', '==', true),
      limit(12)
    );
  }, [firestore]);

  const latestQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'artworks'),
      orderBy('createdAt', 'desc'),
      limit(12)
    );
  }, [firestore]);

  const { data: featuredArtworks, loading: loadingFeatured } = useCollection(artworksQuery);
  const { data: latestArtworks, loading: loadingLatest } = useCollection(latestQuery);

  const displayArtworks = useMemo(() => {
    if (featuredArtworks && featuredArtworks.length > 0) return featuredArtworks;
    return latestArtworks || [];
  }, [featuredArtworks, latestArtworks]);

  const loading = loadingFeatured && loadingLatest;

  return (
    <section className="py-24 bg-background px-4" id="portfolio">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
          <div className="max-w-xl">
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-4">
              {featuredArtworks && featuredArtworks.length > 0 ? 'Meester Selectie' : 'Recente Werken'}
            </h2>
            <p className="text-muted-foreground text-lg">Een collectie geselecteerde verkenningar van textuur en licht.</p>
          </div>
          <div className="flex gap-8 text-[10px] font-bold tracking-widest uppercase">
            <a href="/gallery" className="text-muted-foreground hover:text-foreground transition-colors pb-1 border-b border-transparent hover:border-accent">Alle Werken</a>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
          </div>
        ) : displayArtworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayArtworks.map((art) => (
              <div 
                key={art.id} 
                className="group relative cursor-pointer"
                onClick={() => setSelectedArtwork(art)}
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30 transition-all duration-500 group-hover:shadow-lg">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                      filter: `brightness(${art.brightness || 1})`
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Check+Link';
                    }}
                  />
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {art.featured && <Star className="w-4 h-4 text-accent fill-accent" />}
                  </div>
                  <div className="absolute bottom-2 right-2 z-10 pointer-events-none opacity-20 text-[6px] uppercase tracking-widest text-white font-bold bg-black/20 px-1 rounded-sm">
                    &copy; Erven Thijs Sterk
                  </div>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <Maximize2 className="text-white w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 hidden md:block">
                  <h3 className="font-medium text-[11px] text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-wider">{art.title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">Nog geen kunstwerken toegevoegd.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl flex flex-col md:flex-row shadow-2xl">
          <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden">
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+niet+gevonden';
                  }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none rotate-[-45deg]">
                  <span className="text-6xl md:text-8xl font-bold uppercase tracking-[0.5em] text-foreground">
                    Erven Thijs Sterk
                  </span>
                </div>
              </div>
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-1.5 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors">
              <X className="w-5 h-5" />
            </DialogClose>
          </div>
          <div className="w-full md:w-[320px] p-8 flex flex-col justify-center bg-background border-l border-border/50 overflow-y-auto">
            <DialogHeader className="mb-6">
              <div className="text-accent font-semibold tracking-widest uppercase text-[9px] mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-3xl font-light mb-2 leading-tight">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs border-l border-accent pl-3 italic">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-foreground/80 leading-relaxed text-sm">{selectedArtwork?.description}</p>
              <div className="pt-6 border-t border-border/50 flex flex-col gap-3">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-10 w-full text-xs font-semibold shadow-md">Informeer</Button>
                <Button variant="ghost" size="sm" className="text-[10px] uppercase tracking-widest" onClick={() => setSelectedArtwork(null)}>Sluiten</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
