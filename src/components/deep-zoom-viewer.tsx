"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview Verbeterde OpenSeadragon Viewer met robuuste event handling.
 * Fix: Zoom en pan werken nu consistent op alle apparaten.
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
        const OpenSeadragon = (OSDModule as any).default || OSDModule;

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
          gestureSettingsTouch: {
            scrollToZoom: true,
            pinchToZoom: true,
          },
          zoomPerClick: zoomFactor,       
          
          animationTime: 1.2,
          blendTime: 0.1,
          constrainDuringPan: true,
          visibilityRatio: 0.8,      
          minZoomImageRatio: 0.9,    
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 10,
          autoResize: true,
          preserveViewport: true,
          wrapHorizontal: false,
          wrapVertical: false,
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          if (viewerRef.current && viewerRef.current.viewport) {
            viewerRef.current.viewport.goHome(true);
          }
        });

        // Custom zoom-out logic bij ctrl/cmd click
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
          // Zorg dat het muiswiel niet de hele pagina scrollt als we boven de viewer zijn
          viewerRef.current.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
          }, { passive: false });
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
    <div className="relative w-full h-full bg-black/[0.01] overflow-hidden rounded-3xl shadow-[0_40px_100px_-15px_rgba(0,0,0,0.25)] border border-white/40">
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
