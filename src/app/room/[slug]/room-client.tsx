
"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { DeepZoomViewer, type DeepZoomHandle } from '@/components/deep-zoom-viewer';
import { cn } from '@/lib/utils';

interface RoomClientProps {
  artworks: any[];
}

/**
 * @fileOverview Client Component voor de museumzaal.
 * Gebruikt de Deep Zoom viewer voor een gecentreerde, schermvullende ervaring.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const zoomRef = useRef<DeepZoomHandle>(null);
  
  const item = artworks[currentIndex];

  if (!item) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
    setShowMetadata(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
    setShowMetadata(false);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* UI Overlay Top */}
      <div className="absolute top-0 left-0 right-0 z-[60] p-6 md:p-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link 
            href="/gallery" 
            className="p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="hidden md:flex flex-col">
            <h1 className="font-headline text-2xl italic text-white/90 leading-tight">{item.title}</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">
              Zaal: {item.roomSlug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn(
              "p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl",
              showMetadata ? "bg-accent text-accent-foreground" : "bg-black/40 text-white"
            )}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigatie Pijlen */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[55] flex justify-between px-8 pointer-events-none">
        <button 
          onClick={handlePrev} 
          className="p-6 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white pointer-events-auto hover:bg-black/40 transition-all active:scale-90"
        >
          <ChevronLeft className="w-10 h-10 opacity-60" />
        </button>
        <button 
          onClick={handleNext} 
          className="p-6 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white pointer-events-auto hover:bg-black/40 transition-all active:scale-90"
        >
          <ChevronRight className="w-10 h-10 opacity-60" />
        </button>
      </div>

      {/* Deep Zoom Viewer Engine */}
      <div className="flex-1 relative w-full h-full bg-black">
        <DeepZoomViewer 
          key={item.id} 
          ref={zoomRef}
          imageUrl={item.image || item.imageUrl}
          title={item.title}
          brightness={item.brightness}
        />
      </div>

      {/* Metadata Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-white/10 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out z-[70] overflow-y-auto",
        showMetadata ? "h-auto min-h-[30vh] opacity-100 py-12 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12"
      )}>
        <div className="max-w-4xl mx-auto space-y-6 px-10">
          <h2 className="text-2xl md:text-5xl font-headline font-light italic text-foreground leading-tight">{item.title}</h2>
          
          <div className="text-[12px] font-bold tracking-[0.2em] text-accent flex flex-wrap gap-x-8 gap-y-2 justify-center items-center uppercase">
            {item.year && (
              <>
                <span>{item.year}</span>
                <span className="w-1 h-1 rounded-full bg-accent/30" />
              </>
            )}
            <span>{item.medium || 'Olieverf op doek'}</span>
          </div>

          <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
            {item.description || 'Ontdek de essentie van licht en ruimte in dit meesterlijke werk van Thijs Sterk.'}
          </p>

          <div className="pt-8">
             <button 
              onClick={() => setShowMetadata(false)}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-accent hover:opacity-60 transition-opacity border-b border-accent/20 pb-1"
             >
               Sluit details
             </button>
          </div>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-2">
        {artworks.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === currentIndex ? "w-12 bg-accent" : "w-4 bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}
