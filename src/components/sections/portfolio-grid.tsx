
"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2 } from 'lucide-react';

export function PortfolioGrid() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'), limit(6));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  return (
    <section className="py-24 bg-background px-4" id="portfolio">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
          <div className="max-w-xl">
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-4">Geselecteerde Werken</h2>
            <p className="text-muted-foreground text-lg">Een collectie recente verkenningen van textuur, licht en de abstracte interpretatie van de natuurlijke wereld.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium tracking-widest uppercase">
            <button className="text-accent border-b border-accent pb-1">Alles</button>
            <button className="text-muted-foreground hover:text-foreground transition-colors pb-1">Series</button>
            <button className="text-muted-foreground hover:text-foreground transition-colors pb-1">Archief</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
          </div>
        ) : artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks.map((art) => (
              <div 
                key={art.id} 
                className="group relative cursor-pointer"
                onClick={() => setSelectedArtwork(art)}
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted transition-all duration-500 group-hover:shadow-xl">
                  <Image
                    src={art.imageUrl}
                    alt={art.description || art.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:brightness-90"
                    data-ai-hint={art.imageHint || "abstract painting"}
                  />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg text-foreground group-hover:text-primary transition-colors">{art.title}</h3>
                    <p className="text-muted-foreground text-sm">{art.series} &bull; {art.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl">
            <p className="text-muted-foreground">Nog geen kunstwerken toegevoegd. Ga naar de admin-pagina om te beginnen.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl">
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-square md:aspect-auto h-full min-h-[400px]">
              {selectedArtwork && (
                <Image
                  src={selectedArtwork.imageUrl}
                  alt={selectedArtwork.description || selectedArtwork.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <DialogHeader className="mb-6">
                <div className="text-accent font-medium tracking-widest uppercase text-xs mb-2">{selectedArtwork?.series}</div>
                <DialogTitle className="font-headline text-3xl md:text-4xl font-light mb-2">{selectedArtwork?.title}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <p className="text-foreground/80 leading-relaxed text-lg">
                  {selectedArtwork?.description}
                </p>
                
                <div className="pt-6 border-t border-border flex flex-wrap gap-4">
                  <Button className="bg-primary hover:bg-primary/90 rounded-full px-6">Informeer over dit stuk</Button>
                  <Button variant="outline" className="rounded-full px-6">Download Specificaties</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
