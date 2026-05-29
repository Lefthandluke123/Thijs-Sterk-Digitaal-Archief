"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock, Zap } from 'lucide-react';

/**
 * @fileOverview Centrale inlogpagina voor de beheeromgeving.
 */
export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast({ 
          title: "Toegang verleend", 
          description: "Welkom in de beheeromgeving." 
        });
        // Gebruik replace en forceer een refresh om de middleware de nieuwe cookie te laten zien
        window.location.replace('/admin');
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
    <main className="min-h-screen bg-[#f4f4f2] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Atmosferische achtergrond texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

      <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in zoom-in duration-700 bg-white/80 backdrop-blur-xl border-none relative z-10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline text-3xl italic">Museum <span className="text-accent">Beheer</span></h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Het Digitale Retrospectief</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Wachtwoord</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="h-14 rounded-2xl text-center bg-black/5 border-none text-xl focus:ring-accent" 
              placeholder="••••••"
              autoFocus
              required
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Ontgrendel Archief"}
          </Button>
        </form>

        <div className="pt-6 border-t border-black/5 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">
            Beveiligde toegang voor de Erven Thijs Sterk
          </p>
        </div>
      </Card>
    </main>
  );
}
