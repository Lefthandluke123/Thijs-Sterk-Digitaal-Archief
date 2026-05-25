"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronLeft, ChevronRight, Info, Mic, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from './share-button';
import { usePathname } from 'next/navigation';

const DeepZoomViewer = dynamic(() => import('./deep-zoom-viewer').then(mod => mod.DeepZoomViewer), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/[0.02]">
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
      role="dialog"
      aria-modal="true"
      aria-label={`Detailweergave van ${artwork.displayTitle || artwork.title}`}
      className="fixed inset-0 z-[9999] bg-[#f8f9f7] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-700"
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-[10000] p-6 md:p-12 flex items-center justify-between pointer-events-none">
        <div className="hidden md:flex flex-col border-l-2 border-accent/20 pl-6 pointer-events-auto">
           <h1 className="font-headline text-2xl md:text-3xl italic leading-tight text-foreground">{artwork.displayTitle || artwork.title}</h1>
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent/60 mt-1">{artwork.year} &bull; {artwork.medium}</p>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
           <ShareButton 
             title={artwork.displayTitle || artwork.title}
             url={artworkUrl}
           />

           {audio && (
             <button 
              onClick={toggleAudio} 
              className={cn(
                "p-5 rounded-full backdrop-blur-3xl border border-black/5 transition-all flex items-center gap-4 shadow-xl", 
                isPlaying ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground hover:bg-white"
              )}
             >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
             </button>
           )}

           <button 
            onClick={() => setShowMetadata(!showMetadata)} 
            className={cn(
              "p-5 rounded-full backdrop-blur-3xl border border-black/5 transition-all shadow-xl", 
              showMetadata ? "bg-accent text-accent-foreground" : "bg-white/80 text-foreground hover:bg-white"
            )}
           >
             <Info className="w-5 h-5" />
           </button>

           <button 
            onClick={onClose} 
            className="p-5 bg-white/80 backdrop-blur-3xl rounded-full text-foreground hover:bg-destructive hover:text-white transition-all border border-black/5 shadow-xl"
           >
             <X className="w-5 h-5 opacity-60" />
           </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div className="w-full h-full flex items-center justify-center p-4 md:p-24">
        {displayImage && (
          <div className="w-full h-full max-w-[95vw] max-h-[85vh] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden animate-in zoom-in-95 duration-1000">
            <DeepZoomViewer 
              key={artwork.id}
              imageUrl={displayImage} 
              brightness={artwork.brightness || 1}
            />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-[10000]">
        <button 
          onClick={(e) => { e.stopPropagation(); if(onPrev) onPrev(); }} 
          className={cn(
            "p-6 rounded-full bg-white/20 backdrop-blur-2xl pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-white/20 shadow-2xl active:scale-90",
            !onPrev && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-10 h-10 opacity-60" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if(onNext) onNext(); }} 
          className={cn(
            "p-6 rounded-full bg-white/20 backdrop-blur-2xl pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-white/20 shadow-2xl active:scale-90",
            !onNext && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-10 h-10 opacity-60" />
        </button>
      </div>

      {/* Info Overlay */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-black/5 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out z-[10010]", 
        showMetadata ? "h-auto min-h-[35vh] opacity-100 py-16 px-10 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-24"
      )}>
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className="text-3xl md:text-5xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          
          <div className="flex flex-wrap gap-x-10 gap-y-3 justify-center items-center">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent opacity-50">Jaartal</p>
              <p className="text-base font-bold">{artwork.year || 'Onbekend'}</p>
            </div>
            <div className="h-8 w-px bg-black/5" />
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent opacity-50">Techniek</p>
              <p className="text-base font-bold">{artwork.medium || 'Olieverf op doek'}</p>
            </div>
          </div>

          <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto italic px-6">
            {artwork.description || 'Ontdek de essentie van licht en ruimte in dit meesterlijke werk van Thijs Sterk.'}
          </p>

          <button onClick={() => setShowMetadata(false)} className="text-[10px] font-black uppercase tracking-[0.4em] text-accent border-b border-accent/20 pb-1 hover:opacity-60 transition-opacity">
            Sluit informatie
          </button>
        </div>
      </div>
    </div>
  );
}
