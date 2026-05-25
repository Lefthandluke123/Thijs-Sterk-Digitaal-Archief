"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronLeft, ChevronRight, Info, Mic, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from './share-button';
import { usePathname } from 'next/navigation';

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

/**
 * @fileOverview ArtworkViewer: De modale full-screen viewer voor details.
 * GEZALVDE VERSIE - BEHOUD DE LAGE-STRUCTUUR.
 * 
 * Cruciaal: Gebruikt z-[9999] om boven de reguliere site-navigatie te staan.
 * De viewer wordt gereset bij index-wijziging via de 'key' prop op DeepZoomViewer.
 */
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

  const displayImage = artwork.image || artwork.imageUrl || artwork.url;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-700"
    >
      {/* 1. Viewer Background Layer */}
      <div className="absolute inset-0 z-[10010] flex items-center justify-center p-12 md:p-24">
        <div className="w-full h-full max-w-[95vw] max-h-[85vh]">
          {displayImage && (
            <DeepZoomViewer 
              key={artwork.id} 
              imageUrl={displayImage} 
              brightness={artwork.brightness || 1}
            />
          )}
        </div>
      </div>

      {/* 2. UI Nav Layer (Hoogste klik-prioriteit binnen de modal) */}
      <div className="absolute inset-0 z-[10030] pointer-events-none flex items-center justify-between px-8 md:px-16">
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className={cn(
            "pointer-events-auto p-6 rounded-full bg-white/20 backdrop-blur-3xl border border-white/40 shadow-2xl hover:bg-accent hover:text-accent-foreground transition-all group active:scale-90",
            !onPrev && "opacity-0 pointer-events-none"
          )}
          aria-label="Vorig kunstwerk"
        >
          <ChevronLeft className="w-10 h-10 opacity-40 group-hover:opacity-100" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className={cn(
            "pointer-events-auto p-6 rounded-full bg-white/20 backdrop-blur-3xl border border-white/40 shadow-2xl hover:bg-accent hover:text-accent-foreground transition-all group active:scale-90",
            !onNext && "opacity-0 pointer-events-none"
          )}
          aria-label="Volgend kunstwerk"
        >
          <ChevronRight className="w-10 h-10 opacity-40 group-hover:opacity-100" />
        </button>
      </div>

      {/* 3. Header Controls Layer */}
      <div className="absolute top-0 left-0 right-0 z-[10040] p-8 md:p-12 flex items-center justify-between pointer-events-none">
        <div className="hidden md:flex flex-col border-l-2 border-accent/20 pl-8 pointer-events-auto">
           <h1 className="font-headline text-3xl italic text-foreground">{artwork.displayTitle || artwork.title}</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mt-2">{artwork.year} &bull; {artwork.medium}</p>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
           <ShareButton title={artwork.displayTitle || artwork.title} url={artworkUrl} />
           
           {audio && (
             <button 
              onClick={toggleAudio} 
              className={cn(
                "p-6 rounded-full backdrop-blur-3xl border border-black/5 transition-all flex items-center gap-4 shadow-xl", 
                isPlaying ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white"
              )}
             >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>
           )}

           <button 
            onClick={() => setShowMetadata(!showMetadata)} 
            className={cn(
              "p-6 rounded-full backdrop-blur-3xl border border-black/5 transition-all shadow-xl", 
              showMetadata ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white"
            )}
           >
             <Info className="w-6 h-6" />
           </button>

           <button 
            onClick={onClose} 
            className="p-6 bg-white/90 backdrop-blur-3xl rounded-full text-foreground hover:bg-destructive hover:text-white transition-all border border-black/5 shadow-xl"
           >
             <X className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* 4. Metadata Overlay Layer */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-[10050] flex flex-col items-center p-16 pointer-events-none transition-all duration-1000 ease-in-out", 
        showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-32"
      )}>
        <div className="museum-label max-w-4xl w-full text-center pointer-events-auto shadow-2xl bg-white/95 p-12 rounded-[3rem] space-y-8">
          <h2 className="text-4xl md:text-6xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          <div className="h-px w-24 bg-accent/20 mx-auto" />
          <p className="text-2xl md:text-3xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto italic">
            {artwork.description || 'Ontdek de essentie van licht en ruimte in dit meesterlijke werk van Thijs Sterk.'}
          </p>
        </div>
      </div>
    </div>
  );
}