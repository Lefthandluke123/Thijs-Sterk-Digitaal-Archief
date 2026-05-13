
"use client";

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowDownRight } from 'lucide-react';

export function Hero() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-image');

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto z-10 text-center">
        <div className="inline-block animate-fade-in-up">
          <span className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4 block">
            Retrospectief &bull; Thijs Sterk (1913)
          </span>
        </div>
        
        <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-foreground mb-10 max-w-6xl mx-auto leading-tight animate-fade-in-up delay-100">
          Thijs Sterk: Schilder van <span className="italic">Licht, Ruimte en Water</span>
        </h1>
        
        <p className="text-muted-foreground text-lg md:text-2xl max-w-4xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200 font-light">
          Thijs Sterk (1913) wordt vaak herinnerd als de schilder die de natuur niet alleen afbeeldde, maar haar ook liet voelen. Zijn werk vormt een fascinerende reis van realistische landschappen naar bijna abstracte 'landschappen van de geest'.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
          <Button size="lg" className="rounded-full px-12 bg-accent hover:bg-accent/90 text-accent-foreground font-medium h-14 text-lg" asChild>
            <a href="/gallery">Bekijk de Galerie</a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-12 border-primary text-primary hover:bg-primary/5 font-medium h-14 text-lg group" asChild>
            <a href="#about">
              De Kunstenaar
              <ArrowDownRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-20 z-10 px-4 animate-fade-in-up delay-500">
        <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-2xl">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt="Representatief werk van Thijs Sterk"
              fill
              className="object-cover"
              priority
              data-ai-hint="atmospheric landscape painting"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </div>
    </section>
  );
}
