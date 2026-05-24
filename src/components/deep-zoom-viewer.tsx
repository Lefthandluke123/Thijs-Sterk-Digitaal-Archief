
"use client";

import React from 'react';
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

/**
 * @fileOverview Vereenvoudigde museum-viewer voor kunstwerken.
 * Vervangt de complexe Deep Zoom engine voor maximale stabiliteit en perfecte centrering.
 */
export const DeepZoomViewer = React.forwardRef<DeepZoomHandle, DeepZoomViewerProps>(
  ({ imageUrl, title, brightness = 1, className }, ref) => {
    
    // Behoud de interface voor compatibiliteit met bestaande componenten
    React.useImperativeHandle(ref, () => ({
      startReveal: () => {
        // De simpele viewer heeft geen complexe reveal animatie nodig
      }
    }));

    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-black/5 p-4 md:p-12", className)}>
        <img 
          src={imageUrl} 
          alt={title}
          className="max-w-full max-h-full object-contain shadow-[0_50px_100px_-30px_rgba(0,0,0,0.5)] transition-all duration-1000 hover:scale-[1.01] animate-in fade-in zoom-in-95"
          style={{ filter: `brightness(${brightness})` }}
        />
      </div>
    );
  }
);

DeepZoomViewer.displayName = "DeepZoomViewer";
