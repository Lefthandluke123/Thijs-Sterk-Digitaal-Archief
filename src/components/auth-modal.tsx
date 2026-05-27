
"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
  isLoggingIn: boolean;
}

/**
 * @fileOverview AuthModal: De centrale toegangspoort voor "Vrienden van het Museum".
 * Wordt getoond wanneer een gebruiker een actie probeert te doen die login vereist.
 */
export function AuthModal({ isOpen, onOpenChange, onLogin, isLoggingIn }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-2xl">
        <DialogHeader className="text-center space-y-6">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="font-headline text-3xl italic">Word Vriend</DialogTitle>
            <DialogDescription className="text-base font-light leading-relaxed">
              Om bij te dragen aan de community of uw persoonlijke exposities te bewaren, heeft u een vriend-account nodig.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="pt-8">
          <Button 
            onClick={onLogin} 
            disabled={isLoggingIn}
            className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all group"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
            ) : (
              <LogIn className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform" />
            )}
            Inloggen met Google
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-black/5 text-center">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
             Veilig verbonden via Firebase Auth
           </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
