
"use client";

import React from 'react';
import Link from 'next/link';
import { Maximize2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomClientProps {
  artworks: any[];
}

/**
 * @fileOverview Client Component voor de weergave van een zaal-collectie.
 * Nuclear layout reset: Verwijdert alle absolute positionering van de hoofdafbeelding om top-left bugs te elimineren.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  return (
    <div className="w-full flex flex-col items-center gap-32 md:gap-64 px-4">
      {artworks.map((item, index) => (
        <Link 
          key={item.id} 
          href={`/art/${item.slug}`}
          className="w-full flex flex-col items-center justify-center min-h-[60vh] md:min-h-[80vh] group"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <article className="w-full flex flex-col items-center justify-center space-y-12">
            {/* Museum-style Frame Container - Nuclear Centering */}
            <div className="w-full max-w-6xl aspect-[4/3] md:aspect-[16/10] bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-4 border-white/5 flex items-center justify-center p-4 md:p-12 overflow-hidden rounded-[2rem] md:rounded-[4rem] border-red-500/30 transition-all duration-1000 group-hover:scale-[1.01]">
              
              {/* Centered Image - Forced static/relative to prevent top-left jump */}
              <img 
                src={item.image || item.imageUrl} 
                alt={item.title} 
                className="relative block max-w-full max-h-full object-contain mx-auto border-2 border-red-500/10 transition-all duration-1000 ease-out group-hover:scale-105"
                style={{ 
                  filter: `brightness(${item.brightness || 1})`,
                  position: 'relative' 
                }}
              />

              {/* Interaction Overlay - Only this part is absolute */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-700 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="p-6 md:p-10 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-500">
                  <Maximize2 className="text-white w-8 h-8 md:w-12 md:h-12" />
                </div>
              </div>
            </div>
            
            {/* Artwork Metadata */}
            <div className="text-center space-y-6 max-w-2xl px-6">
              <div className="space-y-3">
                <h3 className="font-headline text-3xl md:text-6xl italic text-foreground leading-tight tracking-tight">
                  {item.title}
                </h3>
                <div className="flex items-center justify-center gap-4 text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-accent">
                   <span className="opacity-60">{item.year || 'Interactief'}</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-accent/20" />
                   <span className="opacity-60">{item.medium || 'Olieverf op doek'}</span>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-black uppercase tracking-[0.3em] text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-500 shadow-sm">
                <span>Betreed Deep Zoom</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
