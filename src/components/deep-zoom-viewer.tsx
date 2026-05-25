"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview Verfijnde OpenSeadragon Viewer voor Stap 3.
 * Fix: Herstelt het verschuiven naar rechts door striktere viewport centering en constraints.
 */
export const DeepZoomViewer: React.FC<DeepZoomViewerProps> = ({ 
  imageUrl, 
  brightness = 1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isZoomOutMode, setIsZoomOutMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setIsZoomOutMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) setIsZoomOutMode(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    window.addEventListener('blur', () => setIsZoomOutMode(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !imageUrl) return;

    const initOSD = async () => {
      try {
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = OSDModule.default;

        if (!containerRef.current) return;

        if (viewerRef.current) {
          viewerRef.current.destroy();
        }

        const zoomFactor = 2.5;

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
          zoomPerClick: zoomFactor,       
          
          animationTime: 1.5,
          blendTime: 0.2,
          constrainDuringPan: true,
          visibilityRatio: 1.0,      // Fix: Strikter zichtbaar gebied
          minZoomImageRatio: 1.0,    // Fix: Voorkomt 'floating' buiten beeld
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 12,
          autoResize: true,
          preserveViewport: true,    // Fix: Behoud centrering bij resize
          wrapHorizontal: false,
          wrapVertical: false,
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          // Forceer centrering na openen
          if (viewerRef.current && viewerRef.current.viewport) {
            viewerRef.current.viewport.goHome(true);
          }
        });

        viewerRef.current.addHandler('canvas-click', (event: any) => {
          if (event.originalEvent.metaKey || event.originalEvent.ctrlKey) {
            event.preventDefaultAction = true;
            const viewport = viewerRef.current.viewport;
            const currentZoom = viewport.getZoom();
            viewport.zoomTo(currentZoom / zoomFactor, event.position);
            viewport.applyConstraints();
          }
        });

        if (viewerRef.current.canvas) {
          viewerRef.current.canvas.style.cursor = "zoom-in";
        }

      } catch (err) {
        console.error('[DEEP ZOOM] Error:', err);
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

  useEffect(() => {
    if (viewerRef.current && viewerRef.current.canvas) {
      viewerRef.current.canvas.style.cursor = isZoomOutMode ? "zoom-out" : "zoom-in";
    }
  }, [isZoomOutMode]);

  return (
    <div className="relative w-full h-full bg-black/[0.02] overflow-hidden rounded-3xl shadow-[0_40px_100px_-15px_rgba(0,0,0,0.25)] border border-white/40">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/20 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 animate-spin text-accent/30" />
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
