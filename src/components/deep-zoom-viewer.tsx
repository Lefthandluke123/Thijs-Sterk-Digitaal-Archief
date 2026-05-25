"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepZoomViewerProps {
  imageUrl: string;
  title?: string;
  brightness?: number;
}

/**
 * @fileOverview DeepZoomViewer component met OpenSeadragon.
 * GEZALVDE VERSIE - NIET REFACTOREREN ZONDER VALIDATIE.
 * 
 * INTERACTIE-FLOW:
 * 1. Default: cursor-zoom-in (plusje).
 * 2. Command/Ctrl ingedrukt: cursor-zoom-out (minnetje).
 * 3. Slepen (Drag): cursor-grabbing (handje).
 * 4. Klik: Inzoomen op cursor.
 * 5. Command/Ctrl + Klik: Uitzoomen (factor 2).
 * 
 * ARCHITECTUUR:
 * - Gebruikt OpenSeadragon canvas binnen een geforceerde cursor-container.
 * - homeFillsViewer: false garandeert 'fit-to-screen' start.
 * - pointer-events op parent containers moeten op 'none' staan om dit canvas te bereiken.
 */
export const DeepZoomViewer: React.FC<DeepZoomViewerProps> = ({ 
  imageUrl, 
  brightness = 1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isZoomOutMode, setIsZoomOutMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Luister naar Command/Ctrl toets voor dynamische cursor feedback
  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      setIsZoomOutMode(isCmdOrCtrl);
    };

    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    window.addEventListener('blur', () => setIsZoomOutMode(false));

    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
      window.removeEventListener('blur', () => setIsZoomOutMode(false));
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !imageUrl) return;

    const initOSD = async () => {
      try {
        const OSDModule = await import('openseadragon');
        const OpenSeadragon = (OSDModule as any).default || OSDModule;

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
          homeFillsViewer: false, 
          visibilityRatio: 1.0,
          constrainDuringPan: true,
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 10,
          autoResize: true,
          preserveViewport: false,
          zoomInButton: undefined,
          zoomOutButton: undefined,
          homeButton: undefined,
          fullPageButton: undefined,
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          if (viewerRef.current && viewerRef.current.viewport) {
            viewerRef.current.viewport.goHome(true);
          }
        });

        // Detecteer slepen voor handje-cursor
        viewerRef.current.addHandler('canvas-drag', () => {
          setIsDragging(true);
        });
        viewerRef.current.addHandler('canvas-drag-end', () => {
          setIsDragging(false);
        });

        // Command + Klik om uit te zoomen met visuele feedback
        viewerRef.current.addHandler('canvas-click', (event: any) => {
          const isCmdOrCtrl = event.originalEvent.metaKey || event.originalEvent.ctrlKey;
          
          if (isCmdOrCtrl) {
            event.preventDefaultAction = true; 
            if (viewerRef.current && viewerRef.current.viewport) {
              const currentZoom = viewerRef.current.viewport.getZoom();
              viewerRef.current.viewport.zoomTo(currentZoom / 2);
            }
          }
        });

      } catch (err) {
        console.error('[DEEP ZOOM] Initialization Error:', err);
      }
    };

    const timer = setTimeout(initOSD, 100);

    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/10 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className={cn(
          "w-full h-full outline-none transition-all duration-200",
          isDragging
            ? "cursor-grabbing [&_canvas]:!cursor-grabbing"
            : isZoomOutMode 
              ? "cursor-zoom-out [&_canvas]:!cursor-zoom-out" 
              : "cursor-zoom-in [&_canvas]:!cursor-zoom-in",
          "[&_canvas]:!outline-none"
        )} 
        style={{ 
          filter: `brightness(${brightness})`,
          display: 'block'
        }} 
      />
    </div>
  );
};