
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
                src="/peter-bes.jpg" 
                alt="Peter Bes" 
                fill 
                className="object-cover" 
                data-ai-hint="portrait artist man"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/peterbes/800/1000';
                }}
              />
              <div className="absolute bottom-4 right-4 z-10 opacity-20 text-[8px] uppercase tracking-widest text-white font-bold bg-black/40 px-2 py-1 rounded-sm">
                &copy; Erven Thijs Sterk
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-8">
            <span className="text-accent font-medium tracking-[0.2em] uppercase text-[10px] block">Leerling & Kunstenaar</span>
            <h1 className="font-headline text-5xl md:text-6xl font-light leading-tight">Peter <span className="italic">Bes</span></h1>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                Peter Bes was een leerling van Thijs Sterk. Onder de vleugels van zijn meester ontwikkelde hij een eigen vormentaal, terwijl hij de lessen over licht en compositie altijd in zijn hart hield.
              </p>
              <p>
                De band tussen leermeester en leerling was meer dan louter technisch; het was een gedeelde zoektocht naar de ziel van het schilderen. Zijn herinneringen werpen een uniek licht op de didactische en menselijke kant van Thijs. Peter herinnert hem als een strenge maar rechtvaardige mentor die altijd zocht naar de essentie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
