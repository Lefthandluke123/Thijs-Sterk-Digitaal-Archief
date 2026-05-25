
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';

export function GalleryClient({ initialRoomSlug }: { initialRoomSlug: string | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const firestore = useFirestore();

  const currentRoomSlug = searchParams.get('room') || initialRoomSlug;
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

  useEffect(() => {
    if (rooms && rooms.length > 0 && !currentRoomSlug) {
      router.replace(`/gallery?room=${rooms[0].slug}`);
    }
  }, [rooms, currentRoomSlug, router]);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomSlug) return null;
    return query(collection(firestore, 'artworks'), where('roomSlug', '==', currentRoomSlug));
  }, [firestore, currentRoomSlug]);
  const { data: dbArtworks, loading: artLoading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const activeRoom = useMemo(() => rooms?.find((r: any) => r.slug === currentRoomSlug), [rooms, currentRoomSlug]);

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !artworks) return;
    const currentIndex = artworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % artworks.length 
      : (currentIndex - 1 + artworks.length) % artworks.length;
    setSelectedArtwork(artworks[nextIndex]);
  }, [selectedArtwork, artworks]);

  if (roomsLoading && !rooms) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mx-auto">
            <LayoutGrid className="w-3 h-3 text-accent" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Collectie Overzicht</span>
          </div>
          <h1 className="font-headline text-3xl md:text-5xl font-light italic text-accent leading-tight">
            {activeRoom?.title || t('gallery_select')}
          </h1>
          {activeRoom?.description && (
            <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              {activeRoom?.description}
            </p>
          )}
        </header>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 justify-center border-b mb-12 px-4">
           {rooms?.map((r: any) => (
             <button 
                key={r.id} 
                onClick={() => router.push(`/gallery?room=${r.slug}`)} 
                className={cn(
                  "px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border-2", 
                  currentRoomSlug === r.slug 
                    ? "bg-accent text-accent-foreground border-accent shadow-md scale-105" 
                    : "bg-white/50 border-transparent hover:border-accent/20"
                )}
             >
               {r.title}
             </button>
           ))}
        </div>

        {artLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin text-accent w-6 h-6 opacity-40" />
            <p className="text-[9px] font-black uppercase tracking-widest opacity-20">Laden van kunstwerken...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {artworks?.map((item: any) => {
              const displayImage = item.image || item.imageUrl;
              return (
                <article 
                  key={item.id} 
                  className="group relative cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700" 
                  onClick={() => setSelectedArtwork(item)}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary/10 shadow-md transition-all duration-700 hover:shadow-xl group-hover:-translate-y-1.5 flex items-center justify-center p-2">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={item.displayTitle || item.title} 
                        className="max-w-full max-h-full object-contain transition-all duration-1000 ease-out group-hover:scale-110"
                        style={{ filter: `brightness(${item.brightness || 1})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <Maximize2 className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="p-3 rounded-full bg-white/30 backdrop-blur-xl border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-500">
                        <Maximize2 className="text-white w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center space-y-1">
                    <h3 className="font-headline text-base italic text-muted-foreground group-hover:text-accent transition-colors truncate">
                      {item.displayTitle || item.title}
                    </h3>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30">
                      {item.year || 'Interactief'} &bull; {item.medium || 'Olieverf'}
                    </p>
                  </div>
                </article>
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
    </main>
  );
}
