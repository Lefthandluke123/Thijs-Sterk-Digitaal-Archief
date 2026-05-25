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
 * Geoptimaliseerd voor een schone state-reset, geforceerde cursor interactie
 * en Command+Klik ondersteuning voor uitzoomen.
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

        // Vernietig vorige instance volledig voor een schone start
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
          // Interactie instellingen
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
          // Sizing en Positionering (Cruciaal voor de 'niet te ver ingezoomd' fix)
          homeFillsViewer: false, 
          visibilityRatio: 1.0,
          constrainDuringPan: true,
          defaultZoomLevel: 0,
          minZoomLevel: 0.5,
          maxZoomLevel: 10,
          autoResize: true,
          preserveViewport: false,
          // Cursor fixes
          zoomInButton: undefined,
          zoomOutButton: undefined,
          homeButton: undefined,
          fullPageButton: undefined,
        });

        viewerRef.current.addHandler('open', () => {
          setLoading(false);
          // Forceer een schone 'fit' positie
          if (viewerRef.current && viewerRef.current.viewport) {
            viewerRef.current.viewport.goHome(true);
          }
        });

        // TOEVOEGING: Command + Klik om uit te zoomen
        viewerRef.current.addHandler('canvas-click', (event: any) => {
          const isCmdOrCtrl = event.originalEvent.metaKey || event.originalEvent.ctrlKey;
          
          if (isCmdOrCtrl) {
            event.preventDefaultAction = true; // Voorkom standaard zoom-in
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

    // Gebruik een kleine delay voor stabiele DOM-berekening
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
        className="w-full h-full outline-none cursor-zoom-in [&_canvas]:!cursor-zoom-in [&_canvas]:!outline-none" 
        style={{ 
          filter: `brightness(${brightness})`,
          display: 'block'
        }} 
      />
    </div>
  );
};