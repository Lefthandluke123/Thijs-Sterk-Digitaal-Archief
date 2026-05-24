
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomClientProps {
  artworks: any[];
  roomTitle?: string;
}

/**
 * @fileOverview Museum-zaal component met Absolute Grid Centering.
 * Geoptimaliseerd om geen dubbele lagen of portal-interferentie toe te staan.
 */
export function RoomClient({ artworks, roomTitle }: RoomClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  
  const item = artworks[currentIndex];

  if (!item) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f4f4f2]">
        <p className="font-headline text-2xl italic opacity-40">Geen kunstwerken in deze zaal.</p>
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
    setShowMetadata(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
    setShowMetadata(false);
  };

  const displayImage = item.image || item.imageUrl || item.url;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 100, 
        backgroundColor: '#f4f4f2', 
        display: 'grid', 
        placeItems: 'center', 
        overflow: 'hidden' 
      }}
    >
      {/* UI Overlay Top */}
      <div className="absolute top-0 left-0 right-0 z-[120] p-6 md:p-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link 
            href="/gallery" 
            className="p-4 rounded-full bg-white/80 backdrop-blur-md border border-black/5 hover:bg-accent hover:text-accent-foreground transition-all group shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="hidden md:flex flex-col">
            <h1 className="font-headline text-2xl italic text-foreground leading-tight">{item.title}</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">
              Zaal: {roomTitle || item.roomSlug}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowMetadata(!showMetadata)}
          className={cn(
            "p-4 rounded-full backdrop-blur-md border border-black/5 transition-all shadow-lg pointer-events-auto",
            showMetadata ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground"
          )}
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Navigatie Pijlen */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[110] flex justify-between px-8 pointer-events-none">
        <button 
          onClick={handlePrev} 
          className="p-6 rounded-full bg-white/40 backdrop-blur-md border border-black/5 text-foreground pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all active:scale-90 shadow-xl"
        >
          <ChevronLeft className="w-10 h-10 opacity-60" />
        </button>
        <button 
          onClick={handleNext} 
          className="p-6 rounded-full bg-white/40 backdrop-blur-md border border-black/5 text-foreground pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all active:scale-90 shadow-xl"
        >
          <ChevronRight className="w-10 h-10 opacity-60" />
        </button>
      </div>

      {/* THE MAIN IMAGE - NAKED CENTERING */}
      {displayImage && (
        <img 
          key={item.id}
          src={displayImage} 
          alt={item.title}
          style={{ 
            maxWidth: '90vw', 
            maxHeight: '80vh', 
            objectFit: 'contain', 
            display: 'block',
            boxShadow: '0 60px 120px -20px rgba(0,0,0,0.45)',
            filter: `brightness(${item.brightness || 1})`,
            transition: 'opacity 1s ease-in-out'
          }}
        />
      )}

      {/* Metadata Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-black/5 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out z-[130] overflow-y-auto",
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
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[115] flex gap-2">
        {artworks.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === currentIndex ? "w-12 bg-accent" : "w-4 bg-black/10"
            )}
          />
        ))}
      </div>

      {/* DEBUG LABEL */}
      <div className="absolute bottom-4 right-4 z-[200] pointer-events-none">
        <span className="bg-red-600 text-white text-[8px] font-bold px-2 py-1 rounded uppercase tracking-tighter">ROOM VIEWER ACTIVE</span>
      </div>
    </div>
  );
}
