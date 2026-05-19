
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Loader2, ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExhibitionPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'), limit(50));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    return dbArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [dbArtworks]);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (selectedArtwork) return;
      setScrollX(prev => {
        const next = prev + e.deltaY + e.deltaX;
        return Math.max(0, next);
      });
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [selectedArtwork]);

  if (loading && artworks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-[#f8f8f8] overflow-hidden flex flex-col relative pt-14">
      {/* Museum Header */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <span className="text-accent font-black tracking-[0.4em] uppercase text-[10px] block mb-2">Retrospectief Thijs Sterk</span>
        <h1 className="text-black/80 font-headline text-3xl md:text-5xl font-light italic">De Grote Zaal</h1>
      </div>

      {/* Walking Area */}
      <div className="relative flex-1 flex items-center justify-center">
        {/* The Wall & Floor Container */}
        <div 
          className="relative w-full h-full flex items-center transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${-scrollX * 0.8}px)` }}
        >
          {/* Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-[#e0d7c5] z-0 shadow-[inset_0_20px_50px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
            <div className="absolute top-0 left-0 right-0 h-px bg-black/5" />
          </div>

          {/* Artworks on the Wall */}
          <div className="flex gap-[30vw] px-[50vw] items-center pt-10">
            {artworks.map((art, idx) => (
              <div 
                key={art.id} 
                className="relative group shrink-0"
              >
                {/* Wall Panel */}
                <div 
                  className="relative p-4 bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] border border-black/5 cursor-pointer transition-all duration-700 hover:scale-[1.03] hover:-translate-y-2"
                  onClick={() => setSelectedArtwork(art)}
                >
                  <img 
                    src={art.imageUrl} 
                    alt={art.displayTitle || art.title}
                    className="max-h-[50vh] w-auto object-contain block"
                    style={{
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                      filter: `brightness(${art.brightness || 1})`
                    }}
                  />
                  
                  {/* Spotlight on Wall */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Plaquette */}
                  <div className="mt-4 border-t border-black/5 pt-3">
                    <h3 className="text-black text-[9px] font-black uppercase tracking-[0.2em] mb-1">{art.displayTitle || art.title}</h3>
                    <p className="text-accent text-[8px] font-bold uppercase tracking-widest">{art.year} &bull; {art.medium}</p>
                  </div>
                </div>

                {/* Shadow on Floor */}
                <div className="absolute -bottom-8 left-4 right-4 h-4 bg-black/10 blur-xl rounded-full" />
              </div>
            ))}

            {/* End of Gallery */}
            <div className="shrink-0 w-[50vw] flex flex-col items-center justify-center text-center opacity-20">
               <div className="w-1 h-24 bg-black/20 mb-8" />
               <h4 className="text-[12px] font-black uppercase tracking-[0.5em]">Einde van de Exposities</h4>
               <p className="text-[9px] mt-2 uppercase tracking-widest">Dank voor uw bezoek aan het Atelier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Detail: Shadow & Reflection */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

      {/* Controls Overlay */}
      <div className="absolute bottom-12 left-0 right-0 z-30 flex flex-col items-center gap-6 pointer-events-none">
        <div className="flex items-center gap-12 pointer-events-auto">
          <button 
            onClick={() => setScrollX(prev => Math.max(0, prev - 800))}
            className="p-3 rounded-full bg-white/80 backdrop-blur-sm border border-black/5 text-black/40 hover:text-accent transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center gap-2">
             <div className="flex items-center gap-3 mb-1 text-black/30">
                <MousePointer2 className="w-3 h-3 animate-bounce" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em]">Gebruik muiswiel om te wandelen</span>
             </div>
             <div className="w-48 h-0.5 bg-black/5 relative overflow-hidden rounded-full">
                <div 
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
                  style={{ width: `${Math.min(100, (scrollX / (artworks.length * 400)) * 100)}%` }}
                />
             </div>
          </div>

          <button 
            onClick={() => setScrollX(prev => prev + 800)}
            className="p-3 rounded-full bg-white/80 backdrop-blur-sm border border-black/5 text-black/40 hover:text-accent transition-all shadow-lg active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </main>
  );
}
