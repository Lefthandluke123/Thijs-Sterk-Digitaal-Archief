"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft, Mic, Play, Pause, Video, Share2, ZoomIn, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { DeepZoomViewer, type DeepZoomHandle } from '@/components/deep-zoom-viewer';
import { toast } from '@/hooks/use-toast';

export default function SharedRoomPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { language, t } = useLanguage();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(false);
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
    if (room) {
      const timer = setTimeout(() => setShowHint(true), 1500);
      const hideTimer = setTimeout(() => setShowHint(false), 8000);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [room]);

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

  const handleGlobalShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: room?.title || "Mijn Expositie",
          text: `Bekijk dit retrospectief archief van Thijs Sterk: ${room?.title}`,
          url
        });
        return;
      } catch (e) {}
    }
    // Fallback: copy link
    navigator.clipboard.writeText(url);
    toast({ title: "Link gekopieerd!" });
  };

  if (roomLoading || artLoading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>;
  if (!room) return <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-8"><p className="font-headline text-3xl italic opacity-40">Kamer niet gevonden</p><Link href="/" className="text-[11px] font-black uppercase tracking-widest border-b border-white/20 pb-1">Terug naar het Museum</Link></div>;

  return (
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col text-white selection:bg-accent selection:text-white">
      <div className={cn(
        "fixed top-1/4 left-1/2 -translate-x-1/2 z-[60] transition-all duration-1000 pointer-events-none",
        showHint ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-10 scale-90"
      )}>
        <div className="bg-accent/90 backdrop-blur-2xl px-10 py-6 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/20 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
             <ZoomIn className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest">Welkom in de Zen-Modus</h4>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{t('viewer_hint_zoom')}</p>
          </div>
        </div>
      </div>

      <div className={cn("absolute top-10 left-10 z-50 flex items-center gap-6 transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
        <Link href="/" className="p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group" title="Museum Verlaat">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-headline text-2xl md:text-3xl italic leading-tight text-white/90">{room.title}</h1>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Privé Expositie</span>
             <span className="w-1 h-1 bg-white/20 rounded-full" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Thijs Sterk Archief</span>
          </div>
        </div>
      </div>

      <div className={cn("absolute top-10 right-10 z-50 flex items-center gap-4 transition-opacity", isAnimating ? "opacity-0 pointer-events-none" : "opacity-100")}>
        <button 
          onClick={handleGlobalShare}
          className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-2xl"
        >
          <Share2 className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{t('viewer_share')}</span>
        </button>

        <button 
          onClick={startReveal}
          className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border-2 border-white/20 bg-accent text-accent-foreground hover:scale-105 active:scale-95 transition-all shadow-2xl group"
        >
          <Video className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{t('viewer_social_reveal')}</span>
        </button>

        {audio && (
          <button onClick={toggleAudio} className={cn("flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border border-white/10 transition-all", isPlaying ? "bg-white text-black" : "bg-white/5 hover:bg-white/10")}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className={cn("absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-50 transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
          <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} className={cn("p-8 rounded-full bg-white/5 backdrop-blur-xl pointer-events-auto transition-all disabled:opacity-0", currentIndex > 0 && "hover:bg-white/10 active:scale-90")}><ArrowLeft className="w-10 h-10 opacity-30" /></button>
          <button onClick={() => setCurrentIndex(p => Math.min(sortedArtworks.length - 1, p + 1))} disabled={currentIndex === sortedArtworks.length - 1} className={cn("p-8 rounded-full bg-white/5 backdrop-blur-xl pointer-events-auto transition-all disabled:opacity-0", currentIndex < sortedArtworks.length - 1 && "hover:bg-white/10 active:scale-90")}><ArrowRight className="w-10 h-10 opacity-30" /></button>
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
             
             <div className={cn("absolute bottom-32 left-0 right-0 text-center space-y-4 pointer-events-none transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
               <h2 className="text-4xl md:text-6xl font-headline font-light italic text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">{activeArtwork.displayTitle || activeArtwork.title}</h2>
               <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
                 <span className="bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">{activeArtwork.year}</span>
                 <span className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_10px_var(--accent)]" />
                 <span className="bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">{activeArtwork.medium}</span>
               </div>
             </div>
          </div>
        )}
      </div>

      <div className={cn("h-28 bg-black/80 backdrop-blur-2xl border-t border-white/10 px-10 flex items-center justify-between shrink-0 transition-opacity", isAnimating ? "opacity-0 pointer-events-none" : "opacity-100")}>
        <div className="flex flex-col gap-1">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Expositie Voortgang</p>
           <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{currentIndex + 1} / {sortedArtworks.length}</p>
        </div>
        <div className="flex gap-2">
          {sortedArtworks.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn("h-1.5 rounded-full transition-all duration-700", i === currentIndex ? "w-16 bg-accent" : "w-4 bg-white/10 hover:bg-white/20")} 
            />
          ))}
        </div>
        <Link href="/" className="group flex items-center gap-3 bg-white/5 hover:bg-accent hover:text-accent-foreground transition-all px-8 py-4 rounded-full border border-white/10 shadow-2xl">
           <span className="text-[10px] font-black uppercase tracking-widest">Volledig Museum</span>
           <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </main>
  );
}
