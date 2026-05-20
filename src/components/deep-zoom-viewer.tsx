"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepZoomViewerProps {
  imageUrl: string;
  title: string;
  brightness?: number;
  className?: string;
}

export function DeepZoomViewer({ imageUrl, title, brightness = 1, className }: DeepZoomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // OpenSeadragon alleen laden en initialiseren in de browser
    let osdInstance: any = null;

    const initOpenSeadragon = async () => {
      if (!viewerRef.current) return;

      try {
        // Dynamische import om SSR fouten te voorkomen
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

        osdInstance.addHandler('open', () => {
          setIsLoading(false);
          const canvas = osdInstance.canvas as HTMLCanvasElement;
          if (canvas) {
            canvas.style.filter = `brightness(${brightness})`;
          }
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

      {/* Navigator Styling via globale style tag (React safe) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .navigator {
          border: 1px solid rgba(255,255,255,0.1) !important;
          background-color: rgba(0,0,0,0.4) !important;
          margin: 20px !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }
        .displayregion {
          border: 1px solid #d4af37 !important; /* accent kleur fallback */
        }
      `}} />

      {/* Custom Controls Overlay */}
      <div className="absolute top-8 left-8 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl pointer-events-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Deep Zoom</p>
          <p className="text-white text-xs font-medium truncate max-w-[200px]">{title}</p>
        </div>
      </div>
    </div>
  );
}
