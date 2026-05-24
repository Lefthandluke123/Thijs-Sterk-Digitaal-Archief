
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
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

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomSlug) return null;
    return query(collection(firestore, 'artworks'), where('roomSlug', '==', currentRoomSlug));
  }, [firestore, currentRoomSlug]);
  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);

  const activeRoom = useMemo(() => rooms?.find((r: any) => r.slug === currentRoomSlug), [rooms, currentRoomSlug]);

  const handleRoomChange = (slug: string) => {
    router.push(`/gallery?room=${slug}`);
  };

  if (roomsLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <main className="min-h-screen bg-background pt-32 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-20 text-center space-y-6">
          <h1 className="font-headline text-5xl md:text-7xl font-light italic text-accent">{activeRoom?.title || "Kies een Zaal"}</h1>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">{activeRoom?.description}</p>
        </header>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 justify-center border-b mb-16">
           {rooms?.map((r: any) => (
             <button key={r.id} onClick={() => handleRoomChange(r.slug)} className={cn("px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-widest transition-all", currentRoomSlug === r.slug ? "bg-accent text-accent-foreground" : "bg-black/5 hover:bg-black/10")}>
               {r.title}
             </button>
           ))}
        </div>

        {artLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin opacity-20" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
            {artworks?.map((item: any) => (
              <article key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-[1.05]"
                    style={{ filter: `brightness(${item.brightness || 1})` }}
                  />
                  <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground truncate">{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ArtworkViewer artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </main>
  );
}
