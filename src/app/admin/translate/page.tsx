
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  Type,
  LayoutTemplate,
  Monitor
} from 'lucide-react';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  { id: 'gallery_title', label: 'Zalen Overzicht Titel', type: 'input', category: 'Zalen' },
  { id: 'gallery_select', label: 'Zalen Selectie Instructie', type: 'input', category: 'Zalen' },
  { id: 'curator_title', label: 'Curator Titel', type: 'input', category: 'Uw Zaal' },
  { id: 'curator_subtitle', label: 'Curator Ondertitel', type: 'input', category: 'Uw Zaal' },
  { id: 'shopIntro', label: 'Winkel Introductie', type: 'textarea', category: 'Winkel' },
];

const PRESET_PAGES = [
  { id: 'beatrijs', label: 'Beatrijs Sterk' },
  { id: 'hanneke', label: 'Hanneke Sterk' },
  { id: 'peter-bes', label: 'Peter Bes' },
  { id: 'leo-duppen', label: 'Leo Duppen' },
];

export default function TranslateStationPage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('translations');

  const [selectedStoryId, setSelectedStoryId] = useState<string>('beatrijs');
  const [storyNodes, setStoryNodes] = useState<StoryNode[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  
  const { data: settings } = useDoc(settingsRef);

  const storyRef = useMemoFirebase(() => {
    if (!firestore || !selectedStoryId) return null;
    return doc(firestore, 'stories', selectedStoryId);
  }, [firestore, selectedStoryId]);
  const { data: storyData } = useDoc(storyRef);

  useEffect(() => {
    if (settings) setFormData(settings as Record<string, string>);
  }, [settings]);

  useEffect(() => {
    if (storyData?.nodes) {
      setStoryNodes(storyData.nodes);
    } else {
      setStoryNodes([]);
    }
  }, [storyData]);

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
      if (activeTab === 'translations') {
        await updateDoc(settingsRef, formData);
      } else if (activeTab === 'stories' && storyRef) {
        await setDoc(storyRef, { nodes: storyNodes, updatedAt: serverTimestamp() }, { merge: true });
      }
      toast({ title: "Wijzigingen opgeslagen" });
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
           <h1 className="font-headline text-3xl text-center italic">Content <span className="text-accent">Hub</span></h1>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary">Ontgrendelen</Button>
           </form>
        </Card>
      </div>
    );
  }

  const categories = Array.from(new Set(CONTENT_FIELDS.map(f => f.category)));

  return (
    <div className="min-h-screen bg-transparent pt-32">
      <header className="h-24 bg-white/90 backdrop-blur-md border-b fixed top-0 left-0 right-0 z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Content <span className="text-accent">&</span> Layout</h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">DTP Designer Mode Active</span>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="h-14 px-10 rounded-2xl bg-primary shadow-xl hover:scale-[1.02] transition-all">
          {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Alle Wijzigingen Opslaan
        </Button>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 shadow-md border">
            <TabsTrigger value="translations" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest">
              <Type className="w-4 h-4 mr-2" /> Teksten & Vertalingen
            </TabsTrigger>
            <TabsTrigger value="stories" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest">
              <LayoutTemplate className="w-4 h-4 mr-2" /> Story Designer (DTP)
            </TabsTrigger>
          </TabsList>

          <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/60 shadow-2xl">
            <TabsContent value="translations" className="space-y-16 mt-0">
              {categories.map(cat => (
                <section key={cat} className="space-y-8">
                  <h2 className="font-headline text-3xl italic opacity-40 border-l-4 border-accent pl-6">{cat}</h2>
                  <div className="grid gap-8">
                    {CONTENT_FIELDS.filter(f => f.category === cat).map(field => (
                      <Card key={field.id} className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white/90 space-y-6">
                        <div className="flex justify-between items-start">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-accent/40">{field.label}</Label>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTranslateField(field.id)}
                            disabled={translatingField === field.id}
                            className="rounded-full px-6 bg-accent/5 hover:bg-accent text-accent hover:text-white transition-all"
                          >
                            {translatingField === field.id ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            AI Auto-Vertaal
                          </Button>
                        </div>

                        <div className="grid gap-10">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full">BRON</span>
                            {field.type === 'textarea' ? (
                              <Textarea 
                                value={formData[field.id] || ''} 
                                onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="bg-black/5 border-none min-h-[140px] rounded-2xl text-lg p-6 focus:ring-accent"
                              />
                            ) : (
                              <Input 
                                value={formData[field.id] || ''} 
                                onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="bg-black/5 border-none h-14 rounded-xl text-lg px-6"
                              />
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-black/5">
                            {LANGUAGES.filter(l => !l.isSource).map(lang => (
                              <div key={lang.code} className="space-y-2">
                                <span className="text-[9px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full uppercase">{lang.code}</span>
                                {field.type === 'textarea' ? (
                                  <Textarea 
                                    value={formData[`${field.id}_${lang.code}`] || ''} 
                                    onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                    className="border-2 border-black/5 min-h-[100px] rounded-2xl text-sm"
                                    placeholder={`${lang.label}...`}
                                  />
                                ) : (
                                  <Input 
                                    value={formData[`${field.id}_${lang.code}`] || ''} 
                                    onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })}
                                    className="border-2 border-black/5 h-12 rounded-xl text-sm"
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

            <TabsContent value="stories" className="space-y-12 mt-0">
               <div className="space-y-12">
                  <Card className="p-8 rounded-[3rem] bg-white/90 border-none shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                           <LayoutTemplate className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="font-headline text-2xl italic leading-tight">Stramien Designer</h3>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Positioneer uw elementen vrij op het canvas (Drag & Drop)</p>
                        </div>
                     </div>
                     <div className="min-w-[280px]">
                        <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
                          <SelectTrigger className="h-14 rounded-2xl bg-black/5 border-none text-sm font-bold uppercase tracking-widest px-6">
                            <SelectValue placeholder="Pagina kiezen..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-2xl border-none p-2">
                             {PRESET_PAGES.map(p => (
                               <SelectItem key={p.id} value={p.id} className="rounded-xl p-4 text-xs font-bold uppercase">{p.label}</SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                     </div>
                  </Card>

                  <div className="space-y-8">
                     <div className="flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                           <Monitor className="w-5 h-5 opacity-30" />
                           <h2 className="font-headline text-3xl italic opacity-30">WYSIWYG Layout Designer</h2>
                        </div>
                        <div className="flex gap-2 items-center">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Canvas Active (Grid: 12 col)</span>
                        </div>
                     </div>
                     
                     <StoryEditor 
                      nodes={storyNodes} 
                      onChange={(data) => setStoryNodes(data.nodes)} 
                    />
                  </div>
               </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
