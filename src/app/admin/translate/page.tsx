
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
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
  Plus,
  Trash2,
  FileText,
  Type,
  Layout,
  Settings as SettingsIcon
} from 'lucide-react';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
];

export default function TranslateStationPage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('translations');

  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setIsAuthorized(true);
  }, []);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  
  const { data: settings } = useDoc(settingsRef);

  useEffect(() => {
    if (settings) setFormData(settings as Record<string, string>);
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
    if (!sourceText) return toast({ variant: "destructive", title: "Leeg veld" });

    setTranslatingField(fieldId);
    const newTranslations: Record<string, string> = { ...formData };

    try {
      for (const lang of LANGUAGES.filter(l => !l.isSource)) {
        const result = await translateMuseumText({
          text: sourceText,
          targetLanguage: lang.label,
          context: `Veld: ${fieldId}`
        });
        newTranslations[`${fieldId}_${lang.code}`] = result.translatedText;
      }
      setFormData(newTranslations);
      toast({ title: "Vertaling voltooid" });
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
      toast({ title: "Opgeslagen" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl space-y-8">
           <h1 className="font-headline text-3xl text-center">Translation Hub</h1>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl">Ontgrendelen</Button>
           </form>
        </Card>
      </div>
    );
  }

  const categories = Array.from(new Set(CONTENT_FIELDS.map(f => f.category)));

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-32">
      <header className="h-24 bg-white/80 backdrop-blur-md border-b fixed top-0 left-0 right-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-headline text-2xl italic">Translation <span className="text-accent">Station</span></h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="h-14 px-10 rounded-2xl bg-primary shadow-xl">
          {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Wijzigingen Opslaan
        </Button>
      </header>

      <main className="max-w-7xl mx-auto px-8 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-white p-1 rounded-full w-fit mx-auto h-14 shadow-md border">
            <TabsTrigger value="translations" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Type className="w-4 h-4 mr-2" /> Teksten
            </TabsTrigger>
            <TabsTrigger value="stories" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layout className="w-4 h-4 mr-2" /> Story Pages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translations" className="space-y-16">
            {categories.map(cat => (
              <section key={cat} className="space-y-8">
                <h2 className="font-headline text-3xl italic opacity-40">{cat}</h2>
                <div className="grid gap-10">
                  {CONTENT_FIELDS.filter(f => f.category === cat).map(field => (
                    <Card key={field.id} className="p-8 rounded-[2rem] border-none shadow-xl bg-white">
                      <div className="flex justify-between items-start mb-8">
                        <Label className="text-xs font-black uppercase tracking-widest text-accent/40">{field.label}</Label>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleTranslateField(field.id)}
                          disabled={translatingField === field.id}
                          className="rounded-full px-6 bg-accent/5 hover:bg-accent text-accent hover:text-white"
                        >
                          {translatingField === field.id ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          AI Translate
                        </Button>
                      </div>

                      <div className="grid gap-8">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded">NL (Bron)</span>
                          {field.type === 'textarea' ? (
                            <Textarea 
                              value={formData[field.id] || ''} 
                              onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                              className="bg-black/5 border-none min-h-[120px] rounded-xl"
                            />
                          ) : (
                            <Input 
                              value={formData[field.id] || ''} 
                              onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                              className="bg-black/5 border-none h-12 rounded-xl"
                            />
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-black/5">
                          {LANGUAGES.filter(l => !l.isSource).map(lang => (
                            <div key={lang.code} className="space-y-2">
                              <span className="text-[10px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded uppercase">{lang.code}</span>
                              {field.type === 'textarea' ? (
                                <Textarea 
                                  value={formData[`${field.id}_${lang.code}`] || ''} 
                                  onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                  className="border-2 border-black/5 min-h-[100px] rounded-xl text-sm"
                                  placeholder={`${lang.label}...`}
                                />
                              ) : (
                                <Input 
                                  value={formData[`${field.id}_${lang.code}`] || ''} 
                                  onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                  className="border-2 border-black/5 h-11 rounded-xl text-sm"
                                  placeholder={`${lang.label}...`}
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
          </TabsContent>

          <TabsContent value="stories">
             <Card className="p-20 text-center rounded-[3rem] border-dashed border-4 border-black/5 bg-transparent">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Layout className="w-10 h-10 text-accent" />
                </div>
                <h2 className="font-headline text-3xl italic mb-4">Storytelling Module</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                   Beheer dynamische pagina's zoals biografieën of speciale projecten met meertalige tekst- en afbeeldingsblokken.
                </p>
                <Button className="rounded-full px-10 h-14 uppercase font-black text-[11px] tracking-widest">
                   Nieuwe Pagina Aanmaken <Plus className="w-4 h-4 ml-2" />
                </Button>
             </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
