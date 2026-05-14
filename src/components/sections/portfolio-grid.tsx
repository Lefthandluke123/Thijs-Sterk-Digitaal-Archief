
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
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <div className="relative flex-1 bg-black/5 flex items-center justify-center overflow-hidden group">
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
                  <span className="text-6xl md:text-9xl font-bold uppercase tracking-[0.5em] text-foreground">
                    Erven Thijs Sterk
                  </span>
                </div>
              </div>
            )}
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
    </section>
  );
}
