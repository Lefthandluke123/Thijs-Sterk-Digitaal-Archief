"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview StartupCurtain: Maskeert de "techniek" en het framework tijdens de initiële hydratatie.
 * Zorgt voor een serene, museale binnenkomst.
 * 
 * FIX: Waarden gestabiliseerd om hydration mismatches te voorkomen.
 */
export function StartupCurtain() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Geef de app ruim de tijd om de eerste verfbeurt en hydratatie af te ronden
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1200);

    // Verwijder het element volledig uit de DOM na de animatie om interactie niet te blokkeren
    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  // We renderen ALTIJD de initiële staat op de server en tijdens de eerste client-render
  // om hydration mismatches in de classNames en structuur te voorkomen.
  if (!shouldRender) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-[#f4f4f2] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out pointer-events-auto",
        // Z-index extreem hoog om alles (ook nav) te bedekken
        "z-[9999999]",
        // De overgang naar onzichtbaar gebeurt alleen na montage
        (!mounted || isVisible) ? "opacity-100" : "opacity-0 scale-105 pointer-events-none"
      )}
    >
      <div className="relative flex flex-col items-center gap-8 animate-pulse">
        <img 
          src="/logo.png" 
          alt="Thijs Sterk" 
          className="h-24 md:h-32 w-auto opacity-30 grayscale"
        />
        <div className="flex flex-col items-center text-center gap-3">
           <span className="text-[10px] font-black uppercase tracking-[0.6em] text-accent opacity-30">
             Het Digitale Retrospectief
           </span>
           <div className="w-16 h-[1px] bg-accent/20" />
        </div>
      </div>
      
      {/* Subtiele textuur om het minder 'digitaal' te maken */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" 
        aria-hidden="true"
      />
    </div>
  );
}
