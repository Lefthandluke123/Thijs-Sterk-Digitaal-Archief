"use client";

import React from 'react';
import Link from 'next/link';
import { CircleX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderCancelPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 pt-32">
      <div className="max-w-md w-full bg-white/50 backdrop-blur-xl border-2 border-red-500/10 p-12 rounded-[3rem] shadow-2xl text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <CircleX className="w-12 h-12 text-red-400" />
        </div>
        <div className="space-y-4">
          <h1 className="font-headline text-3xl font-light">Betaling afgebroken</h1>
          <p className="text-muted-foreground leading-relaxed">
            De betaling is niet voltooid. Geen zorgen, er is niets afgeschreven. U kunt het altijd opnieuw proberen of contact met ons opnemen als er iets misging.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full h-14 px-12 uppercase tracking-widest font-black text-[11px] border-2">
          <Link href="/shop">
            <ArrowLeft className="w-4 h-4 mr-3" /> Terug naar de Winkel
          </Link>
        </Button>
      </div>
    </main>
  );
}