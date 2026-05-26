
"use client";

import React, { useEffect, useRef, useState } from 'react';

/**
 * @fileOverview MatrixEffect: Een digitale regen-animatie die de hele pagina overneemt.
 * Bevat een 'tweetraps' exit-knop om de simulatie te verlaten met een artistieke waarschuwing.
 */
export function MatrixEffect() {
  const [active, setActive] = useState(false);
  const [colors, setColors] = useState<string[]>(["#0F0"]); // Default Matrix Groen
  const [exitStep, setExitStep] = useState(0); // 0: init, 1: confirm
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleTrigger = (e: any) => {
      if (e.detail?.colors && Array.isArray(e.detail.colors)) {
        setColors(e.detail.colors);
      } else {
        setColors(["#0F0"]); // Reset naar groen voor de logo-trigger
      }
      setExitStep(0); // Reset exit state
      setActive(true);
    };
    window.addEventListener('trigger-simulation', handleTrigger);
    return () => window.removeEventListener('trigger-simulation', handleTrigger);
  }, []);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const characters = "THIJSSTERKLICHTRUIMTEWATER01010182";
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        
        // Kies een willekeurige kleur uit het palet van het schilderij
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 40);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [active, colors]);

  const handleExitClick = () => {
    if (exitStep === 0) {
      setExitStep(1);
    } else {
      setActive(false);
      setExitStep(0);
    }
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black overflow-hidden flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-8">
         <h2 className="text-white font-mono text-4xl md:text-6xl tracking-[0.5em] animate-pulse text-center px-6 mix-blend-difference">
            {exitStep === 1 ? "INSTABILITEIT BEVESTIGD" : "SYSTEM CRASHED"}
         </h2>
         <div className="space-y-4 text-center max-w-md px-10">
            <p className="text-white/60 font-mono text-xs md:text-sm uppercase tracking-widest leading-relaxed">
               {exitStep === 1 
                 ? "Zou u dat nou wel doen?" 
                 : "De kleuren van Thijs Sterk vloeien weg in de code."}
            </p>
            <p className="text-white/20 font-mono text-[10px] uppercase tracking-[0.4em]">
               {exitStep === 1 
                 ? "Wilt u de artistieke werkelijkheid echt herstellen?" 
                 : "De artistieke simulatie is instabiel."}
            </p>
         </div>
      </div>

      <button 
        onClick={handleExitClick}
        className={`absolute top-10 right-10 z-[1000000] border-2 px-8 py-3 rounded-full font-mono text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] ${
          exitStep === 1 
          ? "bg-red-600 border-red-600 text-white animate-bounce" 
          : "border-white text-white hover:bg-white hover:text-black"
        }`}
      >
        {exitStep === 1 ? "BEVESTIG REDDING" : "RED VAN ONDERGANG"}
      </button>

      <div className="absolute bottom-10 left-10 text-white/10 font-mono text-[8px] uppercase tracking-[0.5em] pointer-events-none">
         Archief Error 1913-1982 // Protocol: Sterk_Atmosphere_Sync
      </div>
    </div>
  );
}
