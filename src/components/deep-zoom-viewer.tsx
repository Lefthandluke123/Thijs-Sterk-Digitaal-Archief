
"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepZoomViewerProps {
  imageUrl: string;
  title: string;
  brightness?: number;
  className?: string;
  onRevealStart?: () => void;
  onRevealEnd?: () => void;
}

export interface DeepZoomHandle {
  startReveal: () => void;
}

export const DeepZoomViewer = forwardRef<DeepZoomHandle, DeepZoomViewerProps>(
  ({ imageUrl, title, brightness = 1, className, onRevealStart, onRevealEnd }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useImperativeHandle(ref, () => ({
    startReveal: () => {
      handleRevealAnimation();
    }
  }));

  const handleRevealAnimation = async () => {
    if (!osdRef.current || isAnimating) return;
    
    const viewport = osdRef.current.viewport;
    if (!viewport) return;

    setIsAnimating(true);
    onRevealStart?.();

    const homeZoom = viewport.getHomeZoom();
    const targetZoom = homeZoom * 10;
    
    viewport.zoomTo(targetZoom, viewport.getCenter(), false);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const originalAnimTime = osdRef.current.animationTime;
    osdRef.current.animationTime = 4.0;
    
    viewport.goHome(false);

    setTimeout(() => {
      osdRef.current.animationTime = originalAnimTime;
      setIsAnimating(false);
      onRevealEnd?.();
    }, 4500);
  };

  const handleToggleZoom = () => {
    if (!osdRef.current || isAnimating) return;
    
    const viewport = osdRef.current.viewport;
    if (!viewport) return;

    const currentZoom = viewport.getZoom();
    const homeZoom = viewport.getHomeZoom();
    
    if (currentZoom <= homeZoom * 1.5) {
      viewport.zoomTo(homeZoom * 5, viewport.getCenter(), false);
    } else {
      viewport.goHome(false);
    }
  };

  useEffect(() => {
    let osdInstance: any = null;

    const initOpenSeadragon = async () => {
      if (!viewerRef.current) return;

      try {
        const OpenSeadragon = (await import('openseadragon')).default;
        
        if (osdRef.current) {
          osdRef.current.destroy();
        }

        const isDzi = imageUrl.toLowerCase().endsWith('.dzi');
        
        osdInstance = OpenSeadragon({
          element: viewerRef.current,
          prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
          tileSources: isDzi ? imageUrl : {
            type: 'image',
            url: imageUrl,
            buildPyramid: true
          },
          animationTime: 1.5,
          blendTime: 0.1,
          constrainDuringPan: true,
          maxZoomPixelRatio: 3,
          minZoomLevel: 0.2,
          visibilityRatio: 1,
          zoomPerScroll: 2,
          showNavigationControl: false,
          showNavigator: true,
          navigatorPosition: "BOTTOM_RIGHT",
          navigatorAutoFade: true,
          autoResize: true,
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

        // CRITICAL: Centering must happen AFTER the viewer has processed the image dimensions
        osdInstance.addHandler('open', () => {
          console.log('[VIEWER DEBUG] Image opened:', title);
          setIsLoading(false);
          
          // Using requestAnimationFrame to ensure the browser has finished layout calculations
          requestAnimationFrame(() => {
            if (osdInstance.viewport) {
              console.log('[VIEWER DEBUG] Applying fit-to-screen centering');
              osdInstance.viewport.goHome(true);
              console.log('[VIEWER DEBUG] Viewport center now:', osdInstance.viewport.getCenter());
            }
          });

          const canvas = osdInstance.canvas as HTMLCanvasElement;
          if (canvas) {
            canvas.style.filter = `brightness(${brightness})`;
          }
        });

        osdInstance.addHandler('zoom', () => {
          const viewport = osdInstance.viewport;
          if (viewport) {
            const currentZoom = viewport.getZoom();
            const homeZoom = viewport.getHomeZoom();
            setIsZoomedIn(currentZoom > homeZoom * 1.5);
          }
        });

        osdInstance.addHandler('open-failed', (event: any) => {
          setIsLoading(false);
          console.error("[VIEWER DEBUG] OpenSeadragon failed to load image:", event);
        });
      } catch (error) {
        console.error("[VIEWER DEBUG] Error initializing OpenSeadragon:", error);
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
  }, [imageUrl, brightness, title]);

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden group", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[150] bg-black/40 backdrop-blur-md">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
        </div>
      )}
      
      <div 
        ref={viewerRef} 
        className="w-full h-full cursor-crosshair block"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={`Deep Zoom viewer voor ${title}`}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .navigator {
          border: 1px solid rgba(255,255,255,0.1) !important;
          background-color: rgba(0,0,0,0.4) !important;
          margin: 30px !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .displayregion {
          border: 2px solid #d4af37 !important;
        }
      `}} />

      <div className="absolute top-8 left-8 flex flex-col gap-4 md:gap-6 z-[160] pointer-events-none">
        <div className={cn("bg-black/60 backdrop-blur-xl border border-white/10 p-3 md:p-5 rounded-2xl shadow-2xl pointer-events-auto transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-1">Collectie Thijs Sterk</p>
          <p className="text-white text-xs md:text-sm font-light italic truncate max-w-[180px] md:max-w-[240px]">{title}</p>
        </div>

        <button 
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            handleToggleZoom(); 
          }}
          className={cn("w-14 h-14 md:w-20 md:h-20 bg-accent hover:bg-accent/90 text-accent-foreground rounded-2xl md:rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-2 border-white/20 transition-all hover:scale-110 active:scale-90 pointer-events-auto group/zoom", isAnimating && "opacity-0 pointer-events-none")}
          title={isZoomedIn ? "Terug naar overzicht (-)" : "Zoom in op details (+)"}
        >
          {isZoomedIn ? (
            <ZoomOut className="w-7 h-7 md:w-10 md:h-10 transition-transform group-hover/zoom:scale-110" />
          ) : (
            <ZoomIn className="w-7 h-7 md:text-10 md:h-10 transition-transform group-hover/zoom:scale-110" />
          )}
        </button>
      </div>

      <div className="absolute bottom-8 left-8 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Scroll of dubbelklik voor vrije zoom</p>
      </div>
    </div>
  );
}
);

DeepZoomViewer.displayName = "DeepZoomViewer";
