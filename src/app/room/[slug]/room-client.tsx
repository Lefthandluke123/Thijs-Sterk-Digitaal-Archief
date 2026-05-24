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
 * Geoptimaliseerd voor een cinematic, full-screen museum-presentatie met strikte centering.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-32 md:gap-64 px-4">
      {artworks.map((item, index) => (
        <Link 
          key={item.id} 
          href={`/art/${item.slug}`}
          className="w-full max-w-6xl group block animate-in fade-in slide-in-from-bottom-12 duration-1000"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <article className="flex flex-col items-center justify-center space-y-12">
            {/* Museum-style Frame Container */}
            <div className="relative w-full aspect-[4/3] md:aspect-[16/10] overflow-hidden rounded-[2rem] md:rounded-[4rem] bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-4 border-white/5 transition-all duration-1000 group-hover:scale-[1.01] group-hover:shadow-[0_80px_150px_-30px_rgba(0,0,0,0.7)]">
              
              {/* Centered Image Engine - Removed padding to prevent top-left bias */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={item.image || item.imageUrl} 
                  alt={item.title} 
                  className="max-w-[90%] max-h-[90%] object-contain transition-all duration-1000 ease-out group-hover:scale-105"
                  style={{ filter: `brightness(${item.brightness || 1})` }}
                />
              </div>

              {/* Interaction Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="p-6 md:p-10 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-500">
                  <Maximize2 className="text-white w-8 h-8 md:w-12 md:h-12" />
                </div>
              </div>
            </div>
            
            {/* Artwork Metadata - Centered Content */}
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
