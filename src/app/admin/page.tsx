
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Search,
  Languages,
  Palette,
  CreditCard,
  Settings as SettingsIcon,
  Star,
  LifeBuoy,
  FileText,
  Maximize2,
  CheckSquare,
  Square,
  FolderInput,
  X,
  Lock,
  EyeOff,
  Eye,
  Archive,
  Layers,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { verifyAdminPassword } from '@/lib/admin-actions';

const QUICK_TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { t } = useLanguage();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchSeriesName, setBatchSeriesName] = useState('');

  const [quickTranslateSource, setQuickTranslateSource] = useState('');
  const [quickTranslations, setQuickTranslations] = useState({ en: '', de: '', fr: '', es: '' });
  const [isAiTranslating, setIsAiTranslating] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    // De verificatie gebeurt nu veilig op de server
    const isValid = await verifyAdminPassword(password);
    
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
      toast({ variant: "destructive", title: "Toegang geweigerd", description: "Onjuist wachtwoord." });
    }
    setIsVerifying(false);
  };

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore, isAuthorized]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'orders'));
  }, [firestore, isAuthorized]);

  const { data: rawArtworks } = useCollection(artworksQuery);
  const { data: orders } = useCollection(ordersQuery);

  const artworks = useMemo(() => {
    if (!rawArtworks) return [];
    const seen = new Set();
    const unique = rawArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    return [...unique].sort(sortArtworksByTitle);
  }, [rawArtworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art: any) => {
      const displayTitle = art.displayTitle || art.title || "";
      return displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    });
  }, [artworks, searchQuery]);

  const groupedArtworks = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const groupsMap: Record<string, any[]> = {};

    filteredArtworks.forEach((art: any) => {
      const romanMatch = (art.displayTitle || art.title || "").match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/i);
      const roman = romanMatch ? romanMatch[0].toUpperCase() : "Diversen";
      
      if (!groupsMap[roman]) groupsMap[roman] = [];
      groupsMap[roman].push(art);
    });

    // Sorteren van groepen op basis van de Romeinse waarde
    const sortedLabels = Object.keys(groupsMap).sort((a, b) => {
      if (a === "Diversen") return 1;
      if (b === "Diversen") return -1;
      const ROMAN_VALS: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12 };
      return (ROMAN_VALS[a] || 999) - (ROMAN_VALS[b] || 999);
    });

    sortedLabels.forEach(label => {
      groups.push({ label, items: groupsMap[label] });
    });

    return groups;
  }, [filteredArtworks]);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const uniqueSeries = useMemo(() => {
    const series = new Set<string>();
    artworks.forEach((art: any) => {
      if (art.series) series.add(art.series);
    });
    return Array.from(series).sort();
  }, [artworks]);

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' }));
    });
  };

  const toggleTagInArtwork = (id: string, currentTags: string[] = [], tag: string) => {
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter(t => t !== tag) 
      : [...currentTags, tag];
    updateArtworkField(id, 'tags', newTags);
  };

  const handleBatchMove = async (targetSeries?: string) => {
    const finalSeries = targetSeries || batchSeriesName;
    if (!firestore || selectedIds.length === 0 || !finalSeries) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const ref = doc(firestore, 'artworks', id);
      batch.update(ref, { series: finalSeries });
    });
    try {
      await batch.commit();
      toast({ title: `${selectedIds.length} werken verplaatst naar "${finalSeries}"` });
      setSelectedIds([]);
      setIsSelectionMode(false);
      setBatchSeriesName('');
    } catch (e) { console.error(e); }
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'site');
    setDoc(settingsRef, { [field]: value }, { merge: true }).catch(async () => 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsRef.path, operation: 'update' }))
    );
  };

  const handleAiSuggestQuick = async () => {
    if (!quickTranslateSource) return;
    setIsAiTranslating(true);
    try {
      const langs = ['en', 'de', 'fr', 'es'];
      const newTranslations = { ...quickTranslations };
      for (const lang of langs) {
        const result = await translateMuseumText({
          text: quickTranslateSource,
          targetLanguage: lang,
          context: "Zaalnaam in een digitaal museum."
        });
        (newTranslations as any)[lang] = result.translatedText;
      }
      setQuickTranslations(newTranslations);
    } catch (e: any) { toast({ variant: "destructive", title: "AI Fout", description: e.message }); }
    finally { setIsAiTranslating(false); }
  };

  const editingArtwork = useMemo(() => artworks.find(a => a.id === editingId), [artworks, editingId]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                 <Lock className="w-10 h-10 text-accent" />
              </div>
              <h1 className="font-headline text-3xl font-light italic">Beheer Toegang</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-40">Veiligheid eerst</p>
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
                   disabled={isVerifying}
                 />
              </div>
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-all">
                 {isVerifying ? <Loader2 className="animate-spin w-4 h-4" /> : "Ontgrendel Archief"}
              </Button>
           </form>
           <Link href="/" className="block text-center text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-3 h-3 inline mr-2" /> Terug naar website
           </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14 md:pt-32">
      <header className="h-16 md:h-32 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 md:top-0 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4">
            <img src={siteSettings?.logoUrl || "/logo.png"} className="h-10 md:h-20 w-auto" alt="Logo" />
            <div className="flex flex-col leading-none border-l border-border/40 pl-4">
              <h1 className="font-headline text-lg md:text-3xl font-medium text-foreground">{siteSettings?.siteTitle || "Digitaal Museum"}</h1>
              <span className="text-[7px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Curator Edition &bull; Beveiligd</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/admin/translate" className="text-[10px] md:text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-accent flex items-center gap-2">
             <Languages className="w-3.5 h-3.5" /> Vertaal Station
           </Link>
           <Link href="/" className="text-[10px] md:text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2">
             <ArrowLeft className="w-3.5 h-3.5" /> Naar Website
           </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto flex flex-wrap justify-center h-auto border border-black/5">
            <TabsTrigger value="archive" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Schilderijen [{artworks.length}]</TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Zalen & Beheer</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Bestellingen [{orders?.length || 0}]</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Identiteit</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Commercieel</TabsTrigger>
            <TabsTrigger value="help" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"><LifeBuoy className="w-3 h-3 mr-2" /> Gids</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-12">
            <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input 
                    placeholder="Doorzoek de collectie op titel of zaal..." 
                    className="pl-12 h-12 bg-white/50 border-none rounded-full shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <Button 
                variant={isSelectionMode ? "accent" : "outline"} 
                onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                className="rounded-full h-12 px-6 uppercase font-bold tracking-widest text-[10px]"
               >
                 {isSelectionMode ? <X className="w-4 h-4 mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />} 
                 {isSelectionMode ? "Annuleer" : "Selecteer Groep"}
               </Button>
            </div>

            <div className="space-y-16">
              {groupedArtworks.map((group) => (
                <div key={group.label} className="space-y-6">
                  <div className="flex items-center gap-4 border-l-4 border-accent pl-4 py-1 sticky top-[136px] md:top-[208px] z-30 bg-background/80 backdrop-blur-md -mx-4 px-4 rounded-r-xl">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-accent">Zaal {group.label}</h3>
                    <div className="h-px bg-accent/20 flex-1" />
                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{group.items.length} werken</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {group.items.map((art: any) => {
                      const isSelected = selectedIds.includes(art.id);
                      return (
                        <Card 
                          key={art.id} 
                          className={cn(
                            "overflow-hidden cursor-pointer transition-all relative border-none shadow-md group",
                            isSelected ? "ring-4 ring-accent" : "hover:ring-2 hover:ring-accent/50",
                            isSelectionMode && "scale-95"
                          )} 
                          onClick={() => isSelectionMode ? (setSelectedIds(prev => prev.includes(art.id) ? prev.filter(i => i !== art.id) : [...prev, art.id])) : setEditingId(art.id)}
                        >
                          {art.featured && <Star className="absolute top-2 left-2 w-3 h-3 text-accent fill-accent z-10" />}
                          <div className="aspect-square bg-muted/20">
                            <img src={art.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={art.title} />
                          </div>
                          <CardContent className="p-2 text-center bg-white">
                            <h4 className="text-[9px] font-bold uppercase truncate">{art.displayTitle || art.title}</h4>
                            {art.series && art.series !== 'Nieuwe Uploads' && (
                              <p className="text-[7px] uppercase font-bold mt-1 opacity-40">{art.series}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-12">
             <Card className="p-8 rounded-3xl border-none shadow-xl bg-white/50 backdrop-blur-md">
                <div className="flex items-center justify-between mb-8 border-l-4 border-accent pl-4">
                   <h2 className="text-[12px] font-bold uppercase tracking-widest text-accent">Zalenbeheer</h2>
                </div>
                <div className="grid gap-4">
                   {uniqueSeries.map(name => {
                      const isHidden = siteSettings?.hiddenSeries?.includes(name);
                      const count = artworks.filter((a: any) => a.series === name).length;
                      return (
                        <div key={name} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-black/5">
                           <div className="flex items-center gap-4">
                              <Layers className="w-5 h-5 text-accent" />
                              <div>
                                 <h4 className="font-bold text-sm uppercase tracking-wider">{name}</h4>
                                 <p className="text-[10px] uppercase opacity-40 font-bold">{count} werken</p>
                              </div>
                           </div>
                           <Button 
                            variant={isHidden ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => {
                              const hidden = siteSettings?.hiddenSeries || [];
                              updateSettingsField('hiddenSeries', isHidden ? hidden.filter((s: string) => s !== name) : [...hidden, name]);
                            }}
                            className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest"
                           >
                             {isHidden ? "Openen" : "Sluiten"}
                           </Button>
                        </div>
                      );
                   })}
                </div>
             </Card>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-8">
             <Card className="p-8 rounded-3xl border-none shadow-xl bg-white/50">
                <div className="flex items-center gap-3 border-l-4 border-accent pl-4 mb-8">
                   <SettingsIcon className="w-4 h-4 text-accent" />
                   <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Asset Hosting & CDN</h3>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">CDN Basis URL</Label>
                      <Input 
                        placeholder="bijv: https://cdn.mijn-museum.nl/" 
                        defaultValue={siteSettings?.cdnBaseUrl || ''} 
                        onBlur={(e) => updateSettingsField('cdnBaseUrl', e.target.value)}
                        className="h-12 border-black/10"
                      />
                      <p className="text-[9px] opacity-40 italic">Laat leeg om Firebase Storage te gebruiken. Gebruik een URL die eindigt op een /</p>
                   </div>
                </div>
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-none w-screen h-screen p-0 flex flex-col bg-background border-none rounded-none overflow-hidden fixed inset-0 z-[100]">
          <DialogTitle className="sr-only">Editor - {editingArtwork?.title}</DialogTitle>
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="flex-1 bg-black/5 flex flex-col overflow-hidden">
              <div className="h-14 md:h-20 border-b border-black/5 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
                 <button onClick={() => setEditingId(null)} className="p-2 hover:bg-black/5 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                 <h2 className="text-sm font-bold uppercase tracking-widest truncate">{editingArtwork?.displayTitle || editingArtwork?.title}</h2>
                 <div className="w-10" />
              </div>
              <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative">
                <img 
                  src={editingArtwork?.imageUrl} 
                  className="max-h-[70vh] w-auto object-contain shadow-2xl bg-white p-2" 
                  alt="Preview" 
                />
              </div>
            </div>

            <div className="w-full md:w-[450px] shrink-0 bg-white border-l border-black/5 flex flex-col overflow-y-auto shadow-2xl">
              <div className="p-8 space-y-12 pb-32">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                     <Palette className="w-4 h-4 text-accent" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Identiteit & Locatie</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40">Publieke Titel</Label>
                       <Input defaultValue={editingArtwork?.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40">Zaal / Collectie</Label>
                       <Input defaultValue={editingArtwork?.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} placeholder="bijv. Polders" className="h-12" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                     <Tag className="w-4 h-4 text-primary" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(QUICK_TAG_CATEGORIES).flat().map(tag => {
                      const isActive = editingArtwork?.tags?.includes(tag);
                      return (
                        <button key={tag} onClick={() => toggleTagInArtwork(editingId!, editingArtwork?.tags, tag)} className={cn("px-3 py-1 rounded-full text-[10px] font-bold border", isActive ? "bg-accent text-accent-foreground border-accent" : "bg-white text-muted-foreground")}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 bg-accent/5 p-6 rounded-3xl border border-accent/10">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Commercieel</h3>
                     <Switch checked={editingArtwork?.inShop} onCheckedChange={(val) => updateArtworkField(editingId!, 'inShop', val)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['Postcard', 'Poster', 'Print', 'Canvas', 'Digital'].map(p => (
                      <div key={p} className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold opacity-40">{p === 'Canvas' ? 'Canvas 100x100' : p}</Label>
                        <Input type="number" defaultValue={(editingArtwork as any)[`price${p}`] || 0} onBlur={(e) => updateArtworkField(editingId!, `price${p}`, parseFloat(e.target.value))} className="h-9" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
