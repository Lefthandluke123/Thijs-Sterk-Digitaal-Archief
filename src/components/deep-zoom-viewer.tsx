"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview Stabiele OpenSeadragon Deep Zoom viewer.
 * Voorkomt SSR fouten door dynamische import in useEffect.
 */
export const DeepZoomViewer: React.FC<DeepZoomViewerProps> = ({ 
  imageUrl, 
  brightness = 1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !imageUrl) return;

    const initOSD = async () => {
      try {
        // Dynamisch laden om SSR ReferenceError: document is not defined te voorkomen
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = OSDModule.default;

        if (!containerRef.current) return;

        if (viewerRef.current) {
          viewerRef.current.destroy();
        }

        viewerRef.current = OpenSeadragon({
          element: containerRef.current,
          prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
          tileSources: {
            type: 'image',
            url: imageUrl,
            buildPyramid: true
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

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          // 🔥 Kritiek: Her-centreren zodra de afbeelding geladen is
          requestAnimationFrame(() => {
            if (viewerRef.current && viewerRef.current.viewport) {
              viewerRef.current.viewport.goHome(true);
            }
          });
        });

      } catch (err) {
        console.error('[DEEP ZOOM] Initialization failed:', err);
      }
    };

    initOSD();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div className="relative w-full h-full bg-black/5 overflow-hidden rounded-2xl shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/20 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-accent/40" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full h-full" 
        style={{ 
          filter: `brightness(${brightness})`,
          display: 'block' 
        }} 
      />
    </div>
  );
};
