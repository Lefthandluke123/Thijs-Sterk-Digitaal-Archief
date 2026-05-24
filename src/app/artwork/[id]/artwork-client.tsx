
"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, Mic, Pause } from 'lucide-react';
import { DeepZoomViewer, type DeepZoomHandle } from '@/components/deep-zoom-viewer';
import { ShareButton } from '@/components/share-button';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Client Component voor de artwork detail weergave.
 * Geoptimaliseerd voor schermvullende Deep Zoom weergave.
 */
export function ArtworkClientPage({ artwork }: { artwork: any }) {
  const { language } = useLanguage();
  const [showMetadata, setShowMetadata] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const zoomRef = useRef<DeepZoomHandle>(null);
  
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const audioUrl = artwork.audioUrls?.[language] || artwork.audioUrls?.['nl'];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const backLink = artwork.roomSlug ? `/room/${artwork.roomSlug}` : "/gallery";

  return (
    <main className="fixed inset-0 bg-black overflow-hidden flex flex-col text-white z-50">
      {/* UI Overlay Top */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link 
            href={backLink} 
            className="p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="hidden md:flex flex-col">
            <h1 className="font-headline text-2xl italic leading-tight text-white/90">{artwork.displayTitle || artwork.title}</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">
              Collectie Thijs Sterk
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <ShareButton 
            title={artwork.displayTitle || artwork.title}
            description={artwork.description}
            url={shareUrl}
          />
          
          {audioUrl && (
            <button 
              onClick={toggleAudio}
              className={cn(
                "p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl",
                isPlaying ? "bg-accent text-accent-foreground" : "bg-black/40 text-white"
              )}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          <button 
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn(
              "p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl",
              showMetadata ? "bg-accent text-accent-foreground" : "bg-black/40 text-white"
            )}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Deep Zoom Viewer */}
      <div className="flex-1 relative w-full h-full bg-black">
        <DeepZoomViewer 
          ref={zoomRef}
          imageUrl={artwork.imageUrl || artwork.image}
          title={artwork.displayTitle || artwork.title}
          brightness={artwork.brightness}
        />
      </div>

      {/* Metadata Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-white/10 flex flex-col items-center justify-center text-center transition-all duration-700 ease-in-out z-40 overflow-y-auto",
        showMetadata ? "h-auto min-h-[30vh] opacity-100 py-12 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12"
      )}>
        <div className="max-w-4xl mx-auto space-y-6 px-10">
          <h2 className="text-2xl md:text-5xl font-headline font-light italic text-foreground leading-tight">{artwork.displayTitle || artwork.title}</h2>
          
          <div className="text-[12px] font-bold tracking-[0.2em] text-accent flex flex-wrap gap-x-8 gap-y-2 justify-center items-center uppercase">
            {artwork.year && (
              <>
                <span>{artwork.year}</span>
                <span className="w-1 h-1 rounded-full bg-accent/30" />
              </>
            )}
            <span>{artwork.medium || 'Olieverf op doek'}</span>
          </div>

          <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
            {artwork.description || 'Ontdek de essentie van licht en ruimte in dit meesterlijke werk van Thijs Sterk.'}
          </p>

          <div className="pt-8">
             <Link 
              href={backLink}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-accent hover:opacity-60 transition-opacity border-b border-accent/20 pb-1"
             >
               Terug naar de collectie
             </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
