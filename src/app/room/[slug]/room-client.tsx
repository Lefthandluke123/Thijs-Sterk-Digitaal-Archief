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

/**
 * @fileOverview RoomClient: Beheert de immersieve zaal-ervaring.
 * STABILIZED UI VERSION - Strikte scheiding tussen Zoom en Navigatie.
 * 
 * Lagen (Z-Index):
 * 110: DeepZoomViewer (Basis interactie)
 * 140: UI Navigatie (Knoppen & Progressie - Hoogste klik prioriteit)
 * 150: Global Header (Terug, Info)
 * 160: Info Plaque (Plaquette overlay)
 */
export function RoomClient({ artworks: dbArtworks, roomTitle }: RoomClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  
  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const item = artworks[currentIndex];

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
    setShowMetadata(false);
  }, [artworks.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
    setShowMetadata(false);
  }, [artworks.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setShowMetadata(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (!item) return null;

  const displayImage = item.image || item.imageUrl || item.url;

  return (
    <main className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* 1. Viewer Layer */}
      <div className="absolute inset-0 z-[110] flex items-center justify-center p-8 md:p-20">
        <div className="w-full h-full max-w-[95vw] max-h-[85vh]">
          {displayImage && (
            <DeepZoomViewer 
              key={`${item.id}-${currentIndex}`} 
              imageUrl={displayImage} 
              brightness={item.brightness || 1}
            />
          )}
        </div>
      </div>

      {/* 2. UI Nav Layer - Kleine, subtiele knoppen die altijd werken */}
      <div className="absolute inset-0 z-[140] pointer-events-none flex items-center justify-between px-4 md:px-8">
        <button 
          onClick={handlePrev}
          className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90"
          aria-label="Vorig kunstwerk"
        >
          <ChevronLeft className="w-6 h-6 md:w-8 h-8 opacity-60 group-hover:opacity-100" />
        </button>
        <button 
          onClick={handleNext}
          className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90"
          aria-label="Volgend kunstwerk"
        >
          <ChevronRight className="w-6 h-6 md:w-8 h-8 opacity-60 group-hover:opacity-100" />
        </button>
      </div>

      {/* 3. Global Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[150] p-6 md:p-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link 
            href="/gallery" 
            className="p-4 rounded-full bg-white/90 backdrop-blur-xl border border-black/5 hover:bg-accent hover:text-accent-foreground transition-all group shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="hidden sm:flex flex-col border-l-2 border-accent/20 pl-6">
            <h1 className="font-headline text-2xl italic text-foreground leading-none">{item.displayTitle || item.title}</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent mt-1.5">
              Zaal: {roomTitle || item.roomSlug}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowMetadata(!showMetadata)}
          className={cn(
            "p-4 rounded-full backdrop-blur-xl border border-black/5 transition-all shadow-xl pointer-events-auto",
            showMetadata ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white"
          )}
        >
          {showMetadata ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </button>
      </div>

      {/* 4. Info Plaque Overlay - COMPACT VERSION */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-[160] flex flex-col items-center p-8 md:p-12 pointer-events-none transition-all duration-1000 ease-in-out",
        showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      )}>
        <div className="museum-label max-w-md w-full shadow-2xl border border-black/5 pointer-events-auto bg-white/95 p-5 rounded-3xl space-y-3">
          <h2 className="text-lg md:text-xl font-headline font-light italic text-foreground leading-tight text-center">{item.displayTitle || item.title}</h2>
          
          <div className="flex gap-6 justify-center items-center py-2 border-y border-black/5">
            <div className="text-center">
              <p className="text-[7px] font-black uppercase tracking-widest text-accent opacity-50">Periode</p>
              <p className="text-xs font-medium">{item.year || 'Interactief'}</p>
            </div>
            <div className="text-center">
              <p className="text-[7px] font-black uppercase tracking-widest text-accent opacity-50">Techniek</p>
              <p className="text-xs font-medium">{item.medium || 'Olieverf op doek'}</p>
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed text-center italic">
            {item.description || 'De essentie van licht en ruimte in een verstild Noord-Hollands landschap.'}
          </p>
        </div>
      </div>
      
      {/* 5. Progress Line */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[140] flex gap-3 items-center pointer-events-none">
        <span className="text-[8px] font-black tracking-widest opacity-30">{currentIndex + 1}</span>
        <div className="flex gap-1.5 pointer-events-auto">
          {artworks.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn("h-1 rounded-full transition-all duration-700", i === currentIndex ? "w-12 bg-accent" : "w-2.5 bg-black/10 hover:bg-black/30")} 
            />
          ))}
        </div>
        <span className="text-[8px] font-black tracking-widest opacity-30">{artworks.length}</span>
      </div>
    </main>
  );
}
