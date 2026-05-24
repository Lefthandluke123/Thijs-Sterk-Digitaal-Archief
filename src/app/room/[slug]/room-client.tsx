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
 * Zorgt voor een grid van kunstwerken die elk linken naar hun eigen detailpagina.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-12">
      {artworks.map((item, index) => (
        <Link 
          key={item.id} 
          href={`/art/${item.slug}`}
          className="group block animate-in fade-in slide-in-from-bottom-8 duration-700"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <article className="space-y-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/10 shadow-lg transition-all duration-700 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] group-hover:-translate-y-2">
              <img 
                src={item.image || item.imageUrl} 
                alt={item.title} 
                className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110"
                style={{ filter: `brightness(${item.brightness || 1})` }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-500">
                  <Maximize2 className="text-white w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2 px-2">
              <h3 className="font-headline text-lg italic text-muted-foreground group-hover:text-accent transition-colors truncate">
                {item.title}
              </h3>
              <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-accent/40 group-hover:text-accent/100 transition-all">
                <span>Bekijk details</span>
                <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
