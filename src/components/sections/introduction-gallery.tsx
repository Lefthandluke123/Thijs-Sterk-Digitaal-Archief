"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, limit, orderBy, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, ArrowRight, Layers, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { cleanString } from '@/lib/museum-utils';
import { useLanguage } from '@/components/language-provider';

export function IntroductionGallery() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  const siteSettingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), limit(100), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allArtworks, loading: artLoading } = useCollection(artworksQuery);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

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

  const getArtworkRoomSlug = (item: any) => {
    if (item.roomSlug) return item.roomSlug;
    if (item.roomIds?.length > 0 && rooms) {
      const firstRoom = rooms.find(r => r.id === item.roomIds[0]);
      return firstRoom?.slug || 'gallery';
    }
    return 'gallery';
  };

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !curatedArtworks) return;
    const currentIndex = curatedArtworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % curatedArtworks.length 
      : (currentIndex - 1 + curatedArtworks.length) % curatedArtworks.length;
    setSelectedArtwork(curatedArtworks[nextIndex]);
  }, [selectedArtwork, curatedArtworks]);

  const introTitle = (language !== 'nl' && siteSettings?.[`homeIntroTitle_${language}`])
    ? siteSettings[`homeIntroTitle_${language}`]
    : siteSettings?.homeIntroTitle || t('homeIntroTitle');

  const introSubtitle = (language !== 'nl' && siteSettings?.[`homeIntroSubtitle_${language}`])
    ? siteSettings[`homeIntroSubtitle_${language}`]
    : siteSettings?.homeIntroSubtitle || t('homeIntroSubtitle');

  const introBadge = t('homeIntroBadge');

  return (
    <section className="py-32 bg-background px-4 scroll-mt-32" id="kennismaking">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{introBadge}</span>
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-light italic text-foreground">{introTitle}</h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">{introSubtitle}</p>
        </div>

        <div className="min-h-[400px]">
          {artLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-6 animate-pulse">
                   <div className="aspect-[4/5] rounded-[2rem] bg-black/5" />
                   <div className="space-y-3 flex flex-col items-center">
                      <div className="h-6 w-3/4 bg-black/5 rounded-lg" />
                      <div className="h-3 w-1/2 bg-black/5 rounded-full" />
                      <div className="h-10 w-32 bg-black/5 rounded-full mt-4" />
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16 animate-in fade-in duration-700">
              {curatedArtworks?.map((item: any) => {
                const displayImage = cleanString(item.image || item.imageUrl);
                const title = item.displayTitle || item.title;
                const roomSlug = getArtworkRoomSlug(item);
                return (
                  <div key={item.id} className="group flex flex-col space-y-6">
                    <button 
                      className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-black/[0.03] shadow-md transition-all duration-1500 hover:shadow-2xl cursor-pointer flex items-center justify-center p-3 border border-black/5"
                      onClick={() => setSelectedArtwork(item)}
                    >
                      {displayImage ? (
                        <img 
                          src={displayImage} 
                          alt={title} 
                          className="max-w-full max-h-full object-contain transition-transform duration-1500 group-hover:scale-110"
                          style={{ filter: `brightness(${item.brightness || 1})` }}
                        />
                      ) : (
                        <ImageIcon className="w-12 h-12 opacity-10" />
                      )}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <div className="p-3.5 rounded-full bg-white/40 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform">
                            <Maximize2 className="text-white w-6 h-6" />
                         </div>
                      </div>
                    </button>
                    
                    <div className="space-y-4 text-center px-2">
                      <div className="space-y-1.5">
                        <h3 className="font-headline text-xl italic text-foreground truncate px-4">{title}</h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{item.year} &bull; {item.medium}</p>
                      </div>
                      <Link 
                        href={`/gallery?room=${roomSlug}`}
                        className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-black/5 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-foreground transition-all"
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
