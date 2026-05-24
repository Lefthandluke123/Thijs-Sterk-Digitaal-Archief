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

/**
 * @fileOverview Stabiele OpenSeadragon Deep Zoom viewer.
 * SSR-safe door dynamische import van OpenSeadragon binnen useEffect.
 */
export const DeepZoomViewer: React.FC<DeepZoomViewerProps> = ({ 
  imageUrl, 
  title, 
  brightness = 1, 
  className 
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Alleen uitvoeren in de browser
    if (typeof window === 'undefined' || !viewerRef.current || !imageUrl) return;

    let viewerInstance: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const initOSD = async () => {
      try {
        // Dynamisch laden van OpenSeadragon om SSR "document is not defined" te voorkomen
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = OSDModule.default;

        if (!viewerRef.current) return;

        viewerInstance = OpenSeadragon({
          element: viewerRef.current,
          prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
          tileSources: {
            type: 'image',
            url: imageUrl,
          },
          showNavigationControl: false,
          gestureSettingsMouse: {
            scrollToZoom: true,
            clickToZoom: true,
            dblClickToZoom: true,
          },
          animationTime: 1.5,
          blendTime: 0.5,
          constrainDuringPan: true,
          visibilityRatio: 1,
          minZoomImageRatio: 1,
          defaultZoomLevel: 0,
        });

        viewerInstance.addHandler('open', () => {
          setLoading(false);
          requestAnimationFrame(() => {
            if (viewerInstance && viewerInstance.viewport) {
              viewerInstance.viewport.goHome(true);
              console.log(`[DEEP ZOOM] Initialized and Centered: ${title}`);
            }
          });
        });

        // Resize Observer om centrering te behouden bij vensterwijzigingen
        resizeObserver = new ResizeObserver(() => {
          if (viewerInstance && viewerInstance.viewport) {
            viewerInstance.viewport.goHome(true);
          }
        });
        resizeObserver.observe(viewerRef.current);

      } catch (err) {
        console.error('[DEEP ZOOM] Error initializing OpenSeadragon:', err);
      }
    };

    initOSD();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (viewerInstance) {
        viewerInstance.destroy();
        viewerInstance = null;
      }
    };
  }, [imageUrl, title]);

  return (
    <div className={cn("relative w-full h-full bg-black/5 overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/20 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-accent/40" />
        </div>
      )}
      <div 
        ref={viewerRef} 
        className="w-full h-full" 
        style={{ 
          filter: `brightness(${brightness})`,
          display: 'block' 
        }} 
      />
    </div>
  );
};
