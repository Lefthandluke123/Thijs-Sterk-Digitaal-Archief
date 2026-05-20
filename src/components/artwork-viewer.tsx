"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3.0);
  const [isOverUI, setIsOverUI] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!artwork) {
      setIsFullScreen(false);
      setShowMagnifier(false);
      setIsOverUI(false);
    }
  }, [artwork]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!showMagnifier || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    
    // Bereken positie relatief aan de afbeelding (0-100%)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMagnifierPos({ 
      x, 
      y, 
      mouseX: e.clientX, 
      mouseY: e.clientY 
    });
  };

  const handleToggleFullScreen = (e: React.MouseEvent) => {
    if (showMagnifier) return;
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-black border-none rounded-none overflow-hidden outline-none shadow-none fixed inset-0 translate-x-0 translate-y-0 left-0 top-0">
        <DialogTitle className="sr-only">Artwork Viewer</DialogTitle>
        
        <div 
          className={cn(
            "relative w-full flex items-center justify-center overflow-hidden bg-black group transition-all duration-500",
            isFullScreen ? "h-[100vh]" : "h-[88vh]",
            showMagnifier ? (isOverUI ? "cursor-default" : "cursor-none") : "cursor-pointer"
          )}
          onClick={handleToggleFullScreen}
          onMouseMove={handleMouseMove}
        >
          {artwork && (
            <img 
              ref={imgRef}
              src={artwork.imageUrl} 
              alt={artwork.displayTitle || artwork.title} 
              className="w-full h-full object-contain transition-all duration-700 pointer-events-none" 
              style={{ 
                clipPath: artwork.cropTop !== undefined ? `inset(${artwork.cropTop || 0}% ${artwork.cropRight || 0}% ${artwork.cropBottom || 0}% ${artwork.cropLeft || 0}%)` : undefined, 
                filter: `brightness(${artwork.brightness || 1})` 
              }} 
            />
          )}

          {showMagnifier && artwork && !isOverUI && (
            <div 
              className="fixed pointer-events-none border-4 border-white shadow-[0_0_60px_rgba(0,0,0,0.4)] rounded-full z-[100] overflow-hidden bg-background"
              style={{
                width: '350px',
                height: '350px',
                left: `${magnifierPos.mouseX - 175}px`,
                top: `${magnifierPos.mouseY - 175}px`,
                backgroundImage: `url(${artwork.imageUrl})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${zoomLevel * 100}% auto`,
                backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
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
            className="absolute top-8 right-8 z-[110] flex items-center gap-4"
            onMouseEnter={() => setIsOverUI(true)}
            onMouseLeave={() => setIsOverUI(false)}
            onMouseMove={(e) => e.stopPropagation()}
          >
             <div 
              className="flex items-center gap-2 bg-black/40 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
             >
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={(e) => { e.stopPropagation(); setShowMagnifier(!showMagnifier); }}
                 className={cn("h-10 w-10 rounded-full transition-all text-white hover:bg-white/20", showMagnifier && "bg-accent text-accent-foreground hover:bg-accent/80")}
               >
                 <Search className="w-5 h-5" />
               </Button>
               {showMagnifier && (
                 <div className="flex items-center gap-3 px-4 w-48 animate-in fade-in slide-in-from-right-4 duration-300">
                   <ZoomOut className="w-3 h-3 text-white/40" />
                   <Slider 
                    value={[zoomLevel]} 
                    min={1.5} 
                    max={10} 
                    step={0.1} 
                    onValueChange={([val]) => setZoomLevel(val)} 
                    className="flex-1"
                   />
                   <ZoomIn className="w-3 h-3 text-white/40" />
                 </div>
               )}
             </div>
             
             <DialogClose 
               className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-accent hover:text-accent-foreground transition-all shadow-2xl border border-white/10" 
               onClick={(e) => e.stopPropagation()}
             >
               <X className="w-6 h-6 opacity-60" />
             </DialogClose>
          </div>
        </div>

        <div className={cn(
          "w-full bg-background/95 backdrop-blur-md py-4 px-12 border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-500",
          isFullScreen ? "h-0 opacity-0 pointer-events-none py-0 px-0" : "h-[12vh] opacity-100"
        )}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-[9px] md:text-[10px] font-black tracking-[0.4em] uppercase text-foreground/40 mb-2">{artwork?.displayTitle || artwork?.title}</h2>
            <div className="text-[10px] md:text-[12px] uppercase font-black tracking-[0.3em] text-accent flex flex-wrap gap-x-8 gap-y-2 justify-center items-center">
              <span className="opacity-80">Zaal: {artwork?.series}</span>
              <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{artwork?.year || 'Onbekend'}</span>
              {artwork?.dimensions && (
                <>
                  <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
                  <span>{artwork?.dimensions}</span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{artwork?.medium}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}