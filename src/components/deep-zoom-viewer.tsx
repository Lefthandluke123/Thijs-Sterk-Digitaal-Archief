
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Search, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DeepZoomViewerProps {
  imageUrl: string;
  title: string;
  brightness?: number;
  className?: string;
}

export function DeepZoomViewer({ imageUrl, title, brightness = 1, className }: DeepZoomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const toggleZoom = useCallback(() => {
    if (!osdRef.current) return;
    const viewport = osdRef.current.viewport;
    const currentZoom = viewport.getZoom();
    const homeZoom = viewport.getHomeZoom();
    
    // Als we dicht bij de "home" zoom zijn (volledig beeld), zoom dan 5x in.
    // Anders, ga terug naar home.
    if (currentZoom <= homeZoom * 1.2) {
      viewport.zoomTo(homeZoom * 5, null, false);
      setIsZoomedIn(true);
    } else {
      viewport.goHome(false);
      setIsZoomedIn(false);
    }
  }, []);

  useEffect(() => {
    let osdInstance: any = null;

    const initOpenSeadragon = async () => {
      if (!viewerRef.current) return;

      try {
        const OpenSeadragon = (await import('openseadragon')).default;
        const isDzi = imageUrl.toLowerCase().endsWith('.dzi');
        
        osdInstance = OpenSeadragon({
          element: viewerRef.current,
          prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
          tileSources: isDzi ? imageUrl : {
            type: 'image',
            url: imageUrl,
            buildPyramid: true
          },
          animationTime: 1.2,
          blendTime: 0.1,
          constrainDuringPan: true,
          maxZoomPixelRatio: 2,
          minZoomLevel: 0.5,
          visibilityRatio: 1,
          zoomPerScroll: 1.5,
          showNavigationControl: false,
          showNavigator: true,
          navigatorPosition: "BOTTOM_RIGHT",
          navigatorAutoFade: true,
          gestureSettingsMouse: {
            clickToZoom: true,
            dblClickToZoom: true,
            pinchToZoom: true,
            scrollToZoom: true
          },
          gestureSettingsTouch: {
            pinchToZoom: true,
            scrollToZoom: true,
            dblClickToZoom: true
          }
        });

        osdRef.current = osdInstance;

        osdInstance.addHandler('open', () => {
          setIsLoading(false);
          const canvas = osdInstance.canvas as HTMLCanvasElement;
          if (canvas) {
            canvas.style.filter = `brightness(${brightness})`;
          }
        });

        // Update de zoom-state als de gebruiker handmatig zoomt
        osdInstance.addHandler('zoom', () => {
          const viewport = osdInstance.viewport;
          const currentZoom = viewport.getZoom();
          const homeZoom = viewport.getHomeZoom();
          setIsZoomedIn(currentZoom > homeZoom * 1.2);
        });

        osdInstance.addHandler('open-failed', () => {
          setIsLoading(false);
          console.error("OpenSeadragon failed to load image");
        });
      } catch (error) {
        console.error("Error initializing OpenSeadragon:", error);
        setIsLoading(false);
      }
    };

    initOpenSeadragon();

    return () => {
      if (osdInstance) {
        osdInstance.destroy();
        osdRef.current = null;
      }
    };
  }, [imageUrl, brightness]);

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden group", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-accent/50" />
        </div>
      )}
      
      <div 
        ref={viewerRef} 
        className="w-full h-full cursor-crosshair"
        aria-label={`Deep Zoom viewer voor ${title}`}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .navigator {
          border: 1px solid rgba(255,255,255,0.1) !important;
          background-color: rgba(0,0,0,0.4) !important;
          margin: 20px !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }
        .displayregion {
          border: 1px solid #d4af37 !important;
        }
      `}} />

      {/* Custom Controls Overlay */}
      <div className="absolute top-8 left-8 flex flex-col gap-4 z-30">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl transition-all duration-500">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Collectie Thijs Sterk</p>
          <p className="text-white text-xs font-medium truncate max-w-[200px]">{title}</p>
        </div>

        {/* De nieuwe Toggle Zoom knop */}
        <button 
          onClick={toggleZoom}
          className="w-14 h-14 bg-accent/90 hover:bg-accent text-accent-foreground rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 transition-all hover:scale-105 active:scale-95 group/zoom"
          title={isZoomedIn ? "Terug naar overzicht" : "Zoom in op details (5x)"}
        >
          {isZoomedIn ? (
            <Minimize2 className="w-6 h-6 transition-transform group-hover/zoom:scale-110" />
          ) : (
            <Search className="w-6 h-6 transition-transform group-hover/zoom:scale-110" />
          )}
        </button>
      </div>

      {/* Touch/Mouse Hint bij hover */}
      <div className="absolute bottom-8 left-8 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Gebruik muiswiel of dubbelklik voor handmatige zoom</p>
      </div>
    </div>
  );
}
