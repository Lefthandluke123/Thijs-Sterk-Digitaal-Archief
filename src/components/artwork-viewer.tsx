"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronLeft, ChevronRight, Info, Mic, Pause, ImageIcon, MousePointer2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from './share-button';
import { usePathname } from 'next/navigation';
import { cleanString } from '@/lib/museum-utils';

const DeepZoomViewer = dynamic(() => import('./deep-zoom-viewer').then(mod => mod.DeepZoomViewer), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/[0.02] rounded-3xl">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
});

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [artworkUrl, setArtworkUrl] = useState('');
  
  const pathname = usePathname();
  const { language, t } = useLanguage();

  useEffect(() => {
    if (artwork && typeof window !== 'undefined') {
      setArtworkUrl(`${window.location.origin}/art/${artwork.slug || artwork.id}`);
    }
  }, [artwork]);

  useEffect(() => {
    if (!artwork) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [artwork, onNext, onPrev, onClose]);

  useEffect(() => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
    const currentAudioUrl = artwork?.audioUrls?.[language] || artwork?.audioUrls?.['nl'];
    if (currentAudioUrl) {
      const newAudio = new Audio(currentAudioUrl);
      newAudio.onended = () => setIsPlaying(false);
      setAudio(newAudio);
    } else {
      setAudio(null);
    }
  }, [artwork, language]);

  const toggleAudio = () => {
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  if (!artwork || pathname.startsWith('/room') || pathname.startsWith('/artwork')) {
    return null;
  }

  const displayImage = cleanString(artwork.image || artwork.imageUrl || artwork.url);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-700"
    >
      <div className="absolute inset-0 z-[10010] flex items-center justify-center p-12 md:p-24">
        <div className="w-full h-full max-w-[95vw] max-h-[85vh] flex items-center justify-center">
          {displayImage ? (
            <DeepZoomViewer 
              key={artwork.id} 
              imageUrl={displayImage} 
              brightness={artwork.brightness || 1}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 opacity-20">
               <ImageIcon className="w-20 h-20" />
               <p className="text-xs font-black uppercase tracking-widest">Geen afbeelding beschikbaar</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 z-[10030] pointer-events-none flex items-center justify-between px-4 md:px-8">
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className={cn(
            "pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90",
            !onPrev && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-6 h-6 md:w-8 h-8 opacity-40 group-hover:opacity-100" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className={cn(
            "pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-accent/80 hover:text-white transition-all group active:scale-90",
            !onNext && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-6 h-6 md:w-8 h-8 opacity-40 group-hover:opacity-100" />
        </button>
      </div>

      <div className="absolute top-0 left-0 right-0 z-[10040] p-6 md:p-10 flex items-center justify-between pointer-events-none">
        <div className="hidden md:flex flex-col border-l-2 border-accent/20 pl-6 pointer-events-auto">
           <h1 className="font-headline text-2xl italic text-foreground">{artwork.displayTitle || artwork.title}</h1>
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent mt-1.5">{artwork.year} &bull; {artwork.medium}</p>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
           <ShareButton title={artwork.displayTitle || artwork.title} url={artworkUrl} />
           
           {audio && (
             <button onClick={toggleAudio} className={cn("p-4 rounded-full backdrop-blur-3xl border border-black/5 transition-all flex items-center gap-4 shadow-xl", isPlaying ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white")}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
             </button>
           )}

           <button onClick={() => setShowMetadata(!showMetadata)} className={cn("p-4 rounded-full backdrop-blur-3xl border border-black/5 transition-all shadow-xl", showMetadata ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white")}>
             <Info className="w-5 h-5" />
           </button>

           <button onClick={onClose} className="p-4 bg-white/90 backdrop-blur-3xl rounded-full text-foreground hover:bg-destructive hover:text-white transition-all border border-black/5 shadow-xl" title="Sluiten (Rechtsboven)">
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className={cn("absolute bottom-0 left-0 right-0 z-[10050] flex flex-col items-center p-8 md:p-16 pointer-events-none transition-all duration-1000 ease-in-out", showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12")}>
        <div className="museum-label max-w-md w-full text-center pointer-events-auto shadow-2xl bg-white/95 p-5 rounded-3xl space-y-4">
          <h2 className="text-lg md:text-xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          <div className="h-px w-12 bg-accent/20 mx-auto" />
          <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto italic">
            {artwork.description || 'Beschrijving volgt...'}
          </p>
        </div>
      </div>

      {/* Interaction Hint Overlay (Subtle) */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[10040] flex flex-col items-center gap-3 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-1000">
         <div className="bg-white/60 backdrop-blur-xl border border-black/5 px-6 py-2 rounded-full flex items-center gap-6 shadow-sm">
            <div className="flex items-center gap-2">
               <MousePointer2 className="w-3 h-3 opacity-40" />
               <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Klik: Zoom</span>
            </div>
            <div className="w-1 h-1 bg-black/10 rounded-full" />
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black px-1.5 py-0.5 bg-black/5 rounded border border-black/10 text-accent">Cmd+Klik</span>
               <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Uitzoomen</span>
            </div>
            <div className="w-1 h-1 bg-black/10 rounded-full" />
            <div className="flex items-center gap-2">
               <Move className="w-3 h-3 opacity-40" />
               <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Slepen: Bewegen</span>
            </div>
         </div>
      </div>
    </div>
  );
}