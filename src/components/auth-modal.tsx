"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LogIn, 
  Loader2, 
  ShieldCheck, 
  Mail, 
  UserPlus, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification 
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void; // Dit blijft de Google login trigger
  isLoggingIn: boolean;
}

/**
 * @fileOverview Geoptimaliseerde AuthModal voor Vrienden.
 * Ondersteunt nu Google én E-mail (met verificatie en naam-opgave).
 */
export function AuthModal({ isOpen, onOpenChange, onLogin, isLoggingIn }: AuthModalProps) {
  const auth = useAuth();
  const [mode, setMode] = useState<'options' | 'email-login' | 'email-register'>('options');
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      if (mode === 'email-register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Direct de naam opslaan
        await updateProfile(userCredential.user, { displayName: name });
        // Verificatie mail sturen
        await sendEmailVerification(userCredential.user);
        
        toast({
          title: "Account aangemaakt!",
          description: "Controleer uw inbox voor de verificatiemail.",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Welkom terug!",
          description: "U bent nu ingelogd.",
        });
      }
      onOpenChange(false);
      // Reset form
      setMode('options');
      setEmail('');
      setPassword('');
      setName('');
    } catch (error: any) {
      let msg = "Er is een fout opgetreden.";
      if (error.code === 'auth/email-already-in-use') msg = "Dit e-mailadres is al bekend.";
      if (error.code === 'auth/wrong-password') msg = "Onjuist wachtwoord.";
      if (error.code === 'auth/user-not-found') msg = "Gebruiker niet gevonden.";
      
      toast({
        variant: "destructive",
        title: "Inloggen mislukt",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setMode('options');
    }}>
      <DialogContent className="rounded-[2.5rem] p-0 max-w-md border-none shadow-2xl bg-white overflow-hidden">
        <div className="bg-primary p-10 text-primary-foreground text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <DialogTitle className="font-headline text-3xl italic">
              {mode === 'email-register' ? 'Vriend worden' : 'Word Vriend'}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/60 text-sm font-light mt-2">
              Krijg toegang tot het forum en bewaar uw eigen collecties.
            </DialogDescription>
          </div>
        </div>

        <div className="p-10">
          {mode === 'options' ? (
            <div className="space-y-4">
              <Button 
                onClick={onLogin} 
                disabled={isLoggingIn}
                className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-all group"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-3 grayscale group-hover:grayscale-0 transition-all" alt="" />
                )}
                Snel met Google
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest text-black/20 bg-white px-4">Of met e-mail</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setMode('email-login')}
                  className="h-14 rounded-2xl border-black/5 font-black uppercase text-[10px] tracking-widest"
                >
                  <LogIn className="w-4 h-4 mr-2" /> Inloggen
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setMode('email-register')}
                  className="h-14 rounded-2xl border-black/5 font-black uppercase text-[10px] tracking-widest"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Registreren
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div className="space-y-4">
                {mode === 'email-register' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Uw Naam</Label>
                    <Input 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      placeholder="Bijv. Jan de Vries" 
                      className="h-12 rounded-xl bg-black/5 border-none px-4" 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">E-mailadres</Label>
                  <Input 
                    required 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="uw@email.nl" 
                    className="h-12 rounded-xl bg-black/5 border-none px-4" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Wachtwoord</Label>
                  <Input 
                    required 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="h-12 rounded-xl bg-black/5 border-none px-4" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      {mode === 'email-register' ? 'Vriend worden' : 'Inloggen'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <button 
                  type="button"
                  onClick={() => setMode('options')}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Terug naar keuzes
                </button>
              </div>
              
              {mode === 'email-register' && (
                <p className="text-[9px] text-center italic opacity-40 leading-relaxed">
                  Na registratie ontvangt u een e-mail om uw account te verifiëren.
                </p>
              )}
            </form>
          )}
        </div>

        <div className="bg-black/[0.02] p-6 text-center border-t border-black/5">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
             Veilig verbonden via Firebase Auth
           </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
