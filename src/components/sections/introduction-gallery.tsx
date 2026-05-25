"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';

export function IntroductionGallery() {
  const [mounted, setMounted] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'artworks'), limit(100), orderBy('createdAt', 'desc'));
  }, [firestore, mounted]);

  const { data: allArtworks, loading } = useCollection(artworksQuery);

  const curatedArtworks = useMemo(() => {
    if (!allArtworks) return [];
    
    const findByTag = (tagNames: string[]) => 
      allArtworks.find(a => (a as any).tags?.some((t: string) => tagNames.includes(t)));

    const olieverf = findByTag(["Olieverf"]);
    const aquarel = findByTag(["Aquarel"]);
    const stilleven = findByTag(["Stillevens", "Stilleven"]);
    const polder = findByTag(["Polder", "Hargen", "Groet"]);

    const selection = [olieverf, aquarel, stilleven, polder].filter(Boolean);
    const uniqueSelection = Array.from(new Set(selection.map(a => a.id)))
      .map(id => selection.find(a => a.id === id));

    if (uniqueSelection.length === 0) return allArtworks.slice(0, 4);
    return uniqueSelection;
  }, [allArtworks]);

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !curatedArtworks) return;
    const currentIndex = curatedArtworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % curatedArtworks.length 
      : (currentIndex - 1 + curatedArtworks.length) % curatedArtworks.length;
    setSelectedArtwork(curatedArtworks[nextIndex]);
  }, [selectedArtwork, curatedArtworks]);

  return (
    <section className="py-32 bg-background px-4 scroll-mt-32" id="kennismaking" aria-labelledby="intro-heading">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">De Collectie</span>
          </div>
          <h2 id="intro-heading" className="font-headline text-4xl md:text-5xl font-light italic text-foreground leading-tight">
            Een Kennismaking
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Een dwarsdoorsnede van het oeuvre: van monumentale olieverf en transparante aquarellen tot verstilde stillevens en het weidse polderlandschap.
          </p>
        </div>

        {!mounted || loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-accent w-8 h-8 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Curatie wordt ingeladen...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
            {curatedArtworks?.map((item: any) => {
              const displayImage = item.image || item.imageUrl;
              const title = item.displayTitle || item.title;
              return (
                <div key={item.id} className="group flex flex-col space-y-6 animate-subtle-fade">
                  <button 
                    className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-black/[0.03] shadow-md transition-all duration-700 hover:shadow-2xl cursor-pointer flex items-center justify-center p-3 focus-visible:ring-4 focus-visible:ring-accent border border-black/5"
                    onClick={() => setSelectedArtwork(item)}
                    aria-label={`Bekijk ${title}`}
                  >
                    {displayImage && (
                      <img 
                        src={displayImage} 
                        alt={`Werk van Thijs Sterk: ${title}`} 
                        className="max-w-full max-h-full object-contain transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                        style={{ filter: `brightness(${item.brightness || 1})` }}
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                       <div className="p-3.5 rounded-full bg-white/40 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform duration-500">
                          <Maximize2 className="text-white w-6 h-6" />
                       </div>
                    </div>
                  </button>
                  
                  <div className="space-y-4 text-center px-2">
                    <div className="space-y-1.5">
                      <h3 className="font-headline text-xl italic text-foreground truncate px-4">
                        {title}
                      </h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                        {item.year || 'Interactief'} &bull; {item.medium || 'Olieverf'}
                      </p>
                    </div>

                    <Link 
                      href={`/gallery?room=${item.roomSlug}`}
                      className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-black/5 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-foreground transition-all duration-500"
                    >
                      Verken Serie <ArrowRight className="w-3 h-3" />
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
