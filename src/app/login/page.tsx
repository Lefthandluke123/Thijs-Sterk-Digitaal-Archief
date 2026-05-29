"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function LoginContent() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast({ 
          title: "Toegang verleend", 
          description: "Welkom in de beheeromgeving." 
        });
        // Gebruik window.location.replace voor een volledige refresh zodat de middleware de cookie ziet
        window.location.replace(from);
      } else {
        toast({ 
          variant: "destructive", 
          title: "Toegang geweigerd", 
          description: "Wachtwoord onjuist." 
        });
        setIsLoading(false);
      }
    } catch (err) {
      toast({ 
        variant: "destructive", 
        title: "Fout", 
        description: "Kon geen verbinding maken met de server." 
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f4f2] flex flex-col items-center justify-center p-6 relative">
      {/* Atmosferische achtergrond texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

      <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-10 relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto border border-accent/10">
            <Lock className="w-8 h-8 text-accent/40" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline text-3xl italic">Archief <span className="text-accent">Beheer</span></h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Het Digitale Retrospectief</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="h-16 rounded-2xl text-center bg-black/5 border-none text-2xl tracking-[0.5em] focus:ring-accent" 
              placeholder="••••"
              autoFocus
              required
            />
            <p className="text-center text-[9px] font-bold uppercase tracking-widest opacity-20">Voer de toegangscode in</p>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>Ontgrendelen <ArrowRight className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        </form>

        <div className="pt-8 border-t border-black/5 flex items-center justify-center gap-3">
          <ShieldCheck className="w-4 h-4 text-accent/30" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">Beveiligde Toegang</span>
        </div>
      </Card>
      
      <div className="mt-12 text-center opacity-20 pointer-events-none">
         <img src="/logo.png" alt="Logo" className="h-16 w-auto grayscale mb-4 mx-auto" />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#f4f4f2]"><Loader2 className="animate-spin text-accent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
