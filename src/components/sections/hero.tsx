
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
            Elena Vance &bull; Visual Artist
          </span>
        </div>
        
        <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-foreground mb-6 max-w-5xl mx-auto leading-tight animate-fade-in-up delay-100">
          Capturing the Unseen Essence of <span className="italic">Nature</span>
        </h1>
        
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
          Exploring the intersections of abstract geometry and organic landscapes through contemporary digital painting and textural experimentation.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
          <Button size="lg" className="rounded-full px-8 bg-accent hover:bg-accent/90 text-accent-foreground font-medium h-12">
            View Portfolio
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8 border-primary text-primary hover:bg-primary/5 font-medium h-12 group">
            About Me
            <ArrowDownRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-20 z-10 px-4 animate-fade-in-up delay-500">
        <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-2xl">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </div>
    </section>
  );
}
