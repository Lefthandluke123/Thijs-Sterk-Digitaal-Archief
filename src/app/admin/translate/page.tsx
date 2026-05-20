
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  CheckCircle2,
  Globe2,
  Info
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

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: settings, loading } = useDoc(settingsRef);

  const updateTranslation = (field: string, value: string) => {
    if (!firestore || !settingsRef) return;
    const langField = `${field}_${targetLang}`;
    setDoc(settingsRef, { [langField]: value }, { merge: true });
  };

  const handleAiTranslate = async (field: string) => {
    if (!settings || isTranslating) return;
    const sourceText = settings[field] || DEFAULT_SOURCE_VALS[field];
    if (!sourceText) {
      toast({ variant: "destructive", title: "Geen brontekst", description: "Er is geen Nederlandse tekst om te vertalen." });
      return;
    }

    setIsTranslating(field);
    try {
      const result = await translateMuseumText({ 
        text: sourceText, 
        targetLanguage: LANG_LABELS[targetLang],
        context: `Vertaal dit veld voor de website van de kunstenaar Thijs Sterk. Veld type: ${field}`
      });
      updateTranslation(field, result.translatedText);
      toast({ title: "AI Vertaling voltooid", description: `Tekst vertaald naar het ${LANG_LABELS[targetLang]}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Fout", description: e.message });
    } finally {
      setIsTranslating(null);
    }
  };

  if (loading) {
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

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="bg-accent/5 border border-accent/10 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-accent">Hoe werkt het?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Links ziet u de originele Nederlandse teksten die op de website staan. Rechts kunt u de vertalingen voor <strong>{LANG_LABELS[targetLang]}</strong> invoeren. 
              Gebruik de <Sparkles className="inline w-3 h-3 mx-1" /> knop om AI te laten vertalen. Wijzigingen worden direct opgeslagen.
            </p>
          </div>
        </div>

        <div className="space-y-12 pb-32">
          {FIELDS_TO_TRANSLATE.map((field) => (
            <div key={field.id} className="grid lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Links: Bron (NL) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Origineel (Nederlands)</Label>
                  <span className="text-[9px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-sm">VELD: {field.label}</span>
                </div>
                <Card className="p-6 bg-muted/20 border-none shadow-none min-h-[100px] flex flex-col justify-center">
                  {field.type === 'input' ? (
                    <p className="font-headline text-lg">{settings?.[field.id] || DEFAULT_SOURCE_VALS[field.id] || '(Leeg)'}</p>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-line font-light opacity-80">{settings?.[field.id] || DEFAULT_SOURCE_VALS[field.id] || '(Geen tekst aanwezig)'}</p>
                  )}
                </Card>
              </div>

              {/* Rechts: Vertaling */}
              <div className="space-y-3 relative group">
                <div className="flex items-center justify-between px-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Vertaling naar {LANG_LABELS[targetLang]}</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[9px] uppercase font-black tracking-widest text-accent hover:bg-accent/10"
                    onClick={() => handleAiTranslate(field.id)}
                    disabled={!!isTranslating}
                  >
                    {isTranslating === field.id ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                    AI Vertalen
                  </Button>
                </div>
                <div className="relative">
                  {field.type === 'input' ? (
                    <Input 
                      key={`${field.id}_${targetLang}`}
                      defaultValue={settings?.[`${field.id}_${targetLang}`] || ''} 
                      onBlur={(e) => updateTranslation(field.id, e.target.value)}
                      className="h-14 font-headline text-lg border-accent/20 focus:border-accent bg-white/50"
                      placeholder={`Voer de ${LANG_LABELS[targetLang]} vertaling in...`}
                    />
                  ) : (
                    <Textarea 
                      key={`${field.id}_${targetLang}`}
                      defaultValue={settings?.[`${field.id}_${targetLang}`] || ''} 
                      onBlur={(e) => updateTranslation(field.id, e.target.value)}
                      className="min-h-[160px] p-6 text-sm leading-relaxed font-light border-accent/20 focus:border-accent bg-white/50 resize-none"
                      placeholder={`Schrijf de ${LANG_LABELS[targetLang]} vertaling hier...`}
                    />
                  )}
                  <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-5 h-5 text-green-500/40" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-center z-50">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          <Globe2 className="w-3 h-3" />
          Ondersteunt: NL &bull; EN &bull; DE &bull; FR &bull; ES
        </div>
      </footer>
    </div>
  );
}
