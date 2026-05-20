
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isOverUI, setIsOverUI] = useState(false);

  useEffect(() => {
    if (!artwork) {
      setIsFullScreen(false);
      setIsOverUI(false);
    }
  }, [artwork]);

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-black border-none rounded-none overflow-hidden outline-none shadow-none fixed inset-0 translate-x-0 translate-y-0 left-0 top-0">
        <DialogTitle className="sr-only">Artwork Viewer</DialogTitle>
        
        <div 
          className={cn(
            "relative w-full flex items-center justify-center overflow-hidden bg-black group transition-all duration-500",
            isFullScreen ? "h-[100vh]" : "h-[85vh]",
            "cursor-pointer"
          )}
          onClick={handleToggleFullScreen}
        >
          {artwork && (
            <img 
              src={artwork.imageUrl} 
              alt={artwork.displayTitle || artwork.title} 
              className="w-full h-full object-contain transition-all duration-700 pointer-events-none" 
              style={{ 
                clipPath: artwork.cropTop !== undefined ? `inset(${artwork.cropTop || 0}% ${artwork.cropRight || 0}% ${artwork.cropBottom || 0}% ${artwork.cropLeft || 0}%)` : undefined, 
                filter: `brightness(${artwork.brightness || 1})` 
              }} 
            />
          )}

          <div 
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
            onMouseEnter={() => setIsOverUI(true)}
            onMouseLeave={() => setIsOverUI(false)}
          >
            {onPrev && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPrev(); }} 
                className="p-4 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-xl border border-white/10"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}
            {onNext && (
              <button 
                onClick={(e) => { e.stopPropagation(); onNext(); }} 
                className="p-4 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-xl border border-white/10"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}
          </div>

          <div 
            className="absolute top-8 right-8 z-[110]"
            onMouseEnter={() => setIsOverUI(true)}
            onMouseLeave={() => setIsOverUI(false)}
          >
             <DialogClose 
               className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-accent hover:text-accent-foreground transition-all shadow-2xl border border-white/10" 
               onClick={(e) => e.stopPropagation()}
             >
               <X className="w-6 h-6 opacity-60" />
             </DialogClose>
          </div>
        </div>

        <div className={cn(
          "w-full bg-background/95 backdrop-blur-md py-6 px-12 border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-500",
          isFullScreen ? "h-0 opacity-0 pointer-events-none py-0 px-0" : "h-[15vh] opacity-100"
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
