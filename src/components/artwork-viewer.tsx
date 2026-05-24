"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronLeft, ChevronRight, Info, Mic, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { ShareButton } from './share-button';
import { usePathname } from 'next/navigation';

// Laad DeepZoomViewer dynamisch om SSR issues met OpenSeadragon te voorkomen
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

/**
 * @fileOverview Gestroomlijnde Artwork Viewer met Deep Zoom.
 * Gebruikt een directe grid-centrering op de volledige viewport.
 */
export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  
  const pathname = usePathname();
  const { language, t } = useLanguage();

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

  // Harde uitsluiting: render nooit op specifieke detail-pagina's waar RoomClient of ArtworkClientPage actief is
  if (!artwork || pathname.startsWith('/room') || pathname.startsWith('/art') || pathname.startsWith('/artwork')) {
    return null;
  }

  const artworkUrl = `${window.location.origin}/art/${artwork.slug || artwork.id}`;
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
      onClick={onClose}
    >
      {/* Deep Zoom Viewer Container */}
      <div className="w-[90vw] h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {displayImage && (
          <DeepZoomViewer 
            key={artwork.id}
            imageUrl={displayImage} 
            title={artwork.displayTitle || artwork.title} 
            brightness={artwork.brightness || 1}
          />
        )}
      </div>

      {/* UI Overlay Top */}
      <div className="absolute top-8 right-8 z-[10000] flex items-center gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
         <ShareButton 
           title={artwork.displayTitle || artwork.title}
           description={artwork.description}
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

      {/* Navigation Controls */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-[10000]">
        {onPrev && (
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-5 rounded-full bg-white/40 backdrop-blur-md pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-black/5 shadow-xl group/btn"><ChevronLeft className="w-10 h-10 text-foreground opacity-40 group-hover/btn:opacity-100 transition-opacity" /></button>
        )}
        {onNext && (
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-5 rounded-full bg-white/40 backdrop-blur-md pointer-events-auto hover:bg-accent hover:text-accent-foreground transition-all border border-black/5 shadow-xl group/btn"><ChevronRight className="w-10 h-10 text-foreground opacity-40 group-hover/btn:opacity-100 transition-opacity" /></button>
        )}
      </div>

      {/* Metadata Panel */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={cn("absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-black/5 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-700 ease-in-out z-[10010]", showMetadata ? "h-[22vh] opacity-100 py-6 px-12 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12")}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <h2 className="text-xl md:text-3xl font-headline font-light italic text-foreground tracking-tight">{artwork.displayTitle || artwork.title}</h2>
          <div className="text-[12px] md:text-[13px] font-bold tracking-[0.15em] text-accent flex flex-wrap gap-x-6 gap-y-2 justify-center items-center">
            <span className="uppercase opacity-70">Zaal: {artwork.roomSlug}</span>
            <span className="w-1 h-1 rounded-full bg-accent/30 hidden md:inline" />
            <span className="italic">{artwork.year || 'Onbekend'}</span>
            <span className="w-1 h-1 rounded-full bg-accent/30 hidden md:inline" />
            <span className="uppercase tracking-widest">{artwork.medium}</span>
          </div>
          <p className="text-xs text-muted-foreground opacity-60 max-w-2xl mx-auto line-clamp-2">{artwork.description}</p>
        </div>
      </div>
    </div>
  );
}
