
"use client";

import React, { useEffect, useRef, useState } from 'react';

/**
 * @fileOverview MatrixEffect: Een digitale regen-animatie die de hele pagina overneemt.
 * Wordt getriggerd door de 'trigger-simulation' custom event.
 */
export function MatrixEffect() {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleTrigger = () => {
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

    // Canvas vullen
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
      drops[i] = Math.random() * -100; // Willekeurige startpositie boven het scherm
    }

    const draw = () => {
      // Donkere achtergrond met lichte transparantie voor trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0"; // Matrix Groen
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black overflow-hidden flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-8">
         <h2 className="text-green-500 font-mono text-4xl md:text-6xl tracking-[0.5em] animate-pulse text-center px-6">
            SYSTEM CRASHED
         </h2>
         <p className="text-green-500/40 font-mono text-xs md:text-sm uppercase tracking-widest text-center max-w-md px-10">
            Licht, ruimte en water zijn gedigitaliseerd. De retrospectieve simulatie is instabiel.
         </p>
      </div>

      <button 
        onClick={() => setActive(false)}
        className="absolute top-10 right-10 z-[1000000] border-2 border-green-500 text-green-500 px-8 py-3 rounded-full font-mono text-[10px] font-black uppercase tracking-[0.3em] hover:bg-green-500 hover:text-black transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
      >
        EXIT SIMULATION
      </button>
    </div>
  );
}
