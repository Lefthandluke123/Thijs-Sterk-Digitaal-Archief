"use client";

import React from 'react';
import Image from 'next/image';

export default function PeterBesPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20">
              <Image 
                src="https://picsum.photos/seed/peterbes/800/1000" 
                alt="Peter Bes" 
                fill 
                className="object-cover" 
                data-ai-hint="portrait artist man"
              />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-8">
            <span className="text-accent font-medium tracking-[0.2em] uppercase text-[10px] block">Tijdgenoten & Kunstenaars</span>
            <h1 className="font-headline text-5xl md:text-6xl font-light leading-tight">Peter <span className="italic">Bes</span></h1>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                Peter Bes was een belangrijke tijdgenoot of vriend van Thijs Sterk. Hier kun je de artistieke verbondenheid tussen beiden beschrijven, of anekdotes plaatsen over hun gezamenlijke tijd in de kunstwereld.
              </p>
              <p>
                Net als de overige pagina's is deze sectie geoptimaliseerd voor leesbaarheid en beeldkracht.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
