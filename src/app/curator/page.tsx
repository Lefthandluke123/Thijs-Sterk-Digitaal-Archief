
"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';

export default function CuratorPage() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

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
    if (activeTags.length === 0) return []; // Start leeg voor focus op keuze
    
    return artworks.filter(art => {
      return activeTags.every(tag => art.tags?.includes(tag));
    });
  }, [artworks, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('gofile.me') || url.includes('192-168');
  };

  return (
    <main className="min-h-screen bg-background pt-14">
      {/* Curator Header */}
      <div className="w-full bg-accent/5 border-b border-border/10 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-4 block">Gecureerd Portfolio</span>
          <h1 className="font-headline text-5xl md:text-7xl font-light text-foreground tracking-tight mb-8">
            Stel <span className="italic">Uw Collectie</span> samen
          </h1>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Ontdek het werk van Thijs Sterk door de thema's te selecteren die u het meest raken. Creëer een galerie die uw persoonlijke visie weerspiegelt.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-12 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent/40" />
          </div>
        ) : (
          <div className="space-y-16">
            {/* Tag Cloud Selector */}
            <div className="flex flex-col items-center space-y-8">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                <Sparkles className="w-3 h-3 text-accent" /> Kies uw thema's
              </h2>
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-4xl">
                {allAvailableTags.length > 0 ? allAvailableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all border shadow-sm",
                      activeTags.includes(tag) 
                        ? "bg-primary text-primary-foreground border-primary scale-105 shadow-md" 
                        : "bg-background text-muted-foreground border-border hover:border-accent hover:text-accent"
                    )}
                  >
                    {tag}
                  </button>
                )) : (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground italic opacity-50">Nog geen thema's beschikbaar...</p>
                )}
              </div>
              {activeTags.length > 0 && (
                <button 
                  onClick={() => setActiveTags([])} 
                  className="flex items-center gap-2 text-[10px] uppercase font-bold text-accent/60 hover:text-accent transition-colors"
                >
                  <X className="w-3 h-3" /> Wis selectie
                </button>
              )}
            </div>

            {/* Results Grid */}
            <div className="pt-8 border-t border-border/10">
              {activeTags.length === 0 ? (
                <div className="text-center py-20 space-y-4 opacity-40">
                  <p className="text-sm font-light italic">Maak hierboven een keuze om uw persoonlijke galerie te vullen.</p>
                </div>
              ) : filteredArtworks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 animate-fade-in-up">
                  {filteredArtworks.map((item) => (
                    <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20">
                        <Image src={item.imageUrl} alt={item.title} fill className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.03]" unoptimized={isExternalStorage(item.imageUrl)} />
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
              ) : (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground font-light text-lg italic">Geen werken gevonden met deze specifieke combinatie.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/5">
            {selectedArtwork && (
              <Image src={selectedArtwork.imageUrl} alt={selectedArtwork.title} fill className="object-contain p-4 md:p-12" unoptimized={isExternalStorage(selectedArtwork.imageUrl)} />
            )}
            <DialogClose className="absolute top-8 right-8 z-50 p-2 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-colors">
              <X className="w-5 h-5 opacity-50" />
            </DialogClose>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md py-1.5 px-8 border-t border-border/10 flex items-center justify-center min-h-[48px]">
            <div className="max-w-6xl w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 overflow-hidden">
                <DialogTitle className="font-headline text-sm font-light text-foreground leading-none whitespace-nowrap">
                  {selectedArtwork?.title}
                </DialogTitle>
                <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground opacity-70 flex gap-3 items-center overflow-hidden whitespace-nowrap">
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
              <Button variant="outline" size="sm" className="rounded-full text-[8px] uppercase tracking-widest px-4 h-7 border-primary/20 hover:bg-primary/5 shrink-0">
                Interesse?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
