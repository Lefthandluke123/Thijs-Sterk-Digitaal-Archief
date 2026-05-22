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
  CircleCheck,
  Globe,
  Info,
  Layers,
  Tag,
  Lock
} from 'lucide-react';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { cn } from '@/lib/utils';

type TargetLang = 'en' | 'de' | 'fr' | 'es';

const LANG_LABELS: Record<TargetLang, string> = {
  en: 'Engels (English)',
  de: 'Duits (Deutsch)',
  fr: 'Frans (Français)',
  es: 'Spaans (Español)'
};

const DEFAULT_SOURCE_VALS: Record<string, string> = {
  homeHeroTitle: 'Een leven gewijd aan Licht, Ruimte en Water',
  homeHeroIntro: 'Dwaal hier op uw eigen tempo door de verschillende zalen...',
  homeBioTitle: 'Een leven gewijd aan de Essentie',
  contactTitle: 'Informatie & Uw Verhalen',
  contactLabelName: 'Naam',
  contactLabelEmail: 'E-mail',
  contactLabelSubject: 'Onderwerp',
  contactLabelMessage: 'Bericht / Herinnering',
  contactButtonSend: 'Verstuur Bericht'
};

const FIELDS_TO_TRANSLATE = [
  { id: 'homeHeroTitle', label: 'Home Hero Titel', type: 'input' },
  { id: 'homeHeroIntro', label: 'Home Hero Introductie', type: 'textarea' },
  { id: 'homeBioTitle', label: 'Hoofdbiografie Titel', type: 'input' },
  { id: 'homeBio', label: 'Hoofdbiografie Tekst', type: 'textarea' },
  { id: 'hannekeBio', label: 'Hanneke Sterk Biografie', type: 'textarea' },
  { id: 'beatrijsBio', label: 'Beatrijs Sterk Biografie', type: 'textarea' },
  { id: 'peterBesBio', label: 'Peter Bes Biografie', type: 'textarea' },
  { id: 'leoDuppenBio', label: 'Leo Duppen Biografie', type: 'textarea' },
  { id: 'contactTitle', label: 'Contact Sectie Titel', type: 'input' },
  { id: 'contactIntro', label: 'Contact Intro Tekst', type: 'textarea' },
  { id: 'contactQuote', label: 'Contact Quote', type: 'textarea' },
  { id: 'contactLabelName', label: 'Form Label: Naam', type: 'input' },
  { id: 'contactLabelEmail', label: 'Form Label: E-mail', type: 'input' },
  { id: 'contactLabelSubject', label: 'Form Label: Onderwerp', type: 'input' },
  { id: 'contactLabelMessage', label: 'Form Label: Bericht', type: 'input' },
  { id: 'contactButtonSend', label: 'Form Knop: Verstuur', type: 'input' },
];

