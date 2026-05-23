
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Languages, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Globe,
  Info,
  Layers,
  Tag,
  Lock
} from 'lucide-react';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';

type TargetLang = 'en' | 'de' | 'fr' | 'es';

export default function TranslatePage() {
  const firestore = useFirestore();
  const [targetLang, setTargetLang] = useState<TargetLang>('en');
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setIsAuthorized(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    if (await verifyAdminPassword(password)) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Fout", description: "Onjuist wachtwoord." });
    }
    setIsVerifying(false);
  };

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  const { data: settings } = useDoc(settingsRef);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Vertaal Station</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" disabled={isVerifying} />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground">{isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendelen"}</Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-20 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4"><Languages className="w-6 h-6 text-accent" /><h1 className="font-headline text-xl font-light">Vertaal Station</h1></div>
        <div className="flex items-center gap-6">
          <div className="flex bg-muted rounded-full p-1">
            {(['en', 'de', 'fr', 'es'] as TargetLang[]).map((lang) => (
              <button key={lang} onClick={() => setTargetLang(lang)} className={cn("px-6 py-1.5 rounded-full text-[10px] font-black uppercase transition-all", targetLang === lang ? "bg-accent text-accent-foreground" : "hover:bg-black/5")}>{lang}</button>
            ))}
          </div>
          <Link href="/admin" className="text-[11px] uppercase font-black text-muted-foreground flex items-center gap-2 border-l pl-6"><ArrowLeft className="w-3 h-3" /> Terug</Link>
        </div>
      </header>
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full pb-32">
        <p className="text-center opacity-40 py-20 italic">Vertaal Station is actief en beveiligd.</p>
      </main>
    </div>
  );
}
