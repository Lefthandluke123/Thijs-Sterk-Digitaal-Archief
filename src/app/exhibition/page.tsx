"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Loader2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle } from '@/lib/museum-utils';

function ExhibitionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();

  const currentRoomSlug = searchParams.get('room');
  const [scrollX, setScrollX] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

  const activeRoom = useMemo(() => 
    rooms?.find((r: any) => r.slug === currentRoomSlug || r.id === currentRoomSlug), 
    [rooms, currentRoomSlug]
  );

  const artworksQuery = useMemo(() => {
    if (!firestore || !activeRoom) return null;
    return query(
      collection(firestore, 'artworks'), 
      where('roomIds', 'array-contains', activeRoom.id)
    );
  }, [firestore, activeRoom]);
  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  useEffect(() => {
    if (rooms && rooms.length > 0 && !currentRoomSlug) {
      router.replace(`/exhibition?room=${rooms[0].slug || rooms[0].id}`);
    }
  }, [rooms, currentRoomSlug, router]);

  const currentIndex = rooms?.findIndex((r: any) => r.slug === currentRoomSlug || r.id === currentRoomSlug) ?? -1;
  const nextRoom = currentIndex < (rooms?.length || 0) - 1 ? rooms?.[currentIndex + 1] : null;

  const handleStep = (delta: number) => {
    setScrollX(prev => Math.max(0, prev + delta));
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (selectedArtwork) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      handleStep(delta * 2);
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [selectedArtwork]);

  if (loading || !rooms) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <main className="h-screen w-full bg-white overflow-hidden flex flex-col relative pt-16 md:pt-32">
      <div className="absolute top-10 left-0 right-0 z-40 flex justify-center px-6">
         <div className="bg-white/80 backdrop-blur-md border rounded-full px-8 py-3 flex items-center gap-8 shadow-xl">
            {rooms.map((r: any) => (
              <button 
                key={r.id} 
                onClick={() => {
                  setScrollX(0);
                  router.push(`/exhibition?room=${r.slug || r.id}`);
                }} 
                className={cn(
                  "text-[14px] font-bold uppercase tracking-widest whitespace-nowrap transition-all", 
                  (currentRoomSlug === r.slug || currentRoomSlug === r.id) ? "text-accent scale-105" : "text-black/30 hover:text-black"
                )}
              >
                {r.title}
              </button>
            ))}
         </div>
      </div>

      <div className="absolute top-48 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none opacity-90 w-full px-4">
        <h1 className="text-black/70 font-headline text-5xl font-medium italic tracking-tight">{activeRoom?.title}</h1>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div 
          className="relative w-full h-full flex items-center transition-transform duration-1200 ease-out" 
          style={{ transform: `translateX(${-scrollX}px)` }}
        >
          <div className="flex gap-[40vw] px-[50vw] items-center pt-8">
            {artworks?.length === 0 ? (
              <div className="shrink-0 w-[40vw] text-center opacity-20 italic">Geen werken gevonden in deze zaal</div>
            ) : (
              artworks?.map((art: any) => (
                <div key={art.id} className="relative group shrink-0 flex items-center justify-center" onClick={() => setSelectedArtwork(art)}>
                  <div className="relative flex flex-col bg-white shadow-2xl border border-black/[0.03] cursor-pointer transition-all duration-700 hover:scale-[1.01] items-center justify-center overflow-hidden">
                     <div className="p-8 pb-4 flex items-center justify-center bg-gray-50/30 w-full">
                        <img 
                          src={art.image || art.imageUrl} 
                          className="relative block max-h-[50vh] max-w-[40vw] w-auto h-auto object-contain mx-auto" 
                          style={{ filter: `brightness(${art.brightness || 1})` }}
                          alt={art.displayTitle || art.title} 
                        />
                     </div>
                     <div className="w-full px-8 py-6 border-t border-black/[0.03] bg-white text-center">
                        <h3 className="text-black text-[11px] font-bold uppercase tracking-[0.2em] mb-1 truncate">{art.displayTitle || art.title}</h3>
                        <p className="text-accent text-[8px] font-bold uppercase tracking-widest">{art.year} &bull; {art.medium}</p>
                     </div>
                  </div>
                </div>
              ))
            )}

            {nextRoom && (
              <div className="shrink-0 w-[50vw] flex flex-col items-center justify-center text-center opacity-40 group hover:opacity-100 transition-opacity">
                 <h4 className="text-[11px] font-bold uppercase tracking-[0.5em]">Volgende Zaal</h4>
                 <button 
                  onClick={() => {
                    setScrollX(0);
                    router.push(`/exhibition?room=${nextRoom.slug || nextRoom.id}`);
                  }} 
                  className="mt-12 px-10 py-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-[0.25em] shadow-xl hover:scale-105 transition-all flex items-center gap-4"
                 >
                    {nextRoom.title} <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 z-30 flex justify-center gap-24 items-center">
        <button onClick={() => handleStep(-1000)} className="p-10 rounded-full bg-white/40 backdrop-blur-md border text-black/30 hover:text-accent transition-all active:scale-90 shadow-xl group"><ChevronLeft className="w-20 h-20 transition-transform group-hover:-translate-x-1" /></button>
        <div className="flex flex-col items-center gap-2">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Wandel door de collectie</span>
           <div className="w-48 h-0.5 bg-black/5 rounded-full" />
        </div>
        <button onClick={() => handleStep(1000)} className="p-10 rounded-full bg-white/40 backdrop-blur-md border text-black/30 hover:text-accent transition-all active:scale-90 shadow-xl group"><ChevronRight className="w-20 h-20 transition-transform group-hover:translate-x-1" /></button>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onNext={() => {
           if(!artworks || !selectedArtwork) return;
           const idx = artworks.findIndex(a => a.id === selectedArtwork.id);
           if(idx < artworks.length - 1) setSelectedArtwork(artworks[idx + 1]);
        }}
        onPrev={() => {
           if(!artworks || !selectedArtwork) return;
           const idx = artworks.findIndex(a => a.id === selectedArtwork.id);
           if(idx > 0) setSelectedArtwork(artworks[idx - 1]);
        }}
      />
    </main>
  );
}

export default function ExhibitionPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>}>
      <ExhibitionContent />
    </Suspense>
  );
}
