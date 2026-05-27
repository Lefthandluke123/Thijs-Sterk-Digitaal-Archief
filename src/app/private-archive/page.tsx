
"use client";

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { ArchiveClient } from './archive-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Lock, 
  Loader2, 
  UserPlus, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AuthModal } from '@/components/auth-modal';
import Head from 'next/head';

/**
 * @fileOverview Privé-Archief Toegangspoort.
 * Bevat de auth gate en de metadata om indexering te voorkomen.
 */
export default function PrivateArchivePage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth || isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f4f4f2]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      {/* Privacy Guard: Geen indexering voor privéfoto's */}
      <head>
        <meta name="robots" content="noindex,nofollow" />
      </head>

      {!user ? (
        <main className="min-h-screen bg-[#f4f4f2] pt-48 pb-32 px-6 flex flex-col items-center">
          <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
             <div className="space-y-6">
                <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto border border-accent/10">
                   <Lock className="w-8 h-8 text-accent/40" />
                </div>
                <h1 className="font-headline text-4xl md:text-5xl font-light italic">Het <span className="text-accent">Privé</span> Archief</h1>
                <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md mx-auto">
                   Dit gedeelte van het archief bevat persoonlijke herinneringen, foto's uit het atelier en momenten met familie. Deze zijn alleen toegankelijk voor Vrienden van het Museum.
                </p>
             </div>

             <Card className="p-10 rounded-[3rem] bg-white shadow-2xl border-none space-y-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-accent/[0.02] pointer-events-none" />
                <div className="relative z-10 space-y-6">
                   <h3 className="font-headline text-2xl italic">Toegang voor Vrienden</h3>
                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        onClick={() => setAuthModalOpen(true)}
                        className="h-16 px-10 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-all"
                      >
                         <UserPlus className="w-4 h-4 mr-3" /> Word Vriend / Log in
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="h-16 px-10 rounded-2xl border-black/5 bg-black/5 font-black uppercase tracking-widest text-[11px]"
                      >
                         {isLoggingIn ? <Loader2 className="animate-spin w-4 h-4 mr-3" /> : <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-3 opacity-60" alt="" />}
                         Snel met Google
                      </Button>
                   </div>
                </div>
                <div className="pt-6 border-t border-black/5 flex items-center justify-center gap-3">
                   <ShieldCheck className="w-4 h-4 text-accent/30" />
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Veilig verbonden via de Erven Thijs Sterk</span>
                </div>
             </Card>

             <div className="pt-12 animate-pulse">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent opacity-20 italic">
                   Verstilde herinneringen achter de schermen
                </p>
             </div>
          </div>

          <AuthModal 
            isOpen={authModalOpen} 
            onOpenChange={setAuthModalOpen} 
            onLogin={handleGoogleLogin} 
            isLoggingIn={isLoggingIn}
          />
        </main>
      ) : (
        <ArchiveClient />
      )}
    </>
  );
}
