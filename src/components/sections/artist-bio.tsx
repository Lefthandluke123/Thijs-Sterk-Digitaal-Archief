"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function ArtistBio() {
  const portrait = PlaceHolderImages.find(img => img.id === 'artist-portrait');

  return (
    <section className="py-24 bg-secondary/30 px-4" id="about">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-accent" />
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                {portrait && (
                  <Image
                    src={portrait.imageUrl}
                    alt="Portret van Thijs Sterk"
                    fill
                    className="object-cover"
                    data-ai-hint="artist portrait"
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2">
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">De Kunstenaar</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8 leading-tight">Thijs Sterk: Synthese van <span className="italic">Textuur & Licht</span></h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Thijs Sterk is een hedendaagse beeldend kunstenaar wiens werk zich richt op het snijvlak van wiskundige precisie en organische chaos. Zijn praktijk is een voortdurende dialoog met de natuurlijke omgeving, specifiek de microscopische details die vaak door het menselijk oog over het hoofd worden gezien.
              </p>
              <p>
                "Mijn filosofie is geworteld in de overtuiging dat de natuur de ultieme architect is. Ik probeer de visuele talen in rotsformaties, wolkenpatronen en schimmelgroei te ontcijferen en deze complexe systemen te vertalen naar doeken die uitnodigen tot meditatie."
              </p>
              <p>
                Met een achtergrond in zowel traditionele technieken als moderne experimenten, is het werk van Thijs tentoongesteld in diverse galeries. Zijn stukken bevinden zich in particuliere collecties, waar ze de brug slaan tussen technologische vooruitgang en oeroude verwondering.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12 pt-12 border-t border-border">
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">10+</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Exposities</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">150+</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Werken Verkocht</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">12</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Jaar Ervaring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
