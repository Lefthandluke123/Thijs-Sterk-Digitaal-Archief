"use client";

import React from 'react';
import Image from 'next/image';

export default function HannekeSterkPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20">
              <Image 
                src="/hanneke.jpg" 
                alt="Hanneke Sterk" 
                fill 
                className="object-cover" 
                data-ai-hint="portrait woman"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/hanneke/800/1000';
                }}
              />
              <div className="absolute bottom-4 right-4 z-10 opacity-20 text-[8px] uppercase tracking-widest text-white font-bold bg-black/40 px-2 py-1 rounded-sm">
                &copy; Erven Thijs Sterk
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-8">
            <span className="text-accent font-medium tracking-[0.2em] uppercase text-[10px] block">Dochter & Nalatenschap</span>
            <h1 className="font-headline text-5xl md:text-6xl font-light leading-tight">Hanneke <span className="italic">Sterk</span></h1>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                Als dochter van Thijs Sterk groeide Hanneke op te midden van de geur van olieverf en het strijklicht van het atelier. Haar perspectief op het werk van haar vader is diepgeworteld in persoonlijke herinneringen aan zijn scheppingsproces.
              </p>
              <p>
                Samen met haar zus Beatrijs draagt zij zorg voor de artistieke nalatenschap, waarbij het ontsluiten van zijn oeuvre voor een nieuwe generatie centraal staat. "Mijn vader schilderde niet wat hij zag, maar wat hij voelde bij het landschap," aldus Hanneke.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
