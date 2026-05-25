
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
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
  Save,
  Globe,
  Type,
  FileText,
  ShoppingBag,
  MessageSquare,
  Lock
} from 'lucide-react';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', isSource: true },
  { code: 'en', label: 'Engels' },
  { code: 'de', label: 'Duits' },
  { code: 'fr', label: 'Frans' },
  { code: 'es', label: 'Spaans' },
];

const CONTENT_FIELDS = [
  { id: 'siteTitle', label: 'Website Titel', type: 'input', category: 'Algemeen' },
  { id: 'siteSubtitle', label: 'Website Ondertitel', type: 'input', category: 'Algemeen' },
  { id: 'homeHeroTitle', label: 'Hero Hoofdtitel', type: 'input', category: 'Homepage' },
  { id: 'homeBioTitle', label: 'Biografie Titel', type: 'input', category: 'Homepage' },
  { id: 'homeBio', label: 'Biografie Tekst', type: 'textarea', category: 'Homepage' },
  { id: 'shopIntro', label: 'Winkel Introductie', type: 'textarea', category: 'Winkel' },
  { id: 'contactTitle', label: 'Contact Titel', type: 'input', category: 'Contact' },
  { id: 'contactIntro', label: 'Contact Introductie', type: 'textarea', category: 'Contact' },
  { id: 'contactQuote', label: 'Contact Citaat', type: 'input', category: 'Contact' },
];

export default function TranslatePage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setIsAuthorized(true);
  }, []);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef);

  useEffect(() => {
    if (settings) {
      setFormData(settings as Record<string, string>);
    }
  }, [settings]);

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

  const handleTranslateField = async (fieldId: string) => {
    const sourceText = formData[fieldId];
    if (!sourceText) {
      toast({ variant: "destructive", title: "Leeg veld", description: "Voer eerst de Nederlandse tekst in." });
      return;
    }

    setTranslatingField(fieldId);
    const targetLangs = LANGUAGES.filter(l => !l.isSource);
    const newTranslations: Record<string, string> = { ...formData };

    try {
      for (const lang of targetLangs) {
        const result = await translateMuseumText({
          text: sourceText,
          targetLanguage: lang.label,
          context: `Veld: ${fieldId}`
        });
        newTranslations[`${fieldId}_${lang.code}`] = result.translatedText;
      }
      setFormData(newTranslations);
      toast({ title: "Vertaling voltooid", description: `Tekst vertaald naar 4 talen.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Fout", description: error.message });
    } finally {
      setTranslatingField(null);
    }
  };

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await updateDoc(settingsRef, formData);
      toast({ title: "Opgeslagen", description: "Alle vertalingen zijn bijgewerkt." });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSaving(false);
    }
  };

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

  const categories = Array.from(new Set(CONTENT_FIELDS.map(f => f.category)));

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pt-32">
      <header className="h-24 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline text-2xl flex items-center gap-3">
              Vertaal <span className="italic">Station</span>
              <div className="bg-accent/10 text-accent text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">AI Assisted</div>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Beheer de website in 5 talen</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-all">
          {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Instellingen Opslaan
        </Button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full pb-48">
        <div className="space-y-16">
          {categories.map(cat => (
            <section key={cat} className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="h-px flex-1 bg-black/5" />
                 <h2 className="font-headline text-3xl italic text-accent/60">{cat}</h2>
                 <div className="h-px flex-1 bg-black/5" />
              </div>

              <div className="grid gap-12">
                {CONTENT_FIELDS.filter(f => f.category === cat).map(field => (
                  <Card key={field.id} className="p-8 rounded-[2rem] border-none shadow-xl bg-white overflow-hidden relative">
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <Label className="text-xs font-black uppercase tracking-widest text-accent/40">{field.label}</Label>
                        <p className="text-[10px] font-mono opacity-30">ID: {field.id}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleTranslateField(field.id)}
                        disabled={translatingField === field.id}
                        className="rounded-full px-6 h-10 bg-accent/5 hover:bg-accent text-accent hover:text-white transition-all group"
                      >
                        {translatingField === field.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        )}
                        Vertaal naar alle talen
                      </Button>
                    </div>

                    <div className="grid gap-6">
                      {/* Bron-taal: NL */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded">NL</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Brontekst</span>
                        </div>
                        {field.type === 'textarea' ? (
                          <Textarea 
                            value={formData[field.id] || ''} 
                            onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                            className="bg-black/5 border-none min-h-[120px] rounded-xl focus:ring-accent"
                            placeholder="Nederlandse tekst..."
                          />
                        ) : (
                          <Input 
                            value={formData[field.id] || ''} 
                            onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                            className="bg-black/5 border-none h-12 rounded-xl focus:ring-accent"
                            placeholder="Nederlandse tekst..."
                          />
                        )}
                      </div>

                      {/* Doel-talen */}
                      <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                        {LANGUAGES.filter(l => !l.isSource).map(lang => (
                          <div key={lang.code} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded uppercase">{lang.code}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{lang.label}</span>
                            </div>
                            {field.type === 'textarea' ? (
                              <Textarea 
                                value={formData[`${field.id}_${lang.code}`] || ''} 
                                onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                className="bg-white border-2 border-black/5 min-h-[100px] rounded-xl text-sm focus:border-accent/30"
                                placeholder={`${lang.label} vertaling...`}
                              />
                            ) : (
                              <Input 
                                value={formData[`${field.id}_${lang.code}`] || ''} 
                                onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                className="bg-white border-2 border-black/5 h-11 rounded-xl text-sm focus:border-accent/30"
                                placeholder={`${lang.label} vertaling...`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
