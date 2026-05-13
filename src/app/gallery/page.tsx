"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, ArrowRight, Loader2, X } from 'lucide-react';

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  // Groepeer kunstwerken per serie
  const seriesGroups = useMemo(() => {
    if (!artworks) return {};
    return artworks.reduce((acc: Record<string, any[]>, art) => {
      const seriesName = art.series || "Andere";
      if (!acc[seriesName]) acc[seriesName] = [];
      acc[seriesName].push(art);
      return acc;
    }, {});
  }, [artworks]);

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto">
        <header className="mb-20 text-center max-w-3xl mx-auto">
          <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">Portfolio</span>
          <h1 className="font-headline text-5xl md:text-6xl font-light mb-6">Kunst <span className="italic">Galeries</span></h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ontdek de verschillende collecties van Thijs Sterk. Elk kunstwerk is een unieke verkenning van textuur, licht en natuurlijke fenomenen.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          </div>
        ) : (
          <div className="space-y-32">
            {Object.entries(seriesGroups).map(([seriesName, items]) => (
              <section key={seriesName} className="relative">
                <div className="flex items-center justify-between mb-10 border-b border-border pb-4">
                  <div>
                    <h2 className="text-3xl font-light font-headline">{seriesName}</h2>
                    <p className="text-muted-foreground text-sm mt-1 uppercase tracking-tighter">Collectie Series</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-primary text-sm font-medium">
                    <span>{items.length} Kunstwerken</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative cursor-pointer"
                      onClick={() => setSelectedArtwork(item)}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted transition-all duration-500 hover:shadow-lg">
                        <Image
                          src={item.imageUrl}
                          alt={item.description || item.title}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          data-ai-hint={item.imageHint || "abstract artwork"}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col items-center justify-center p-4 text-center">
                          <Maximize2 className="text-white w-6 h-6 mb-2" />
                          <p className="text-white text-xs font-medium uppercase tracking-widest hidden md:block">{item.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="mt-32 p-12 rounded-[3rem] bg-secondary/20 border border-border text-center">
          <h2 className="font-headline text-3xl font-light mb-6">Geïnteresseerd in een specifiek stuk?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Veel van deze werken zijn beschikbaar als limited edition prints of originele doeken. Neem contact op voor prijsinformatie en beschikbaarheid.
          </p>
          <Button size="lg" className="rounded-full px-8" asChild>
            <a href="/#contact">Neem Contact Op <ArrowRight className="ml-2 w-4 h-4" /></a>
          </Button>
        </section>
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl flex flex-col md:flex-row">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.description || selectedArtwork.title}
                fill
                className="object-contain p-4"
              />
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-2 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors">
              <X className="w-6 h-6" />
            </DialogClose>
          </div>
          <div className="w-full md:w-96 p-8 md:p-12 flex flex-col justify-center bg-background border-l border-border overflow-y-auto">
            <DialogHeader className="mb-8">
              <div className="text-accent font-medium tracking-widest uppercase text-xs mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-4xl font-light mb-2">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-8">
              <p className="text-foreground/80 leading-relaxed text-lg">
                {selectedArtwork?.description}
              </p>
              
              <div className="pt-8 border-t border-border flex flex-col gap-4">
                <Button className="bg-primary hover:bg-primary/90 rounded-full px-8 w-full">Informeer over dit stuk</Button>
                <Button variant="outline" className="rounded-full px-8 w-full" onClick={() => setSelectedArtwork(null)}>Terug naar Galerie</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
