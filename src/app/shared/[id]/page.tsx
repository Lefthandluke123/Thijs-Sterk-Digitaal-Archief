"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft, Mic, Play, Pause, Maximize2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { DeepZoomViewer, type DeepZoomHandle } from '@/components/deep-zoom-viewer';

export default function SharedRoomPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { language, t } = useLanguage();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const zoomRef = useRef<DeepZoomHandle>(null);

  const roomRef = useMemoFirebase(() => id ? doc(firestore!, 'shared_rooms', id as string) : null, [firestore, id]);
  const { data: room, loading: roomLoading } = useDoc(roomRef);

  const artworksQuery = useMemoFirebase(() => {
    if (!room?.artworkIds || room.artworkIds.length === 0) return null;
    return query(collection(firestore!, 'artworks'), where(documentId(), 'in', room.artworkIds));
  }, [firestore, room]);

  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);

  const sortedArtworks = useMemo(() => {
    if (!artworks || !room?.artworkIds) return [];
    return room.artworkIds.map(id => artworks.find(a => (a as any).id === id)).filter(Boolean);
  }, [artworks, room]);

  const activeArtwork: any = sortedArtworks[currentIndex];

  useEffect(() => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
    const currentAudioUrl = activeArtwork?.audioUrls?.[language] || activeArtwork?.audioUrls?.['nl'];
    if (currentAudioUrl) {
      const newAudio = new Audio(currentAudioUrl);
      newAudio.onended = () => setIsPlaying(false);
      setAudio(newAudio);
    } else {
      setAudio(null);
    }
  }, [currentIndex, activeArtwork, language]);

  const toggleAudio = () => {
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const startReveal = () => {
    zoomRef.current?.startReveal();
  };

  if (roomLoading || artLoading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>;
  if (!room) return <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-8"><p className="font-headline text-3xl italic opacity-40">Expositie niet gevonden</p><Link href="/" className="text-[11px] font-black uppercase tracking-widest border-b border-white/20 pb-1">Terug naar hoofdpagina</Link></div>;

  return (
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col text-white">
      <div className={cn("absolute top-10 left-10 z-50 flex items-center gap-6 transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
        <Link href="/" className="p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex flex-col">
          <h1 className="font-headline text-2xl italic leading-tight">{room.title}</h1>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Gedeelde Kamer &bull; Thijs Sterk</p>
        </div>
      </div>

      <div className={cn("absolute top-10 right-10 z-50 flex items-center gap-4 transition-opacity", isAnimating ? "opacity-0 pointer-events-none" : "opacity-100")}>
        <button 
          onClick={startReveal}
          className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border-2 border-white/20 bg-accent text-accent-foreground hover:scale-110 active:scale-95 transition-all shadow-2xl"
        >
          <Video className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('viewer_social_reveal')}</span>
        </button>

        {audio && (
          <button onClick={toggleAudio} className={cn("flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border border-white/10 transition-all", isPlaying ? "bg-accent text-accent-foreground" : "bg-white/5 hover:bg-white/10")}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className={cn("absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-50 transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
          <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} className={cn("p-8 rounded-full bg-white/5 backdrop-blur-xl pointer-events-auto transition-all disabled:opacity-0", currentIndex > 0 && "hover:bg-white/10")}><ArrowLeft className="w-10 h-10 opacity-30" /></button>
          <button onClick={() => setCurrentIndex(p => Math.min(sortedArtworks.length - 1, p + 1))} disabled={currentIndex === sortedArtworks.length - 1} className={cn("p-8 rounded-full bg-white/5 backdrop-blur-xl pointer-events-auto transition-all disabled:opacity-0", currentIndex < sortedArtworks.length - 1 && "hover:bg-white/10")}><ArrowRight className="w-10 h-10 opacity-30" /></button>
        </div>

        {activeArtwork && (
          <div className="relative w-full h-full animate-in fade-in duration-1000">
             <DeepZoomViewer 
                ref={zoomRef}
                imageUrl={activeArtwork.imageUrl}
                title={activeArtwork.displayTitle || activeArtwork.title}
                brightness={activeArtwork.brightness}
                onRevealStart={() => setIsAnimating(true)}
                onRevealEnd={() => setIsAnimating(false)}
             />
             
             <div className={cn("absolute bottom-24 left-0 right-0 text-center space-y-3 pointer-events-none transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
               <h2 className="text-3xl md:text-5xl font-headline font-light italic text-white drop-shadow-2xl">{activeArtwork.displayTitle || activeArtwork.title}</h2>
               <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
                 <span>{activeArtwork.year}</span>
                 <span className="w-1 h-1 bg-white/30 rounded-full" />
                 <span>{activeArtwork.medium}</span>
               </div>
             </div>
          </div>
        )}
      </div>

      <div className={cn("h-24 bg-white/[0.02] backdrop-blur-md border-t border-white/5 px-10 flex items-center justify-between shrink-0 transition-opacity", isAnimating ? "opacity-0 pointer-events-none" : "opacity-100")}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Werken {currentIndex + 1} van {sortedArtworks.length}</p>
        <div className="flex gap-1">
          {sortedArtworks.map((_, i) => (
            <div key={i} className={cn("h-1 transition-all duration-500", i === currentIndex ? "w-12 bg-accent" : "w-4 bg-white/10")} />
          ))}
        </div>
        <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors">Volledig Museum</Link>
      </div>
    </main>
  );
}
