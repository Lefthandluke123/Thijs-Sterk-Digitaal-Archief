"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Sparkles,
  MousePointer2,
  Move,
  Film
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle, cleanString, normalizeArtwork } from '@/lib/museum-utils';
import { Button } from '@/components/ui/button';

const DeepZoomViewer = dynamic(() => import('@/components/deep-zoom-viewer').then(mod => mod.DeepZoomViewer), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-black/[0.02] rounded-3xl"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>
});

interface RoomClientProps {
  artworks: any[];
  roomTitle?: string;
}

export function RoomClient({ artworks: dbArtworks, roomTitle }: RoomClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'viewer'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showHints, setShowHints] = useState(true);
  
  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return dbArtworks.map(art => normalizeArtwork(art.id, art)).sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const activeItem = artworks[currentIndex];

  useEffect(() => {
    if (viewMode === 'viewer') {
      setShowHints(true);
      const timer = setTimeout(() => setShowHints(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [viewMode, currentIndex]);

  const handleNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % artworks.length), [artworks.length]);
  const handlePrev = useCallback(() => setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length), [artworks.length]);

  const enterViewer = (index: number) => {
    setCurrentIndex(index);
    setViewMode('viewer');
    window.dispatchEvent(new CustomEvent('track-artwork', { 
      detail: { id: artworks[index].id, title: artworks[index].displayTitle || artworks[index].title } 
    }));
  };

  if (!artworks || artworks.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background"><p className="font-headline text-2xl italic opacity-30">Deze zaal is momenteel leeg...</p></div>;

  return (
    <div className="min-h-screen">
      <main className={cn("pt-32 pb-48 px-6 transition-all duration-1000", viewMode === 'viewer' ? "opacity-0 pointer-events-none translate-y-12" : "opacity-100")}>
        <div className="container mx-auto max-w-6xl space-y-20 text-center">
          <h1 className="font-headline text-4xl md:text-7xl italic leading-tight">{roomTitle}</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {artworks.map((item, idx) => (
              <div key={item.id} className="group cursor-pointer space-y-6" onClick={() => enterViewer(idx)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-black/[0.03] shadow-md group-hover:shadow-2xl transition-all duration-1500 flex items-center justify-center p-4 border border-black/5">
                  {item.mediaType === 'video' ? <video src={item.videoUrl} className="w-full h-full object-cover" /> : <img src={item.image} className="max-w-full max-h-full object-contain" alt="" />}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center"><div className="p-4 rounded-full bg-white/30 backdrop-blur-xl"><Maximize2 className="text-white w-6 h-6" /></div></div>
                  {item.mediaType === 'video' && <div className="absolute top-4 left-4 bg-blue-600 text-white p-2 rounded-xl shadow-lg"><Film className="w-4 h-4" /></div>}
                </div>
                <h3 className="font-headline text-xl italic truncate">{item.displayTitle || item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </main>

      {viewMode === 'viewer' && activeItem && (
        <div className="fixed inset-0 z-[1000] bg-background animate-in fade-in duration-700">
           <div className="absolute inset-0 z-[110] flex items-center justify-center p-12">
             {activeItem.mediaType === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black/5 rounded-[3rem] overflow-hidden shadow-2xl">
                   <video src={activeItem.videoUrl} className="max-w-full max-h-full" controls autoPlay muted loop />
                </div>
             ) : (
                <DeepZoomViewer key={activeItem.id} imageUrl={activeItem.image} brightness={activeItem.brightness || 1} />
             )}
           </div>
           <div className="absolute top-0 left-0 right-0 z-[150] p-10 flex justify-between">
              <button onClick={() => setViewMode('grid')} className="p-4 rounded-full bg-white/90 backdrop-blur-xl border border-black/5 hover:bg-accent hover:text-white transition-all shadow-xl"><LayoutGrid className="w-5 h-5" /></button>
              <button onClick={() => setShowMetadata(!showMetadata)} className={cn("p-4 rounded-full backdrop-blur-xl border border-black/5 transition-all shadow-xl", showMetadata ? "bg-accent text-white" : "bg-white/90")}><Info className="w-5 h-5" /></button>
           </div>
           {showMetadata && (
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[160] max-w-md w-full bg-white/95 p-6 rounded-[2.5rem] shadow-2xl text-center space-y-4 animate-in slide-in-from-bottom-4">
                <h2 className="font-headline text-2xl italic">{activeItem.displayTitle || activeItem.title}</h2>
                <p className="text-muted-foreground italic">{activeItem.description || 'Beschrijving volgt...'}</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
