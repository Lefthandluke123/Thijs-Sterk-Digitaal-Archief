"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X } from 'lucide-react';

export function PortfolioGrid() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'), limit(12));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('gofile.me') || url.includes('quickconnect.to');
  };

  return (
    <section className="py-24 bg-background px-4" id="portfolio">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
          <div className="max-w-xl">
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-4">Geselecteerde Werken</h2>
            <p className="text-muted-foreground text-lg">Een collectie recente verkenningen van textuur en licht.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium tracking-widest uppercase">
            <a href="/gallery" className="text-muted-foreground hover:text-foreground transition-colors pb-1 border-b border-transparent hover:border-accent">Bekijk Alles</a>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          </div>
        ) : artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {artworks.map((art) => (
              <div 
                key={art.id} 
                className="group relative cursor-pointer"
                onClick={() => setSelectedArtwork(art)}
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted transition-all duration-500 group-hover:shadow-xl">
                  <Image
                    src={art.imageUrl}
                    alt={art.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:brightness-90"
                    unoptimized={isExternalStorage(art.imageUrl)}
                  />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 hidden md:block">
                  <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{art.title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl">
            <p className="text-muted-foreground">Nog geen kunstwerken toegevoegd.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl flex flex-col md:flex-row">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-4"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
              />
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-2 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors">
              <X className="w-6 h-6" />
            </DialogClose>
          </div>
          <div className="w-full md:w-96 p-8 md:p-12 flex flex-col justify-center bg-background border-l border-border overflow-y-auto">
            <DialogHeader className="mb-6">
              <div className="text-accent font-medium tracking-widest uppercase text-xs mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-3xl md:text-4xl font-light mb-2">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-foreground/80 leading-relaxed text-lg">{selectedArtwork?.description}</p>
              <div className="pt-6 border-t border-border flex flex-col gap-4">
                <Button className="bg-primary hover:bg-primary/90 rounded-full px-6 w-full">Informeer over dit stuk</Button>
                <Button variant="outline" className="rounded-full px-6 w-full" onClick={() => setSelectedArtwork(null)}>Sluiten</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}