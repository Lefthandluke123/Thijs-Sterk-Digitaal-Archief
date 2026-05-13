
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
              <div className="absolute -bottom-6 -right-6 w-24 h-24 border-b-2 border-right-2 border-accent opacity-0" /> {/* Just decoration */}
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                {portrait && (
                  <Image
                    src={portrait.imageUrl}
                    alt={portrait.description}
                    fill
                    className="object-cover"
                    data-ai-hint={portrait.imageHint}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2">
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">The Artist</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8 leading-tight">Elena Vance: Synthesizing <span className="italic">Texture & Light</span></h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Based in the Pacific Northwest, Elena Vance is a contemporary visual artist whose work focuses on the intersection of mathematical precision and organic chaos. Her practice is a continuous dialogue with the natural environment, specifically the microscopic details often overlooked by the naked eye.
              </p>
              <p>
                "My philosophy is rooted in the belief that nature is the ultimate architect. I seek to decode the visual languages found in rock formations, cloud patterns, and fungal growth, translating these complex systems into digital canvases that invite meditation."
              </p>
              <p>
                With over a decade of experience in traditional oil painting and digital synthesis, Vance's work has been featured in solo exhibitions in Seattle, Vancouver, and Tokyo. Her pieces are held in private collections worldwide, bridging the gap between technological advancement and primordial wonder.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12 pt-12 border-t border-border">
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">15+</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Solo Exhibitions</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">200+</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Works Sold</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">12</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Years Experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
