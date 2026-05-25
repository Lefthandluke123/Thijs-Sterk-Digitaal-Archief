"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Info, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle } from '@/lib/museum-utils';

const DeepZoomViewer = dynamic(() => import('@/components/deep-zoom-viewer').then(mod => mod.DeepZoomViewer), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/[0.02] rounded-3xl">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

interface RoomClientProps {
  artworks: any[];
  roomTitle?: string;
}

export function RoomClient({ artworks: dbArtworks, roomTitle }: RoomClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  
  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const item = artworks[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
    setShowMetadata(false);
  }, [artworks.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
    setShowMetadata(false);
  }, [artworks.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'i') setShowMetadata(prev => !prev);
      if (e.key === 'Escape') setShowMetadata(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev]);

  if (!item) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="font-headline text-3xl italic opacity-30">Geen kunstwerken in deze zaal.</p>
      </div>
    );
  }

  const displayImage = item.image || item.imageUrl || item.url;

  return (
    <main className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Header Plaque */}
      <div className="absolute top-0 left-0 right-0 z-[140] p-8 md:p-12 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-8 pointer-events-auto">
          <Link 
            href="/gallery" 
            className="p-5 rounded-full bg-white/90 backdrop-blur-xl border border-black/5 hover:bg-accent hover:text-accent-foreground transition-all group shadow-xl"
            aria-label="Terug naar overzicht"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="hidden md:flex flex-col border-l-2 border-accent/20 pl-8">
            <h1 className="font-headline text-3xl italic text-foreground leading-none">{item.displayTitle || item.title}</h1>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mt-2">
              Zaal: {roomTitle || item.roomSlug}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowMetadata(!showMetadata)}
          className={cn(
            "p-5 rounded-full backdrop-blur-xl border border-black/5 transition-all shadow-xl pointer-events-auto",
            showMetadata ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white"
          )}
          aria-label="Toon informatie"
        >
          {showMetadata ? <X className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </button>
      </div>

      {/* Navigation Paddles - Increased Z-index and explicit pointer control */}
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 z-[130] flex justify-between pointer-events-none">
        <button 
          onClick={handlePrev} 
          className="p-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-foreground pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all active:scale-90 shadow-2xl group"
          aria-label="Vorig werk"
        >
          <ChevronLeft className="w-12 h-12 opacity-40 group-hover:opacity-100" />
        </button>
        <button 
          onClick={handleNext} 
          className="p-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-foreground pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all active:scale-90 shadow-2xl group"
          aria-label="Volgend werk"
        >
          <ChevronRight className="w-12 h-12 opacity-40 group-hover:opacity-100" />
        </button>
      </div>

      {/* Immersive Viewer Container */}
      <div className="w-[90vw] h-[85vh] flex items-center justify-center animate-subtle-fade z-[110] pointer-events-auto">
        {displayImage && (
          <DeepZoomViewer 
            key={`${item.id}-${currentIndex}`}
            imageUrl={displayImage} 
            brightness={item.brightness || 1}
          />
        )}
      </div>

      {/* Premium Museum Plaque (Info Overlay) - Pointer events none on wrapper, auto on card */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out z-[150] p-12 pointer-events-none",
        showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-24"
      )}>
        <div className="museum-label max-w-3xl w-full pointer-events-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-black/5">
          <h2 className="text-3xl md:text-5xl font-headline font-light italic text-foreground leading-tight text-center">{item.displayTitle || item.title}</h2>
          
          <div className="flex flex-wrap gap-x-12 gap-y-4 justify-center items-center py-4">
            <div className="text-center space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent opacity-50">Periode</p>
              <p className="text-lg font-medium">{item.year || 'Interactief'}</p>
            </div>
            <div className="h-10 w-px bg-black/5 hidden md:block" />
            <div className="text-center space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent opacity-50">Techniek</p>
              <p className="text-lg font-medium">{item.medium || 'Olieverf op doek'}</p>
            </div>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed text-center italic border-t border-black/5 pt-8">
            {item.description || 'De essentie van licht en ruimte in een verstild Noord-Hollands landschap.'}
          </p>

          <div className="flex justify-center pt-6">
             <button 
              onClick={() => setShowMetadata(false)} 
              className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/60 hover:text-accent transition-colors pb-1 border-b border-accent/10"
             >
               Sluit informatie
             </button>
          </div>
        </div>
      </div>
      
      {/* Visual Progress Line */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[140] flex gap-3 items-center pointer-events-auto">
        <span className="text-[9px] font-black tracking-widest opacity-30">{currentIndex + 1}</span>
        <div className="flex gap-1.5">
          {artworks.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn("h-1 rounded-full transition-all duration-700", i === currentIndex ? "w-16 bg-accent" : "w-3 bg-black/10 hover:bg-black/30")} 
              aria-label={`Ga naar werk ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-[9px] font-black tracking-widest opacity-30">{artworks.length}</span>
      </div>
    </main>
  );
}
