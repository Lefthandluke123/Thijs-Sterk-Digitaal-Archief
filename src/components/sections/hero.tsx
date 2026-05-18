
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, Maximize2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';

export function Hero() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  const featuredQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), where('featured', '==', true), limit(1));
  }, [firestore]);

  const { data: featured } = useCollection(featuredQuery);
  const artwork = featured?.[0];
  const heroImage = artwork?.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  return (
    <section className="relative min-h-[50vh] flex flex-col items-center justify-center pt-24 px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto z-10 text-center">
        <div className="inline-block animate-fade-in-up">
          <span className="text-primary font-medium tracking-[0.2em] uppercase text-[8px] mb-4 block opacity-60">
            Retrospectief &bull; Thijs Sterk (1913-1982)
          </span>
        </div>
        
        <h1 className="font-headline text-lg md:text-xl font-light tracking-tight text-foreground mb-6 max-w-2xl mx-auto leading-tight animate-fade-in-up delay-100">
          Thijs Sterk: Schilder van <span className="italic">Licht, Ruimte en Water</span>
        </h1>
        
        <p className="text-muted-foreground text-[9px] md:text-[10px] max-w-lg mx-auto mb-8 leading-relaxed animate-fade-in-up delay-200 font-light opacity-60 uppercase tracking-[0.1em]">
          Verken de atmosfeer van de Lage Landen. Van de vroege realistische landschappen tot de verstilde vergezichten van de geest.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
          <Button size="lg" className="rounded-full px-10 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase tracking-widest text-[9px] h-9" asChild>
            <a href="/gallery">Bekijk de Zalen</a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-10 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-widest text-[9px] h-9 group" asChild>
            <a href="#about">
              De Kunstenaar
              <ArrowDownRight className="ml-2 w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-12 z-10 px-4 animate-fade-in-up delay-500 max-w-4xl">
        <div 
          className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-xl border border-border/10 cursor-pointer group"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht", series: "Hoofdcollectie", year: "1954", medium: "Olieverf op doek" })}
        >
          <Image
            src={heroImage}
            alt={artwork?.title || "Representatief werk van Thijs Sterk"}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
            priority
            data-ai-hint="atmospheric landscape painting"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}
