
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft, Mic, Play, Pause, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from '@/components/share-button';

export default function SharedRoomPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { language, t } = useLanguage();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const roomRef = useMemoFirebase(() => id && firestore ? doc(firestore, 'shared_rooms', id as string) : null, [firestore, id]);
  const { data: room, loading: roomLoading } = useDoc(roomRef);

  const artworksQuery = useMemoFirebase(() => {
    if (!room?.artworkIds || room.artworkIds.length === 0 || !firestore) return null;
    return query(collection(firestore, 'artworks'), where(documentId(), 'in', room.artworkIds));
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

  if (roomLoading || artLoading) return <div className="h-screen bg-[#f4f4f2] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>;
  if (!room) return <div className="h-screen bg-[#f4f4f2] flex flex-col items-center justify-center gap-8"><p className="font-headline text-3xl italic opacity-40">Kamer niet gevonden</p><Link href="/" className="text-[11px] font-black uppercase tracking-widest border-b border-black/20 pb-1">Terug naar het Museum</Link></div>;

  return (
    <main className="h-screen w-screen bg-[#f4f4f2] overflow-hidden flex flex-col">
      <div className="absolute top-10 left-10 z-50 flex items-center gap-6">
        <Link href="/" className="p-4 rounded-full bg-white/80 backdrop-blur-md border border-black/5 hover:bg-accent hover:text-accent-foreground transition-all group shadow-lg">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-headline text-2xl md:text-3xl italic leading-tight text-foreground">{room.title}</h1>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Privé Expositie</span>
             <span className="w-1 h-1 bg-black/10 rounded-full" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black/30">Thijs Sterk Archief</span>
          </div>
        </div>
      </div>

      <div className="absolute top-10 right-10 z-50 flex items-center gap-4">
        <ShareButton 
          title={room.title}
          url={shareUrl}
        />

        {audio && (
          <button onClick={toggleAudio} className={cn("flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md border border-black/5 transition-all shadow-lg", isPlaying ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground")}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
          </button>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center p-12 md:p-32">
        <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-50">
          <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} className={cn("p-8 rounded-full bg-white/20 backdrop-blur-md border border-black/5 pointer-events-auto transition-all disabled:opacity-0 shadow-xl hover:bg-accent hover:text-accent-foreground", currentIndex > 0 && "active:scale-90")}><ArrowLeft className="w-10 h-10 opacity-40" /></button>
          <button onClick={() => setCurrentIndex(p => Math.min(sortedArtworks.length - 1, p + 1))} disabled={currentIndex === sortedArtworks.length - 1} className={cn("p-8 rounded-full bg-white/20 backdrop-blur-md border border-black/5 pointer-events-auto transition-all disabled:opacity-0 shadow-xl hover:bg-accent hover:text-accent-foreground", currentIndex < sortedArtworks.length - 1 && "active:scale-90")}><ArrowRight className="w-10 h-10 opacity-40" /></button>
        </div>

        {activeArtwork && (
          <div className="relative w-full h-full flex items-center justify-center">
             {(activeArtwork.image || activeArtwork.imageUrl) ? (
               <img 
                  key={activeArtwork.id}
                  src={activeArtwork.image || activeArtwork.imageUrl}
                  alt={activeArtwork.title}
                  className="max-w-full max-h-full object-contain shadow-[0_60px_120px_-20px_rgba(0,0,0,0.45)] transition-all duration-1000 animate-in fade-in zoom-in-95 select-none"
                  style={{ filter: `brightness(${activeArtwork.brightness || 1})` }}
               />
             ) : (
               <Palette className="w-20 h-20 opacity-10" />
             )}
             
             <div className="absolute bottom-[-15vh] left-0 right-0 text-center space-y-2 pointer-events-none">
               <h2 className="text-3xl md:text-5xl font-headline font-light italic text-foreground">{activeArtwork.displayTitle || activeArtwork.title}</h2>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent opacity-60">{activeArtwork.year} &bull; {activeArtwork.medium}</p>
             </div>
          </div>
        )}
      </div>

      <div className="h-28 bg-white/80 backdrop-blur-2xl border-t border-black/5 px-10 flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-1">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/40">Expositie Voortgang</p>
           <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{currentIndex + 1} / {sortedArtworks.length}</p>
        </div>
        <div className="flex gap-2">
          {sortedArtworks.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn("h-1.5 rounded-full transition-all duration-700", i === currentIndex ? "w-16 bg-accent" : "w-4 bg-black/10 hover:bg-black/20")} 
            />
          ))}
        </div>
        <Link href="/" className="group flex items-center gap-3 bg-accent text-accent-foreground transition-all px-8 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95">
           <span className="text-[10px] font-black uppercase tracking-widest">Volledig Museum</span>
           <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </main>
  );
}
