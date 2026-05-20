"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeepZoomViewer } from './deep-zoom-viewer';

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [showMetadata, setShowMetadata] = useState(true);

  useEffect(() => {
    if (!artwork) {
      setShowMetadata(true);
    }
  }, [artwork]);

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-black border-none rounded-none overflow-hidden outline-none shadow-none fixed inset-0 translate-x-0 translate-y-0 left-0 top-0 z-[100]">
        <DialogTitle className="sr-only">Deep Zoom Artwork Viewer</DialogTitle>
        
        {/* Main Deep Zoom Area */}
        <div className="relative flex-1 bg-black overflow-hidden">
          {artwork && (
            <DeepZoomViewer 
              imageUrl={artwork.imageUrl} 
              title={artwork.displayTitle || artwork.title} 
              brightness={artwork.brightness}
            />
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-20">
            {onPrev && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPrev(); }} 
                className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn"
                title="Vorige (Pijltje links)"
              >
                <ChevronLeft className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            )}
            {onNext && (
              <button 
                onClick={(e) => { e.stopPropagation(); onNext(); }} 
                className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn"
                title="Volgende (Pijltje rechts)"
              >
                <ChevronRight className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Close & Info Buttons */}
          <div className="absolute top-8 right-8 z-[110] flex items-center gap-4">
             <button 
               onClick={() => setShowMetadata(!showMetadata)}
               className={cn(
                 "p-3 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl",
                 showMetadata ? "bg-accent text-accent-foreground" : "bg-black/40 text-white hover:bg-black/60"
               )}
               title="Toon informatie"
             >
               <Info className="w-6 h-6" />
             </button>
             <DialogClose 
               className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-destructive hover:text-white transition-all shadow-2xl border border-white/10" 
             >
               <X className="w-6 h-6 opacity-60" />
             </DialogClose>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className={cn(
          "w-full bg-background/95 backdrop-blur-md border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-700 ease-in-out",
          showMetadata ? "h-[15vh] opacity-100 py-6 px-12" : "h-0 opacity-0 pointer-events-none py-0 px-0"
        )}>
          <div className="max-w-4xl mx-auto space-y-2">
            <h2 className="text-xl md:text-2xl font-headline font-light italic text-foreground tracking-tight">
              {artwork?.displayTitle || artwork?.title}
            </h2>
            <div className="text-[12px] md:text-[14px] font-bold tracking-[0.1em] text-accent flex flex-wrap gap-x-6 gap-y-2 justify-center items-center">
              <span className="uppercase opacity-70">Zaal: {artwork?.series}</span>
              <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span className="italic">{artwork?.year || 'Jaartal onbekend'}</span>
              {artwork?.dimensions && (
                <>
                  <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
                  <span>{artwork?.dimensions}</span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span className="uppercase tracking-widest">{artwork?.medium}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
