"use client";

import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { ArtworkViewer } from '@/components/artwork-viewer';

export function ArtworkViewerWrapper({ artworks }: { artworks: any[] }) {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
        {artworks.map((item) => (
          <article 
            key={item.id} 
            className="group relative cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700" 
            onClick={() => setSelectedArtwork(item)}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
              <img 
                src={item.image || item.imageUrl} 
                alt={item.title} 
                className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-[1.05]"
                style={{ filter: `brightness(${item.brightness || 1})` }}
              />
              <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="text-white w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground truncate">
                {item.title}
              </h3>
            </div>
          </article>
        ))}
      </div>
      <ArtworkViewer artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </>
  );
}
