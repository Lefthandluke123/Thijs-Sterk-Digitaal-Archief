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
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-1000"
    >
      {/* Header Plaque */}
      <div className="absolute top-0 left-0 right-0 z-[10000] p-8 md:p-12 flex items-center justify-between">
        <div className="hidden md:flex flex-col border-l-2 border-accent/20 pl-8">
           <h1 className="font-headline text-3xl italic leading-tight text-foreground">{artwork.displayTitle || artwork.title}</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/60 mt-2">{artwork.year} &bull; {artwork.medium}</p>
        </div>

        <div className="flex items-center gap-4">
           <ShareButton 
             title={artwork.displayTitle || artwork.title}
             url={artworkUrl}
           />

           {audio && (
             <button 
              onClick={toggleAudio} 
              className={cn(
                "p-6 rounded-full backdrop-blur-3xl border border-black/5 transition-all flex items-center gap-4 shadow-xl", 
                isPlaying ? "bg-accent text-accent-foreground" : "bg-white/90 text-foreground hover:bg-white"
              )}
             >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                <span className="text-[11px] font-black uppercase tracking-widest hidden lg:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
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
             <X className="w-6 h-6 opacity-60" />
           </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div className="w-full h-full flex items-center justify-center p-8 md:p-24 animate-subtle-fade">
        {displayImage && (
          <div className="w-full h-full max-w-[95vw] max-h-[85vh] animate-in zoom-in-95 duration-1000">
            <DeepZoomViewer 
              key={artwork.id}
              imageUrl={displayImage} 
              brightness={artwork.brightness || 1}
            />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 flex justify-between px-8 z-[10000] pointer-events-none">
        <button 
          onClick={(e) => { e.stopPropagation(); if(onPrev) onPrev(); }} 
          className={cn(
            "p-10 rounded-full bg-white/20 backdrop-blur-3xl hover:bg-accent hover:text-accent-foreground transition-all border border-white/40 shadow-2xl active:scale-90 group pointer-events-auto",
            !onPrev && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-12 h-12 opacity-40 group-hover:opacity-100" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if(onNext) onNext(); }} 
          className={cn(
            "p-10 rounded-full bg-white/20 backdrop-blur-3xl hover:bg-accent hover:text-accent-foreground transition-all border border-white/40 shadow-2xl active:scale-90 group pointer-events-auto",
            !onNext && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-12 h-12 opacity-40 group-hover:opacity-100" />
        </button>
      </div>

      {/* Info Overlay */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out z-[10010] p-16", 
        showMetadata ? "opacity-100 translate-y-0" : "opacity-0 translate-y-32 pointer-events-none"
      )}>
        <div className="museum-label max-w-4xl w-full text-center">
          <h2 className="text-4xl md:text-6xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          
          <div className="flex flex-wrap gap-x-16 gap-y-4 justify-center items-center py-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent opacity-50">Jaartal</p>
              <p className="text-xl font-medium">{artwork.year || 'Interactief'}</p>
            </div>
            <div className="h-12 w-px bg-black/5 hidden md:block" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent opacity-50">Techniek</p>
              <p className="text-xl font-medium">{artwork.medium || 'Olieverf op doek'}</p>
            </div>
          </div>

          <p className="text-2xl md:text-3xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto italic border-t border-black/5 pt-10">
            {artwork.description || 'Ontdek de essentie van licht en ruimte in dit meesterlijke werk van Thijs Sterk.'}
          </p>

          <div className="pt-8">
            <button onClick={() => setShowMetadata(false)} className="text-[10px] font-black uppercase tracking-[0.5em] text-accent hover:text-accent/60 transition-colors border-b border-accent/10 pb-1">
              Sluit informatie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
