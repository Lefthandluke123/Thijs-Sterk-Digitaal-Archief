"use client";

import React from 'react';
import Link from 'next/link';
import { CircleCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';

export default function OrderSuccessPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 pt-32">
      <div className="max-w-md w-full bg-white/50 backdrop-blur-xl border-2 border-green-500/20 p-12 rounded-[3rem] shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
          <CircleCheck className="w-12 h-12 text-green-500" />
        </div>
        <div className="space-y-4">
          <h1 className="font-headline text-4xl font-light italic">Betaald!</h1>
          <p className="text-muted-foreground leading-relaxed">
            Uw betaling is succesvol verwerkt. U ontvangt direct een bevestiging per e-mail met verdere details over de verzending van uw gecertificeerde print.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-4">
          <Button asChild className="rounded-full h-14 bg-accent text-accent-foreground font-black uppercase tracking-widest text-[11px]">
            <Link href="/shop">
              <ShoppingBag className="w-4 h-4 mr-3" /> Terug naar de Winkel
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full h-12 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
            <Link href="/exhibition">
              Naar de Tour <ArrowRight className="w-3 h-3 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}