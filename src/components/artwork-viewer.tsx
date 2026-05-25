
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronLeft, ChevronRight, Info, Mic, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from './share-button';
import { usePathname } from 'next/navigation';

// Laad DeepZoomViewer dynamisch om SSR issues te voorkomen
const DeepZoomViewer = dynamic(() => import('./deep-zoom-viewer').then(mod => mod.DeepZoomViewer), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/5">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
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
    if (!artwork) {
      setShowMetadata(false);
      if (audio) audio.pause();
      setIsPlaying(false);
    }
  }, [artwork, audio]);

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

  const displayImage = artwork.image || artwork.imageUrl || artwork.url;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999, 
        backgroundColor: '#f4f4f2', 
        display: 'grid', 
        placeItems: 'center',
        overflow: 'hidden'
      }}
    >
      <div className="w-[90vw] h-[80vh] flex items-center justify-center">
        {displayImage && (
          <DeepZoomViewer 
            key={artwork.id}
            imageUrl={displayImage} 
            brightness={artwork.brightness || 1}
          />
        )}
      </div>

      <div className="absolute top-8 right-8 z-[10000] flex items-center gap-4">
         <ShareButton 
           title={artwork.displayTitle || artwork.title}
           url={artworkUrl}
         />

         {audio && (
           <button onClick={toggleAudio} className={cn("p-4 rounded-full backdrop-blur-md border border-black/5 transition-all flex items-center gap-3 shadow-lg", isPlaying ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground")}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
           </button>
         )}

         <button onClick={() => setShowMetadata(!showMetadata)} className={cn("p-4 rounded-full backdrop-blur-md border border-black/5 transition-all shadow-lg", showMetadata ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground")}><Info className="w-5 h-5" /></button>
         <button onClick={onClose} className="p-4 bg-white/80 backdrop-blur-md rounded-full text-foreground hover:bg-destructive hover:text-white transition-all border border-black/5 shadow-lg"><X className="w-5 h-5 opacity-60" /></button>
      </div>

      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-[10000]">
        <button 
          onClick={(e) => { e.stopPropagation(); if(onPrev) onPrev(); }} 
          className={cn(
            "p-5 rounded-full bg-white/40 backdrop-blur-md pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-black/5 shadow-xl",
            !onPrev && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-10 h-10 opacity-40" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if(onNext) onNext(); }} 
          className={cn(
            "p-5 rounded-full bg-white/40 backdrop-blur-md pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-black/5 shadow-xl",
            !onNext && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-10 h-10 opacity-40" />
        </button>
      </div>

      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-black/5 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out z-[10010]", 
        showMetadata ? "h-[30vh] opacity-100 py-12 px-10 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12"
      )}>
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-5xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          <div className="text-[12px] font-bold tracking-[0.2em] text-accent flex flex-wrap gap-x-8 gap-y-2 justify-center items-center uppercase">
            <span>{artwork.year || 'Onbekend'}</span>
            <span className="w-1 h-1 rounded-full bg-accent/30" />
            <span>{artwork.medium}</span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">{artwork.description}</p>
        </div>
      </div>
    </div>
  );
}
