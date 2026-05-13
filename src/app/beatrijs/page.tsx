"use client";

import React from 'react';
import Image from 'next/image';

export default function BeatrijsSterkPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20">
              <Image 
                src="https://picsum.photos/seed/beatrijs/800/1000" 
                alt="Beatrijs Sterk" 
                fill 
                className="object-cover" 
                data-ai-hint="portrait woman"
              />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-8">
            <span className="text-accent font-medium tracking-[0.2em] uppercase text-[10px] block">Familie & Nalatenschap</span>
            <h1 className="font-headline text-5xl md:text-6xl font-light leading-tight">Beatrijs <span className="italic">Sterk</span></h1>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                Hier komt de tekst over Beatrijs Sterk. Wat was haar rol, haar herinnering of haar visie op de kunst van Thijs? 
              </p>
              <p>
                De website is nu klaar om deze verhalen te huisvesten. De serene achtergrondkleur en de klassieke typografie sluiten aan bij de tijdloze sfeer van het oeuvre.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
