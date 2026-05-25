"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview DeepZoomViewer component met OpenSeadragon.
 * Geoptimaliseerd voor een 'contain' startpositie (geen ongewenste zoom bij start).
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
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = (OSDModule as any).default || OSDModule;

        // Vernietig vorige instantie volledig om state-leakage te voorkomen
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        setLoading(true);

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
          gestureSettingsTouch: {
            scrollToZoom: true,
            pinchToZoom: true,
          },
          animationTime: 0.8, // Sneller maar nog steeds vloeiend
          blendTime: 0.1,
          constrainDuringPan: true,
          visibilityRatio: 1.0,
          minZoomImageRatio: 1.0,
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 10,
          autoResize: true,
          preserveViewport: false, // CRUCIAAL: reset viewport state bij nieuwe image
          homeFillsViewer: false,   // CRUCIAAL: start 'contain', niet 'cover' (voorkomt inzoomen bij start)
          centerImageOnce: true
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          // Forceer neutrale schaal en positie na openen
          if (viewerRef.current && viewerRef.current.viewport) {
            viewerRef.current.viewport.goHome(true);
          }
        });

      } catch (err) {
        console.error('[DEEP ZOOM] Error:', err);
      }
    };

    // Gebruik een kleine timeout om te zorgen dat de container-afmetingen stabiel zijn
    const timer = setTimeout(initOSD, 50);

    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden rounded-3xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/20 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 animate-spin text-accent/30" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="w-full h-full outline-none" 
        style={{ 
          filter: `brightness(${brightness})`,
          display: 'block',
          transform: 'none' // Zorg dat er geen residual CSS transforms zijn
        }} 
      />
    </div>
  );
};