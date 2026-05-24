
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

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
  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);

  const activeRoom = useMemo(() => rooms?.find((r: any) => r.slug === currentRoomSlug), [rooms, currentRoomSlug]);

  if (roomsLoading && !rooms) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <main className="min-h-screen bg-background pt-32 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-20 text-center space-y-6">
          <h1 className="font-headline text-5xl md:text-7xl font-light italic text-accent">{activeRoom?.title || t('gallery_select')}</h1>
          {activeRoom?.description && (
            <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">{activeRoom?.description}</p>
          )}
        </header>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 justify-center border-b mb-16 px-4">
           {rooms?.map((r: any) => (
             <button 
                key={r.id} 
                onClick={() => router.push(`/gallery?room=${r.slug}`)} 
                className={cn(
                  "px-8 py-3 rounded-full text-[12px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border-2", 
                  currentRoomSlug === r.slug ? "bg-accent text-accent-foreground border-accent shadow-lg scale-105" : "bg-white border-transparent hover:border-accent/30"
                )}
             >
               {r.title}
             </button>
           ))}
        </div>

        {artLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin opacity-20" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
            {artworks?.map((item: any) => {
              const displayImage = item.image || item.imageUrl;
              return (
                <article key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/10 shadow-lg transition-all duration-700 hover:shadow-2xl group-hover:-translate-y-1">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110"
                        style={{ filter: `brightness(${item.brightness || 1})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <Maximize2 className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                        <Maximize2 className="text-white w-6 h-6" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-accent transition-colors truncate">{item.title}</h3>
                  </div>
                </article>
              );
            })}
            {(!artworks || artworks.length === 0) && !artLoading && (
              <div className="col-span-full py-20 text-center opacity-30 italic font-light">
                {t('gallery_closed')}
              </div>
            )}
          </div>
        )}
      </div>

      <ArtworkViewer artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </main>
  );
}
