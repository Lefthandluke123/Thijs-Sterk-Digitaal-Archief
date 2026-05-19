
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Loader2, MousePointer2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExhibitionPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [scrollX, setScrollX] = useState(0);
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

  // Toetsenbord navigatie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArtwork) return;
      if (e.key === 'ArrowRight') setScrollX(prev => prev + 400);
      if (e.key === 'ArrowLeft') setScrollX(prev => Math.max(0, prev - 400));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork]);

  // Scroll navigatie
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
    <main className="h-screen w-full bg-white overflow-hidden flex flex-col relative pt-14">
      {/* Heldere Museum Achtergrond */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 to-white pointer-events-none" />
      
      {/* Header */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <span className="text-accent font-black tracking-[0.4em] uppercase text-[10px] block mb-2">Retrospectief Thijs Sterk</span>
        <h1 className="text-black/80 font-headline text-3xl md:text-5xl font-light italic">De Grote Zaal</h1>
      </div>

      {/* Wandeling Gebied */}
      <div className="relative flex-1 flex items-center justify-center">
        <div 
          className="relative w-full h-full flex items-center transition-transform duration-700 ease-out"
          style={{ transform: `translateX(${-scrollX}px)` }}
        >
          {/* Lichte Museumvloer */}
          <div className="absolute bottom-0 left-[-5000px] right-[-5000px] h-[35vh] bg-[#f5f1e8] z-0">
             <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
             <div className="absolute top-0 left-0 right-0 h-px bg-black/10" />
             <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/5 to-transparent" />
          </div>

          {/* Schilderijen aan de wand */}
          <div className="flex gap-[45vw] px-[50vw] items-center pt-10">
            {artworks.map((art) => (
              <div 
                key={art.id} 
                className="relative group shrink-0"
              >
                {/* Wit Museum Paneel */}
                <div 
                  className="relative p-6 bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-black/5 cursor-pointer transition-all duration-700 hover:scale-[1.02] hover:-translate-y-2"
                  onClick={() => setSelectedArtwork(art)}
                >
                  <img 
                    src={art.imageUrl} 
                    alt={art.displayTitle || art.title}
                    className="max-h-[55vh] w-auto object-contain block"
                    style={{
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                      filter: `brightness(${art.brightness || 1})`
                    }}
                  />
                  
                  {/* Spotlight effect */}
                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Informatiebordje */}
                  <div className="mt-6 border-t border-black/5 pt-4">
                    <h3 className="text-black text-[10px] font-black uppercase tracking-[0.2em] mb-1">{art.displayTitle || art.title}</h3>
                    <p className="text-accent text-[9px] font-bold uppercase tracking-widest">{art.year} &bull; {art.medium}</p>
                  </div>
                </div>

                {/* Schaduw op de vloer */}
                <div className="absolute -bottom-12 left-8 right-8 h-6 bg-black/5 blur-2xl rounded-full" />
              </div>
            ))}

            {/* Einde van de zaal */}
            <div className="shrink-0 w-[50vw] flex flex-col items-center justify-center text-center opacity-30">
               <div className="w-1 h-32 bg-black/10 mb-8" />
               <h4 className="text-[14px] font-black uppercase tracking-[0.5em]">Einde van de Exposities</h4>
               <p className="text-[10px] mt-2 uppercase tracking-widest">Dank voor uw bezoek aan het Atelier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigatie Besturing */}
      <div className="absolute bottom-16 left-0 right-0 z-30 flex flex-col items-center gap-8 pointer-events-none">
        <div className="flex items-center gap-16 pointer-events-auto">
          <button 
            onClick={() => setScrollX(prev => Math.max(0, prev - 1200))}
            className="p-5 rounded-full bg-white/90 backdrop-blur-xl border border-black/10 text-black/60 hover:text-accent hover:border-accent/50 transition-all shadow-2xl active:scale-90 group"
            title="Blader naar links"
          >
            <ChevronLeft className="w-10 h-10 transition-transform group-hover:-translate-x-1" />
          </button>
          
          <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-3 text-black/40">
                <MousePointer2 className="w-4 h-4 animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Gebruik muis of knoppen</span>
             </div>
             <div className="w-64 h-1 bg-black/5 relative overflow-hidden rounded-full">
                <div 
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, (scrollX / Math.max(1, artworks.length * 800)) * 100)}%` }}
                />
             </div>
          </div>

          <button 
            onClick={() => setScrollX(prev => prev + 1200)}
            className="p-5 rounded-full bg-white/90 backdrop-blur-xl border border-black/10 text-black/60 hover:text-accent hover:border-accent/50 transition-all shadow-2xl active:scale-90 group"
            title="Blader naar rechts"
          >
            <ChevronRight className="w-10 h-10 transition-transform group-hover:translate-x-1" />
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
