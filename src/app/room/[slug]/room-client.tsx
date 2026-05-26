"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ArrowLeft, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Play, 
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle } from '@/lib/museum-utils';
import { Button } from '@/components/ui/button';

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

type ViewMode = 'grid' | 'viewer';

/**
 * @fileOverview RoomClient: Beheert de immersieve zaal-ervaring.
 * Nu met een "Grid Overview" en een "Immersive Viewer".
 */
export function RoomClient({ artworks: dbArtworks, roomTitle }: RoomClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  
  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const activeItem = artworks[currentIndex];

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

  const enterViewer = (index: number) => {
    setCurrentIndex(index);
    setViewMode('viewer');
    setShowMetadata(false);
  };

  useEffect(() => {
    if (viewMode !== 'viewer') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setViewMode('grid');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleNext, handlePrev]);

  if (!artworks || artworks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
        <p className="font-headline text-2xl italic opacity-30">Deze zaal is momenteel leeg...</p>
        <Link href="/gallery" className="text-[10px] font-black uppercase tracking-widest border-b border-black/10 pb-1">Terug naar overzicht</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 1. GRID OVERVIEW MODE */}
      <main className={cn(
        "pt-32 pb-48 px-6 transition-all duration-1000",
        viewMode === 'viewer' ? "opacity-0 pointer-events-none translate-y-12" : "opacity-100 translate-y-0"
      )}>
        <div className="container mx-auto max-w-6xl space-y-20">
          <header className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Zaal Collectie</span>
            </div>
            <h1 className="font-headline text-4xl md:text-7xl font-light italic text-foreground leading-tight">
              {roomTitle}
            </h1>
            <div className="flex flex-col items-center gap-8">
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                Ontdek de verzamelde werken in deze thematische zaal. Klik op een werk voor een gedetailleerde rondleiding.
              </p>
              <Button 
                onClick={() => enterViewer(0)}
                className="h-16 px-12 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 mr-3 fill-current" /> Start Rondleiding
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
            {artworks.map((item, idx) => (
              <div 
                key={item.id} 
                className="group cursor-pointer space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000"
                style={{ animationDelay: `${idx * 100}ms` }}
                onClick={() => enterViewer(idx)}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-black/[0.03] shadow-md group-hover:shadow-2xl transition-all duration-700 flex items-center justify-center p-4 border border-black/5">
                  <img 
                    src={item.image || item.imageUrl} 
                    className="max-w-full max-h-full object-contain transition-transform duration-[1.5s] group-hover:scale-110" 
                    style={{ filter: `brightness(${item.brightness || 1})` }}
                    alt={item.displayTitle || item.title}
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-500">
                    <div className="p-4 rounded-full bg-white/30 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform duration-500">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-headline text-xl italic text-foreground group-hover:text-accent transition-colors truncate px-2">
                    {item.displayTitle || item.title}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    {item.year} &bull; {item.medium}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 2. IMMERSIVE VIEWER MODE */}
      {viewMode === 'viewer' && activeItem && (
        <div className="fixed inset-0 z-[1000] bg-background animate-in fade-in duration-700">
          {/* 1. Viewer Layer */}
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-8 md:p-20">
            <div className="w-full h-full max-w-[95vw] max-h-[85vh]">
              <DeepZoomViewer 
                key={`${activeItem.id}-${currentIndex}`} 
                imageUrl={activeItem.image || activeItem.imageUrl} 
                brightness={activeItem.brightness || 1}
              />
            </div>
          </div>

          {/* 2. UI Nav Layer */}
          <div className="absolute inset-0 z-[140] pointer-events-none flex items-center justify-between px-4 md:px-8">
            <button 
              onClick={handlePrev}
              className="pointer-events-auto p-4 md:p-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90"
            >
              <ChevronLeft className="w-8 h-8 md:w-10 h-10 opacity-60 group-hover:opacity-100" />
            </button>
            <button 
              onClick={handleNext}
              className="pointer-events-auto p-4 md:p-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90"
            >
              <ChevronRight className="w-8 h-8 md:w-10 h-10 opacity-60 group-hover:opacity-100" />
            </button>
          </div>

          {/* 3. Global Header Overlay */}
          <div className="absolute top-0 left-0 right-0 z-[150] p-6 md:p-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-6 pointer-events-auto">
              <button 
                onClick={() => setViewMode('grid')}
                className="p-4 rounded-full bg-white/90 backdrop-blur-xl border border-black/5 hover:bg-accent hover:text-accent-foreground transition-all group shadow-xl"
              >
                <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <div className="hidden sm:flex flex-col border-l-2 border-accent/20 pl-6">
                <h1 className="font-headline text-2xl italic text-foreground leading-none">{activeItem.displayTitle || activeItem.title}</h1>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent mt-1.5">
                  Zaal: {roomTitle}
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

          {/* 4. Info Plaque Overlay */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-[160] flex flex-col items-center p-8 md:p-12 pointer-events-none transition-all duration-1000 ease-in-out",
            showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          )}>
            <div className="museum-label max-w-md w-full shadow-2xl border border-black/5 pointer-events-auto bg-white/95 p-6 rounded-[2.5rem] space-y-4">
              <h2 className="text-xl md:text-2xl font-headline font-light italic text-foreground leading-tight text-center">
                {activeItem.displayTitle || activeItem.title}
              </h2>
              
              <div className="flex gap-8 justify-center items-center py-3 border-y border-black/5">
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-accent opacity-50">Periode</p>
                  <p className="text-sm font-medium">{activeItem.year || 'Interactief'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-accent opacity-50">Techniek</p>
                  <p className="text-sm font-medium">{activeItem.medium || 'Olieverf op doek'}</p>
                </div>
              </div>

              <p className="text-base text-muted-foreground font-light leading-relaxed text-center italic">
                {activeItem.description || 'Beschrijving volgt...'}
              </p>
            </div>
          </div>
          
          {/* 5. Progress Line */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[140] flex gap-4 items-center pointer-events-none">
            <span className="text-[9px] font-black tracking-widest opacity-30">{currentIndex + 1}</span>
            <div className="flex gap-2 pointer-events-auto">
              {artworks.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentIndex(i)}
                  className={cn("h-1 rounded-full transition-all duration-700", i === currentIndex ? "w-16 bg-accent" : "w-3 bg-black/10 hover:bg-black/30")} 
                />
              ))}
            </div>
            <span className="text-[9px] font-black tracking-widest opacity-30">{artworks.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
