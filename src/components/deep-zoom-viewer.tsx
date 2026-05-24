
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview Stabiele OpenSeadragon Deep Zoom viewer met cursor-klik vergroting.
 * Nu met Command-klik (of Ctrl-klik) ondersteuning voor uitzoomen.
 */
export const DeepZoomViewer: React.FC<DeepZoomViewerProps> = ({ 
  imageUrl, 
  brightness = 1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isZoomOutMode, setIsZoomOutMode] = useState(false);

  // Monitor toetsenbord voor cursor-verandering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setIsZoomOutMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) setIsZoomOutMode(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    
    // Ook resetten als het venster focus verliest
    const handleBlur = () => setIsZoomOutMode(false);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !imageUrl) return;

    const initOSD = async () => {
      try {
        // Dynamisch laden om SSR ReferenceError te voorkomen
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = OSDModule.default;

        if (!containerRef.current) return;

        // Ruim vorige instance op
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
          
          animationTime: 1.2,
          blendTime: 0.1,
          constrainDuringPan: true,
          visibilityRatio: 1,
          minZoomImageRatio: 1,
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 12,        
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          // Forceer centrering direct na laden
          requestAnimationFrame(() => {
            if (viewerRef.current && viewerRef.current.viewport) {
              viewerRef.current.viewport.goHome(true);
            }
          });
        });

        // Custom click handler voor Command-Klik uitzoomen
        viewerRef.current.addHandler('canvas-click', (event: any) => {
          // Check of meta (Command op Mac) of ctrl is ingedrukt
          if (event.originalEvent.metaKey || event.originalEvent.ctrlKey) {
            // Stop de standaard zoom-in actie
            event.preventDefaultAction = true;
            
            const viewport = viewerRef.current.viewport;
            const currentZoom = viewport.getZoom();
            // Zoom uit met dezelfde factor
            viewport.zoomTo(currentZoom / zoomFactor, event.position);
            viewport.applyConstraints();
          }
        });

        // Initiële cursor
        if (viewerRef.current.canvas) {
          viewerRef.current.canvas.style.cursor = "zoom-in";
        }

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

  // Update de cursor live op basis van de toets-status
  useEffect(() => {
    if (viewerRef.current && viewerRef.current.canvas) {
      viewerRef.current.canvas.style.cursor = isZoomOutMode ? "zoom-out" : "zoom-in";
    }
  }, [isZoomOutMode]);

  return (
    <div className="relative w-full h-full bg-black/5 overflow-hidden rounded-2xl shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/10 backdrop-blur-sm">
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
