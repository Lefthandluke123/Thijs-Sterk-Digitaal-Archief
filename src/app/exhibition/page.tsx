
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExhibitionPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We tonen een selectie van de mooiste werken (bijv. de laatste 40)
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'), limit(40));
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
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setScrollProgress(scrollLeft / (scrollWidth - clientWidth));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [artworks.length]);

  const scroll = (direction: 'next' | 'prev') => {
    if (!containerRef.current) return;
    const scrollAmount = window.innerWidth * 0.8;
    containerRef.current.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  if (loading && artworks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-[#111] overflow-hidden flex flex-col pt-14">
      {/* Museum Header */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <span className="text-accent/40 font-black tracking-[0.5em] uppercase text-[9px] block mb-2">Virtuele Expositie</span>
        <h1 className="text-white/20 font-headline text-3xl md:text-5xl font-light italic">De Atmosfeer van het Licht</h1>
      </div>

      {/* Main Gallery Hall */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center snap-x snap-mandatory perspective-[2000px]"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex gap-[20vw] px-[40vw] py-20 min-w-max items-center h-full">
          {artworks.map((art, idx) => (
            <div 
              key={art.id} 
              className="snap-center relative group"
              style={{
                perspective: '1000px'
              }}
            >
              {/* Wall Light Effect */}
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none group-hover:bg-accent/10 transition-all duration-1000" />
              
              {/* The Painting Container */}
              <div 
                className="relative transition-all duration-1000 ease-out cursor-pointer hover:scale-[1.02]"
                onClick={() => setSelectedArtwork(art)}
              >
                {/* Frame & Canvas */}
                <div className="relative p-3 bg-black shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5">
                  <img 
                    src={art.imageUrl} 
                    alt={art.displayTitle || art.title}
                    className="max-h-[55vh] w-auto object-contain block"
                    style={{
                      clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                      filter: `brightness(${art.brightness || 1}) contrast(1.05)`
                    }}
                  />
                  {/* Subtle Canvas Texture Overlay */}
                  <div className="absolute inset-3 bg-[url('https://www.transparenttextures.com/patterns/canvas-fabric.png')] opacity-10 pointer-events-none mix-blend-overlay" />
                </div>

                {/* Plaquette */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                  <h3 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-1">{art.displayTitle || art.title}</h3>
                  <p className="text-accent text-[8px] font-bold uppercase tracking-widest">{art.year} &bull; {art.medium}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floor & Perspective Shadows */}
      <div className="absolute bottom-0 left-0 right-0 h-[25vh] bg-gradient-to-t from-black to-transparent z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5 z-10" />

      {/* Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-12">
        <button 
          onClick={() => scroll('prev')}
          className="p-3 rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center gap-2">
           <div className="w-64 h-0.5 bg-white/5 relative overflow-hidden rounded-full">
              <div 
                className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
                style={{ width: `${scrollProgress * 100}%` }}
              />
           </div>
           <span className="text-white/20 text-[8px] font-black uppercase tracking-[0.4em]">Wandel door de Galerie</span>
        </div>

        <button 
          onClick={() => scroll('next')}
          className="p-3 rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Help */}
      <div className="absolute bottom-12 left-12 z-30 flex items-center gap-4 text-white/20">
        <Info className="w-4 h-4" />
        <span className="text-[9px] font-black uppercase tracking-widest">Scroll of gebruik pijltjes</span>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </main>
  );
}