export default function TranslatePage() {
  const firestore = useFirestore();
  const [targetLang, setTargetLang] = useState<TargetLang>('en');
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  // Auth state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'gabbes') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
      toast({ variant: "destructive", title: "Onjuist wachtwoord", description: "Toegang geweigerd." });
    }
  };

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);

  const { data: settings, loading: settingsLoading } = useDoc(settingsRef);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore, isAuthorized]);
  const { data: artworks, loading: artworksLoading } = useCollection(artworksQuery);

  const uniqueSeries = useMemo(() => {
    if (!artworks) return [];
    const series = new Set<string>();
    artworks.forEach((art: any) => {
      if (art.series && art.series !== 'Nieuwe Uploads') series.add(art.series);
    });
    return Array.from(series).sort();
  }, [artworks]);

  const uniqueTags = useMemo(() => {
    if (!artworks) return [];
    const tags = new Set<string>();
    artworks.forEach((art: any) => {
      art.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [artworks]);

  const updateTranslation = (field: string, value: string, category: 'field' | 'series' | 'tag' = 'field') => {
    if (!firestore || !settingsRef) return;
    
    if (category === 'field') {
      const langField = `${field}_${targetLang}`;
      setDoc(settingsRef, { [langField]: value }, { merge: true });
    } else {
      const mapField = category === 'series' ? 'seriesTranslations' : 'tagTranslations';
      const currentMap = settings?.[mapField] || {};
      const langMap = currentMap[targetLang] || {};
      
      setDoc(settingsRef, {
        [mapField]: {
          ...currentMap,
          [targetLang]: {
            ...langMap,
            [field]: value
          }
        }
      }, { merge: true });
    }
  };

  const handleAiTranslate = async (text: string, id: string, category: 'field' | 'series' | 'tag' = 'field') => {
    if (!settings || isTranslating) return;
    
    setIsTranslating(id);
    try {
      const result = await translateMuseumText({ 
        text, 
        targetLanguage: LANG_LABELS[targetLang],
        context: `Vertaal deze term voor een kunstportfolio. Categorie: ${category}`
      });
      updateTranslation(id, result.translatedText, category);
      toast({ title: "AI Vertaling voltooid" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Fout", description: e.message });
    } finally {
      setIsTranslating(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                 <Lock className="w-10 h-10 text-accent" />
              </div>
              <h1 className="font-headline text-3xl font-light italic">Vertaal Station Toegang</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-40">Voer het wachtwoord in om door te gaan</p>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase tracking-widest font-black opacity-60 ml-2">Wachtwoord</Label>
                 <Input 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)}
                   className={cn("h-14 rounded-2xl bg-black/5 border-none text-center text-lg tracking-[0.5em]", authError && "ring-2 ring-destructive")}
                   autoFocus
                 />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-all">
                 Ontgrendel Vertalingen
              </Button>
           </form>
           <Link href="/admin" className="block text-center text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-3 h-3 inline mr-2" /> Terug naar beheer
           </Link>
        </Card>
      </div>
    );
  }

  if (settingsLoading || artworksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-20 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Languages className="w-6 h-6 text-accent" />
          <h1 className="font-headline text-xl font-light">Vertaal Station</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-muted rounded-full p-1">
            {(['en', 'de', 'fr', 'es'] as TargetLang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setTargetLang(lang)}
                className={cn(
                  "px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  targetLang === lang ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-black/5"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <Link href="/admin" className="text-[11px] uppercase tracking-widest font-black text-muted-foreground hover:text-foreground flex items-center gap-2 border-l pl-6">
            <ArrowLeft className="w-3 h-3" /> Terug naar beheer
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full pb-32">
        <div className="bg-accent/5 border border-accent/10 rounded-2xl p-6 mb-12 flex items-start gap-4">
          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-accent">Hoe werkt het?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vertaal hier alle teksten, zaalnamen en tags naar het <strong>{LANG_LABELS[targetLang]}</strong>. 
              Gebruik de <Sparkles className="inline w-3 h-3 mx-1" /> knop voor AI hulp.
            </p>
          </div>
        </div>

        <div className="space-y-24">
          {/* Pagina Teksten */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-b border-accent/20 pb-4">
               <Globe className="w-5 h-5 text-accent" />
               <h2 className="text-xl font-headline font-light uppercase tracking-widest">Pagina Teksten</h2>
            </div>
            <div className="grid gap-12">
              {FIELDS_TO_TRANSLATE.map((field) => (
                <div key={field.id} className="grid lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase opacity-40">{field.label} (NL)</Label>
                    <Card className="p-4 bg-muted/20 border-none">
                       <p className={cn("text-sm", field.type === 'input' && "font-bold")}>
                         {settings?.[field.id] || DEFAULT_SOURCE_VALS[field.id] || '(Leeg)'}
                       </p>
                    </Card>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase text-accent">Vertaling ({targetLang})</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-black" onClick={() => handleAiTranslate(settings?.[field.id] || DEFAULT_SOURCE_VALS[field.id], field.id)}>
                        {isTranslating === field.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />} AI
                      </Button>
                    </div>
                    {field.type === 'input' ? (
                      <Input 
                        defaultValue={settings?.[`${field.id}_${targetLang}`] || ''} 
                        onBlur={(e) => updateTranslation(field.id, e.target.value)}
                      />
                    ) : (
                      <Textarea 
                        defaultValue={settings?.[`${field.id}_${targetLang}`] || ''} 
                        onBlur={(e) => updateTranslation(field.id, e.target.value)}
                        className="min-h-[100px]"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Zalen (Series) */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-b border-accent/20 pb-4">
               <Layers className="w-5 h-5 text-accent" />
               <h2 className="text-xl font-headline font-light uppercase tracking-widest">Namen van de Zalen</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
              {uniqueSeries.map((s) => (
                <div key={s} className="space-y-2 group">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase opacity-40 truncate flex-1">{s}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAiTranslate(s, s, 'series')}>
                        {isTranslating === s ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-accent" />}
                      </Button>
                   </div>
                   <Input 
                     placeholder={`${s} vertaling...`}
                     defaultValue={settings?.seriesTranslations?.[targetLang]?.[s] || ''}
                     onBlur={(e) => updateTranslation(s, e.target.value, 'series')}
                     className="bg-accent/5 border-accent/10 focus:border-accent"
                   />
                </div>
              ))}
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-b border-accent/20 pb-4">
               <Tag className="w-5 h-5 text-accent" />
               <h2 className="text-xl font-headline font-light uppercase tracking-widest">Schilderij Tags</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {uniqueTags.map((t) => (
                <div key={t} className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-black uppercase opacity-30 truncate flex-1">{t}</span>
                      <button onClick={() => handleAiTranslate(t, t, 'tag')} className="hover:text-accent transition-colors">
                        {isTranslating === t ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                      </button>
                   </div>
                   <Input 
                     placeholder={`${t}...`}
                     defaultValue={settings?.tagTranslations?.[targetLang]?.[t] || ''}
                     onBlur={(e) => updateTranslation(t, e.target.value, 'tag')}
                     className="h-8 text-xs"
                   />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-center z-50">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] opacity-40">
          <Globe className="w-3 h-3" /> Ondersteunt: NL &bull; EN &bull; DE &bull; FR &bull; ES
        </div>
      </footer>
    </div>
  );
}