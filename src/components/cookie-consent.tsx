
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookie-consent');
    if (!accepted) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-[320px] w-full animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-background/95 backdrop-blur-2xl border-2 border-accent/20 p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto grayscale opacity-80" />
          <button onClick={() => setShow(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Privacy & Cookies</h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed">
            Deze site gebruikt cookies om uw ervaring te verbeteren. Doorgaan op de site is accepteren.
          </p>
        </div>
        <Button 
          onClick={accept} 
          className="w-full rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-[0.2em] text-[10px] h-12 border-2 border-black/10"
        >
          Ik begrijp het
        </Button>
      </div>
    </div>
  );
}
