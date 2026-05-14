"use client";

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
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
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="font-headline text-5xl md:text-6xl font-light mb-6 tracking-tighter">
              {featuredArtworks && featuredArtworks.length > 0 ? 'Meester Selectie' : 'Recente Werken'}
            </h2>
            <p className="text-muted-foreground text-xl font-light leading-relaxed">Een collectie geselecteerde verkenningen van textuur, licht en de essentie van het landschap.</p>
          </div>
          <div className="flex gap-10 text-[11px] font-black tracking-[0.3em] uppercase">
            <a href="/gallery" className="text-muted-foreground hover:text-foreground transition-all pb-1 border-b border-transparent hover:border-accent">Bekijk alle werken</a>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary/30" /></div>
        ) : displayArtworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
            {displayArtworks.map((art) => (
              <div key={art.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(art)}>
                <div className="relative aspect-square overflow-hidden rounded-sm bg-muted/30 transition-all duration-700 group-hover:shadow-2xl">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.05]"
                    style={{
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                      filter: `brightness(${art.brightness || 1})`
                    }}
                  />
                  <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {art.featured && <Star className="w-5 h-5 text-accent fill-accent drop-shadow-md" />}
                  </div>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 flex items-center justify-center">
                    <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="font-black text-[10px] text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-[0.3em] truncate">{art.title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border border-dashed border-border rounded-3xl opacity-40">
            <p className="text-lg font-light italic">Nog geen kunstwerken toegevoegd aan de collectie.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          {/* Top 67% view */}
          <div className="relative h-[67vh] w-full bg-black/5 flex items-center justify-center overflow-hidden">
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
            <DialogClose className="absolute top-10 right-10 z-50 p-4 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-8 h-8 opacity-40" />
            </DialogClose>
          </div>
          
          {/* Bottom 33% info */}
          <div className="h-[33vh] w-full bg-background/95 backdrop-blur-md py-16 px-12 border-t border-border/10 shadow-2xl flex flex-col items-center justify-center overflow-y-auto">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-10">
              <DialogTitle className="font-headline text-6xl md:text-8xl font-light text-foreground tracking-tighter uppercase leading-tight">
                {selectedArtwork?.title}
              </DialogTitle>
              <div className="text-[14px] md:text-[16px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-6 justify-center items-center opacity-80">
                <span>{selectedArtwork?.series}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.year}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.medium}</span>
              </div>
              <Button variant="outline" size="lg" className="rounded-full text-[12px] font-black uppercase tracking-[0.4em] px-20 h-16 border-primary/20 mt-8 hover:bg-accent hover:text-white hover:border-accent transition-all shadow-xl active:scale-95">
                Interesse in dit werk?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
