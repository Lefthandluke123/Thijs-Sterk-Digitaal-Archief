"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';

/**
 * @fileOverview De kennismakings-galerij op de homepage.
 * Gebruikt mounted-guard om hydration errors te voorkomen bij Firebase data.
 */
export function IntroductionGallery() {
  const [mounted, setMounted] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'artworks'), limit(20), orderBy('createdAt', 'desc'));
  }, [firestore, mounted]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !artworks) return;
    const currentIndex = artworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % artworks.length 
      : (currentIndex - 1 + artworks.length) % artworks.length;
    setSelectedArtwork(artworks[nextIndex]);
  }, [selectedArtwork, artworks]);

  return (
    <section className="py-32 bg-background px-4 scroll-mt-32" id="kennismaking">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-24 space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mx-auto">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Introductie</span>
          </div>
          <h2 className="font-headline text-5xl md:text-7xl font-light italic text-accent leading-tight">
            Een Kennismaking
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Ontdek de diversiteit van het oeuvre. Een dwarsdoorsnede van licht, vorm en emotie.
          </p>
        </div>

        {!mounted || loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-accent w-8 h-8 opacity-40" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Collectie wordt voorbereid...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
            {artworks?.map((item: any) => {
              const displayImage = item.image || item.imageUrl;
              return (
                <div key={item.id} className="group flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div 
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/10 shadow-lg transition-all duration-700 hover:shadow-2xl cursor-pointer flex items-center justify-center p-2"
                    onClick={() => setSelectedArtwork(item)}
                  >
                    {displayImage && (
                      <img 
                        src={displayImage} 
                        alt={item.title} 
                        className="max-w-full max-h-full object-contain transition-all duration-1000 ease-out group-hover:scale-105"
                        style={{ filter: `brightness(${item.brightness || 1})` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="text-white w-8 h-8 drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-center px-2">
                    <div className="space-y-1">
                      <h3 className="font-headline text-xl italic text-foreground truncate">
                        {item.displayTitle || item.title}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                        {item.year || 'Interactief'} &bull; {item.medium || 'Olieverf'}
                      </p>
                    </div>

                    <Link 
                      href={`/gallery?room=${item.roomSlug}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                    >
                      Meer van dit soort werken <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onNext={() => navigateArtwork('next')}
        onPrev={() => navigateArtwork('prev')}
      />
    </section>
  );
}
