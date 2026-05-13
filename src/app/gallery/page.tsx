
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, ArrowRight } from 'lucide-react';

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<ImagePlaceholder | null>(null);
  const artworks = PlaceHolderImages.filter(img => img.id.startsWith('artwork-'));

  // Groepeer kunstwerken per serie
  const seriesGroups = artworks.reduce((acc: Record<string, ImagePlaceholder[]>, art) => {
    const seriesName = art.series || "Andere";
    if (!acc[seriesName]) acc[seriesName] = [];
    acc[seriesName].push(art);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto">
        <header className="mb-20 text-center max-w-3xl mx-auto">
          <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">Portfolio</span>
          <h1 className="font-headline text-5xl md:text-6xl font-light mb-6">Kunst <span className="italic">Galeries</span></h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ontdek de verschillende collecties van Elena Vance. Elk kunstwerk is een unieke verkenning van textuur, licht en natuurlijke fenomenen.
          </p>
        </header>

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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedArtwork(item)}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted transition-all duration-500 hover:shadow-2xl">
                      <Image
                        src={item.imageUrl}
                        alt={item.description}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        data-ai-hint={item.imageHint}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                        <Maximize2 className="text-white w-8 h-8" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-xl font-medium mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                      <div className="flex items-center justify-between text-muted-foreground text-sm">
                        <span>{item.medium}</span>
                        <span>{item.year}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

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
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl">
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-square md:aspect-auto h-full min-h-[500px]">
              {selectedArtwork && (
                <Image
                  src={selectedArtwork.imageUrl}
                  alt={selectedArtwork.description}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center">
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
                
                <div className="pt-8 border-t border-border flex flex-wrap gap-4">
                  <Button className="bg-primary hover:bg-primary/90 rounded-full px-8">Informeer over dit stuk</Button>
                  <Button variant="outline" className="rounded-full px-8">Specificaties</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
