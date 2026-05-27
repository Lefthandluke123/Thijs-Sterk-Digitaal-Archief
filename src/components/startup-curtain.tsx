
"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview StartupCurtain: Maskeert de "techniek" en het framework tijdens de initiële hydratatie.
 * Zorgt voor een serene, museale binnenkomst.
 */
export function StartupCurtain() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Geef de app even de tijd om de eerste verfbeurt en hydratatie af te ronden
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 800);

    // Verwijder het element volledig uit de DOM na de animatie om interactie niet te blokkeren
    const removeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[1000000] bg-[#f4f4f2] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out pointer-events-none",
        !isVisible ? "opacity-0 scale-105" : "opacity-100"
      )}
    >
      <div className="relative flex flex-col items-center gap-8 animate-pulse">
        <img 
          src="/logo.png" 
          alt="Thijs Sterk" 
          className="h-24 md:h-32 w-auto opacity-20 grayscale"
        />
        <div className="flex flex-col items-center text-center gap-2">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent opacity-20">
             Het Digitale Retrospectief
           </span>
           <div className="w-12 h-[1px] bg-accent/20" />
        </div>
      </div>
      
      {/* Subtiele textuur om het minder 'digitaal' te maken */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
    </div>
  );
}
