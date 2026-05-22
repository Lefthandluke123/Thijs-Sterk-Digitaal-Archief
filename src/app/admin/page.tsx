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
  Plus,
  Search,
  CloudUpload,
  Languages,
  Palette,
  CreditCard,
  Settings as SettingsIcon,
  Star,
  Globe,
  TrendingUp,
  LifeBuoy,
  FileText,
  Image as ImageIcon,
  Camera,
  CircleCheck,
  CircleAlert,
  Zap,
  Coins,
  Users,
  Briefcase,
  GraduationCap,
  HardDrive,
  Maximize2,
  Tags,
  Info,
  ShoppingBag,
  CheckSquare,
  Square,
  FolderInput,
  X,
  Lock,
  EyeOff,
  Eye,
  Archive,
  Layers,
  MousePointer2,
  Type,
  BookOpen,
  ArrowRight,
  Filter,
  CircleHelp,
  Sparkles,
  CircleX,
  Tag,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { Badge } from '@/components/ui/badge';

const LANG_MAP: Record<string, string> = {
  en: 'Engels',
  de: 'Duits',
  fr: 'Frans',
  es: 'Spaans'
};

const QUICK_TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "70-82"],
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
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchSeriesName, setBatchSeriesName] = useState('');

  // Quick Translate State
  const [quickTranslateSource, setQuickTranslateSource] = useState('');
  const [quickTranslations, setQuickTranslations] = useState({ en: '', de: '', fr: '', es: '' });
  const [isAiTranslating, setIsAiTranslating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

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

  const allExistingTags = useMemo(() => {
    const tags = new Set<string>();
    artworks.forEach((art: any) => {
      art.tags?.forEach((t: string) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [artworks]);

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    if (!confirm(`Weet je zeker dat je deze ${selectedIds.length} werken wilt verwijderen?`)) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      batch.delete(doc(firestore, 'artworks', id));
    });
    try {
      await batch.commit();
      toast({ title: `${selectedIds.length} werken verwijderd` });
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllInSeries = (seriesName: string) => {
    const ids = artworks.filter((a: any) => a.series === seriesName).map(a => a.id);
    setSelectedIds(ids);
    setIsSelectionMode(true);
    setActiveTab('archive');
    toast({ title: `Alle ${ids.length} werken uit "${seriesName}" geselecteerd` });
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
          targetLanguage: LANG_MAP[lang],
          context: "Dit is een naam voor een zaal of collectie in een digitaal museum van kunstschilder Thijs Sterk."
        });
        (newTranslations as any)[lang] = result.translatedText;
      }
      
      setQuickTranslations(newTranslations);
      toast({ title: "AI Suggesties gegenereerd" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Fout", description: e.message });
    } finally {
      setIsAiTranslating(false);
    }
  };

  const handleQuickTranslateSave = () => {
    if (!quickTranslateSource || !firestore) return;
    const currentTranslations = siteSettings?.seriesTranslations || {};
    
    const newTranslations = { ...currentTranslations };
    Object.entries(quickTranslations).forEach(([lang, val]) => {
      if (val) {
        if (!newTranslations[lang]) newTranslations[lang] = {};
        newTranslations[lang][quickTranslateSource] = val;
      }
    });

    updateSettingsField('seriesTranslations', newTranslations);
    toast({ title: `Vertalingen voor "${quickTranslateSource}" opgeslagen` });
    setQuickTranslateSource('');
    setQuickTranslations({ en: '', de: '', fr: '', es: '' });
  };

  const toggleSeriesVisibility = (name: string) => {
    const hidden = siteSettings?.hiddenSeries || [];
    const newHidden = hidden.includes(name) 
      ? hidden.filter((s: string) => s !== name) 
      : [...hidden, name];
    updateSettingsField('hiddenSeries', newHidden);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !firestore) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `branding/logo_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateSettingsField('logoUrl', url);
      toast({ title: "Site identiteit bijgewerkt" });
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || !firestore || !storage) return;
    setIsUploading(true);
    setUploadProgress(0);
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalFiles = filesArray.length;
    let processedCount = 0;

    for (const file of filesArray) {
      try {
        setUploadStatus(`Digitaliseren: ${file.name} (${processedCount + 1}/${totalFiles})`);
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
        const fileNameNoExt = file.name.split('.')[0] || "Naamloos";
        const storageRef = ref(storage, `artworks/${timestamp}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        await addDoc(collection(firestore, 'artworks'), {
          title: fileNameNoExt,
          displayTitle: fileNameNoExt,
          series: "Nieuwe Uploads",
          imageUrl: downloadUrl,
          fileSize: file.size,
          fileType: file.type,
          createdAt: serverTimestamp(),
          cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1,
          year: "", dimensions: "", medium: "Olieverf op doek",
          featured: false, inShop: false,
          pricePostcard: 2.50, pricePoster: 24.00, pricePrint: 85.00, priceDigital: 15.00,
          tags: []
        });
        processedCount++;
        setUploadProgress((processedCount / totalFiles) * 100);
      } catch (e) { console.error(e); }
    }
    setIsUploading(false);
    setUploadStatus('');
    toast({ title: "Master Files succesvol verwerkt" });
  };

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art: any) => {
      const displayTitle = art.displayTitle || art.title || "";
      return displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    });
  }, [artworks, searchQuery]);

  const editingArtwork = useMemo(() => {
    return artworks.find(a => a.id === editingId);
  }, [artworks, editingId]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                 <Lock className="w-10 h-10 text-accent" />
              </div>
              <h1 className="font-headline text-3xl font-light italic">Beheer Toegang</h1>
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
                 Ontgrendel Archief
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
              <span className="text-[7px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Safe Harbor Framework &bull; Curator Edition</span>
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
            <TabsTrigger value="upload" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Digitaliseren</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Identiteit</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Commercieel</TabsTrigger>
            <TabsTrigger value="help" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"><LifeBuoy className="w-3 h-3 mr-2" /> Gids</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input 
                    placeholder="Doorzoek de collectie..." 
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
                 {isSelectionMode ? "Annuleer Selectie" : "Selectie-modus"}
               </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredArtworks.map((art: any) => {
                const isSelected = selectedIds.includes(art.id);
                return (
                  <Card 
                    key={art.id} 
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all relative border-none shadow-md group",
                      isSelected ? "ring-4 ring-accent" : "hover:ring-2 hover:ring-accent/50",
                      isSelectionMode && "scale-95"
                    )} 
                    onClick={() => isSelectionMode ? toggleSelection(art.id) : setEditingId(art.id)}
                  >
                    {art.featured && <Star className="absolute top-2 left-2 w-3 h-3 text-accent fill-accent z-10" />}
                    
                    {isSelectionMode && (
                      <div className="absolute top-2 right-2 z-20">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-accent fill-white" /> : <Square className="w-5 h-5 text-white/50" />}
                      </div>
                    )}

                    <div className="aspect-square bg-muted/20">
                      <img src={art.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={art.title} />
                    </div>
                    <CardContent className="p-2 text-center bg-white">
                      <h4 className="text-[9px] font-bold uppercase truncate">{art.displayTitle || art.title}</h4>
                      <p className={cn("text-[7px] uppercase font-bold mt-1", art.series === 'Archief' ? "text-red-500" : "opacity-40")}>{art.series}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Batch Action Toolbar */}
            {isSelectionMode && selectedIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 z-[100] animate-in slide-in-from-bottom-10 border border-white/10 backdrop-blur-xl">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Geselecteerd</span>
                    <span className="font-headline text-xl">{selectedIds.length} werken</span>
                 </div>
                 
                 <div className="h-10 w-px bg-white/20" />

                 <div className="flex items-center gap-6">
                    <div className="space-y-1">
                       <Label className="text-[9px] uppercase font-bold tracking-widest opacity-60 ml-2">Verplaats naar Zaal</Label>
                       <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Zaalnaam..." 
                            className="h-10 bg-white/10 border-none text-white placeholder:text-white/30 text-xs w-48 rounded-xl"
                            value={batchSeriesName}
                            onChange={(e) => setBatchSeriesName(e.target.value)}
                          />
                          <Button 
                            size="sm" 
                            disabled={!batchSeriesName}
                            onClick={() => handleBatchMove()}
                            className="bg-accent text-accent-foreground rounded-xl"
                          >
                            <FolderInput className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleBatchMove('Archief')}
                      className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                    >
                      <Archive className="w-4 h-4 mr-2" /> Naar Archief
                    </Button>
                 </div>

                 <div className="h-10 w-px bg-white/20" />

                 <Button 
                   variant="destructive" 
                   size="icon" 
                   onClick={handleBatchDelete}
                   className="rounded-xl h-10 w-10"
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-12">
             <Card className="p-8 rounded-3xl border-none shadow-xl bg-white/50 backdrop-blur-md">
                <div className="flex items-center justify-between mb-8 border-l-4 border-accent pl-4">
                   <div>
                      <h2 className="text-[12px] font-bold uppercase tracking-widest text-accent">Zalenbeheer & Status</h2>
                      <p className="text-xs text-muted-foreground mt-1">Beheer de zichtbaarheid van collecties op de website.</p>
                   </div>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => document.getElementById('manual-section')?.scrollIntoView({ behavior: 'smooth' })}
                     className="rounded-full px-4 text-[9px] uppercase font-bold tracking-widest h-9 border-accent/20 text-accent hover:bg-accent hover:text-white"
                   >
                     <CircleHelp className="w-3.5 h-3.5 mr-2" /> Hoe werkt dit?
                   </Button>
                </div>

                <div className="grid gap-4">
                   {uniqueSeries.map(name => {
                      const isHidden = siteSettings?.hiddenSeries?.includes(name);
                      const count = artworks.filter((a: any) => a.series === name).length;
                      return (
                        <div key={name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white rounded-2xl border border-black/5 group hover:shadow-md transition-all gap-4">
                           <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isHidden ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent")}>
                                 {isHidden ? <EyeOff className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                              </div>
                              <div>
                                 <h4 className="font-bold text-sm uppercase tracking-wider">{name}</h4>
                                 <p className="text-[10px] uppercase opacity-40 font-bold">{count} schilderijen</p>
                              </div>
                           </div>
                           <div className="flex flex-wrap items-center gap-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleSelectAllInSeries(name)}
                                className="rounded-full px-4 text-[9px] uppercase font-bold tracking-widest h-9 border-accent/20 text-accent hover:bg-accent hover:text-white"
                              >
                                 <CheckSquare className="w-3 h-3 mr-2" /> Selecteer alles
                              </Button>
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border",
                                isHidden ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                              )}>
                                 {isHidden ? "Gesloten" : "Open in Museum"}
                              </div>
                              <Button 
                                variant={isHidden ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => toggleSeriesVisibility(name)}
                                className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest h-9"
                              >
                                 {isHidden ? <><Eye className="w-3 h-3 mr-2" /> Open</> : <><EyeOff className="w-3 h-3 mr-2" /> Sluit</>}
                              </Button>
                           </div>
                        </div>
                      );
                   })}
                   {uniqueSeries.length === 0 && (
                      <div className="text-center py-20 opacity-30 uppercase font-bold tracking-[0.2em] italic">Geen zalen gevonden</div>
                   )}
                </div>
             </Card>

             <Card className="p-8 rounded-3xl border-none shadow-xl bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5"><Languages className="w-64 h-64" /></div>
                <div className="relative z-10 space-y-8">
                   <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                      <Languages className="w-5 h-5 text-accent" />
                      <h2 className="text-[12px] font-bold uppercase tracking-widest text-accent">Zaalnaam Vertaal Station</h2>
                   </div>

                   <div className="grid lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Bron Naam (NL)</Label>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[9px] uppercase font-black text-accent hover:text-accent hover:bg-white/10"
                                onClick={handleAiSuggestQuick}
                                disabled={!quickTranslateSource || isAiTranslating}
                              >
                                {isAiTranslating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />} 
                                AI Suggestie
                              </Button>
                            </div>
                            <Input 
                              placeholder="Bijv: Polders of Havens" 
                              className="bg-white/10 border-none text-white h-14 rounded-2xl text-lg font-bold"
                              value={quickTranslateSource}
                              onChange={(e) => setQuickTranslateSource(e.target.value)}
                            />
                            <p className="text-[9px] opacity-40 italic">Gebruik exact dezelfde naam als de 'Expositieruimte' bij de schilderijen.</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {['en', 'de', 'fr', 'es'].map((lang) => (
                           <div key={lang} className="space-y-2">
                              <Label className="text-[9px] uppercase font-bold opacity-40">{lang.toUpperCase()}</Label>
                              <Input 
                                placeholder={`${lang.toUpperCase()} Vertaling...`}
                                className="bg-white/5 border-none text-white h-10 rounded-xl text-xs"
                                value={(quickTranslations as any)[lang]}
                                onChange={(e) => setQuickTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                              />
                           </div>
                         ))}
                         <Button 
                           className="col-span-2 mt-4 bg-accent text-accent-foreground font-black uppercase tracking-widest text-[11px] h-12 rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                           disabled={!quickTranslateSource}
                           onClick={handleQuickTranslateSave}
                         >
                            Sla 4 Vertalingen Op
                         </Button>
                      </div>
                   </div>
                </div>
             </Card>

             <Card id="manual-section" className="p-8 md:p-16 rounded-[3rem] shadow-2xl border-none bg-white space-y-16">
                  <div className="space-y-4 text-center border-b border-black/5 pb-12">
                    <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 shadow-xl">
                       <BookOpen className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-headline font-light italic">Museum Beheer Handleiding</h2>
                    <p className="text-muted-foreground uppercase tracking-[0.2em] font-bold text-[10px]">Stap-voor-stap instructies voor de Digitaal Conservator</p>
                  </div>

                  <div className="grid gap-20">
                    {/* Selecteren */}
                    <div className="flex flex-col md:flex-row gap-12">
                       <div className="md:w-1/3 space-y-4">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                             <CheckSquare className="w-3.5 h-3.5 text-accent" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Stap 1</span>
                          </div>
                          <h3 className="text-2xl font-headline italic">Schilderijen Selecteren</h3>
                       </div>
                       <div className="md:w-2/3 space-y-6 text-muted-foreground leading-relaxed">
                          <p>Om acties uit te voeren op meerdere schilderijen tegelijk, gebruik je de <strong>Selectie-modus</strong>:</p>
                          <ul className="space-y-4 list-none p-0">
                             <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 text-[10px] font-bold">A</div>
                                <span>Klik op de knop <strong>[Selectie-modus]</strong> rechtsboven in het overzicht. De schilderijen worden iets kleiner en vinkvakjes verschijnen.</span>
                             </li>
                             <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 text-[10px] font-bold">B</div>
                                <span>Klik op de schilderijen die je wilt bewerken. Er verschijnt een vinkje bij de geselecteerde werken.</span>
                             </li>
                             <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 text-[10px] font-bold">C</div>
                                <span>Onderaan het scherm verschijnt nu automatisch de <strong>Batch-werkbalk</strong> met acties.</span>
                             </li>
                          </ul>
                       </div>
                    </div>

                    {/* Verplaatsen / Hernoemen */}
                    <div className="flex flex-col md:flex-row gap-12">
                       <div className="md:w-1/3 space-y-4">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                             <FolderInput className="w-3.5 h-3.5 text-accent" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Stap 2</span>
                          </div>
                          <h3 className="text-2xl font-headline italic">Zalen & Hernoemen</h3>
                       </div>
                       <div className="md:w-2/3 space-y-6 text-muted-foreground leading-relaxed">
                          <p>Je kunt schilderijen op twee manieren verplaatsen of zalen hernoemen:</p>
                          <div className="bg-accent/5 p-8 rounded-3xl border border-accent/10 space-y-6">
                             <div className="space-y-2">
                                <p className="font-bold text-foreground text-sm uppercase tracking-wide">Individueel (Editor):</p>
                                <p>Klik op een enkel schilderij om de editor te openen. Pas het veld <strong>"Expositieruimte / Collectie (Zaal)"</strong> aan. Zodra je een nieuwe naam typt, wordt de zaal aangemaakt of verplaatst het werk.</p>
                             </div>
                             <div className="space-y-2">
                                <p className="font-bold text-foreground text-sm uppercase tracking-wide">In Bulk (Selectie):</p>
                                <p>Gebruik de Batch-werkbalk onderaan. Typ de naam van de doelzaal in het tekstveld en klik op de <strong>[Pijl naar map]</strong> knop om alle geselecteerde werken in één keer te verplaatsen.</p>
                             </div>
                             <div className="space-y-2 border-t border-accent/20 pt-4">
                                <p className="font-bold text-foreground text-sm uppercase tracking-wide">Samenvoegen:</p>
                                <p>Klik bovenaan dit tabblad bij een zaal op <strong>[Selecteer alles]</strong>. De tool selecteert alle werken en brengt je naar het archief. Gebruik dan de Batch-werkbalk om ze naar de nieuwe gezamenlijke zaal te verplaatsen.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Verwijderen */}
                    <div className="flex flex-col md:flex-row gap-12">
                       <div className="md:w-1/3 space-y-4">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100">
                             <Trash2 className="w-3.5 h-3.5 text-red-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Stap 3</span>
                          </div>
                          <h3 className="text-2xl font-headline italic">Verwijderen & Archiveren</h3>
                       </div>
                       <div className="md:w-2/3 space-y-6 text-muted-foreground leading-relaxed">
                          <p>Er is een belangrijk verschil tussen archiveren en permanent verwijderen:</p>
                          <div className="grid sm:grid-cols-2 gap-8">
                             <div className="space-y-2">
                                <div className="flex items-center gap-2 text-foreground font-bold"><Archive className="w-4 h-4" /> Archiveren</div>
                                <p className="text-xs">Gebruik de knop <strong>[Naar Archief]</strong> in de batch-werkbalk. De werken worden verplaatst naar de zaal 'Archief' en zijn direct onzichtbaar voor bezoekers, maar blijven bewaard in je beheer.</p>
                             </div>
                             <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-500 font-bold"><Trash2 className="w-4 h-4" /> Permanent Wissen</div>
                                <p className="text-xs">Klik op de <strong>[Rode Prullenbak]</strong> in de editor of batch-werkbalk. Dit wist het schilderij volledig uit de database en de opslag. Dit kan niet ongedaan worden gemaakt.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Zalen Beheren */}
                    <div className="flex flex-col md:flex-row gap-12">
                       <div className="md:w-1/3 space-y-4">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                             <Eye className="w-3.5 h-3.5 text-accent" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Stap 4</span>
                          </div>
                          <h3 className="text-2xl font-headline italic">Zalen Openen/Sluiten</h3>
                       </div>
                       <div className="md:w-2/3 space-y-6 text-muted-foreground leading-relaxed">
                          <p>Bovenaan dit scherm in het zalenoverzicht:</p>
                          <ul className="space-y-4 list-none p-0">
                             <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0"><EyeOff className="w-3 h-3" /></div>
                                <span><strong>Sluit Zaal:</strong> De zaal verdwijnt uit alle menu's en navigatie op de website. Bezoekers kunnen de werken niet meer zien, maar jij kunt ze in het beheer nog wel bewerken.</span>
                             </li>
                             <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0"><Languages className="w-3 h-3" /></div>
                                <span><strong>Vertalen:</strong> Gebruik het "Vertaal Station" hierboven om de naam van de zaal in 4 talen in te vullen. Zo zien buitenlandse bezoekers de juiste namen in hun menu.</span>
                             </li>
                          </ul>
                       </div>
                    </div>
                  </div>
               </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
             <Card className="p-6 rounded-3xl border-none shadow-xl bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-8 border-l-4 border-accent pl-4">
                   <TrendingUp className="w-5 h-5 text-accent" />
                   <h2 className="text-[12px] font-bold uppercase tracking-widest text-accent">Omzet & Historie</h2>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                      <TableHead>Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Werk</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders && orders.length > 0 ? orders.sort((a:any, b:any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map((order: any) => (
                      <TableRow key={order.id} className="text-xs group hover:bg-black/5 transition-colors">
                        <TableCell className="font-mono opacity-50">{order.timestamp?.toDate().toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="font-bold">{order.customerName}</div>
                          <div className="text-[10px] opacity-40">{order.customerEmail}</div>
                        </TableCell>
                        <TableCell className="italic">{order.artworkTitle}</TableCell>
                        <TableCell className="uppercase text-[9px] font-bold">{order.productType}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                            order.status === 'paid' ? "bg-green-100 text-green-700" : "bg-accent/10 text-accent"
                          )}>
                            {order.status || 'nieuw'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 opacity-30 uppercase font-bold tracking-widest italic">Nog geen transacties geregistreerd</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
             </Card>
          </TabsContent>

          <TabsContent value="branding">
             <Card className="p-8 md:p-12 rounded-3xl max-w-4xl mx-auto space-y-12 shadow-2xl border-none bg-white">
                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                      <Palette className="w-5 h-5 text-accent" />
                      <h2 className="text-[12px] font-bold uppercase tracking-widest text-accent">White Label Configuratie</h2>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Museum Naam</Label>
                            <Input defaultValue={siteSettings?.siteTitle || ''} onBlur={(e) => updateSettingsField('siteTitle', e.target.value)} placeholder="Bijv: Studio Sophie" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Slogan / Artist Quote</Label>
                            <Input defaultValue={siteSettings?.siteSubtitle || ''} onBlur={(e) => updateSettingsField('siteSubtitle', e.target.value)} placeholder="Bijv: Meester in Atmosfeer" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Notificatie Email (Orders)</Label>
                            <Input defaultValue={siteSettings?.adminEmail || ''} onBlur={(e) => updateSettingsField('adminEmail', e.target.value)} placeholder="artist@email.com" />
                         </div>
                      </div>

                      <div className="space-y-4 bg-accent/5 p-6 rounded-2xl border border-accent/10 flex flex-col items-center justify-center">
                         <Label className="text-[10px] uppercase opacity-60 mb-4 block w-full text-center">Artist Logo</Label>
                         <div className="w-32 h-32 rounded-2xl bg-white flex items-center justify-center border-2 border-dashed border-accent/20 mb-4 overflow-hidden shadow-inner">
                            {siteSettings?.logoUrl ? <img src={siteSettings.logoUrl} className="max-w-full max-h-full object-contain p-2" alt="Logo" /> : <ImageIcon className="w-8 h-8 opacity-20" />}
                         </div>
                         <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpload} accept="image/*" />
                         <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="rounded-full border-accent/40 text-accent font-bold uppercase text-[9px] px-6">Upload Merklogo</Button>
                      </div>
                   </div>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="payments">
             <Card className="p-8 md:p-12 rounded-3xl max-w-4xl mx-auto space-y-8 shadow-2xl border-none bg-white">
                <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                   <CreditCard className="w-5 h-5 text-primary" />
                   <h2 className="text-[12px] font-bold uppercase tracking-widest text-primary">Betaalmodule (Stripe)</h2>
                </div>

                <div className="bg-primary/5 p-8 rounded-2xl space-y-6 border border-primary/10">
                   <div className="flex items-center justify-between border-b border-primary/10 pb-6">
                      <div className="space-y-1">
                         <h4 className="font-bold text-sm">Directe verkoop inschakelen</h4>
                         <p className="text-xs text-muted-foreground italic">Zodra ingeschakeld, kunnen bezoekers direct afrekenen via iDEAL of Creditcard.</p>
                      </div>
                      <Switch 
                        checked={siteSettings?.stripeEnabled} 
                        onCheckedChange={(val) => updateSettingsField('stripeEnabled', val)} 
                      />
                   </div>

                   <div className="grid gap-6">
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Stripe Public Key</Label>
                         <Input 
                           defaultValue={siteSettings?.stripePublicKey || ''} 
                           onBlur={(e) => updateSettingsField('stripePublicKey', e.target.value)} 
                           placeholder="pk_test_..." 
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Stripe Secret Key</Label>
                         <Input 
                           type="password"
                           defaultValue={siteSettings?.stripeSecretKey || ''} 
                           onBlur={(e) => updateSettingsField('stripeSecretKey', e.target.value)} 
                           placeholder="sk_test_..." 
                         />
                         <p className="text-[9px] text-muted-foreground italic">Alleen zichtbaar voor jou als beheerder. Veilig opgeslagen in de Cloud.</p>
                      </div>
                   </div>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="help">
             <div className="max-w-5xl mx-auto space-y-12 pb-24">
               <Card className="p-8 md:p-12 rounded-3xl shadow-2xl border-none bg-primary text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Coins className="w-64 h-64" /></div>
                  <div className="relative z-10 space-y-12">
                     <div className="space-y-2">
                        <h2 className="text-3xl font-headline font-light italic text-accent">De Digitaal Conservator Strategie</h2>
                        <p className="text-primary-foreground/70 text-sm">Jouw commerciële routekaart voor museumbeheer.</p>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-12">
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                           <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-accent" />
                              <h4 className="font-bold uppercase text-[11px] tracking-widest text-accent">De Vriendenprijs</h4>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Setup Fee</span>
                                 <span className="font-headline text-2xl">€250,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Service Fee (pm)</span>
                                 <span className="font-headline text-2xl">€25,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Commissie</span>
                                 <span className="font-headline text-2xl">10%</span>
                              </div>
                           </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-black/20 border border-white/5 space-y-6">
                           <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-red-400" />
                              <h4 className="font-bold uppercase text-[11px] tracking-widest text-red-400">Zakelijk Tarief</h4>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Setup Fee</span>
                                 <span className="font-headline text-2xl">€500,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Service Fee (pm)</span>
                                 <span className="font-headline text-2xl">€50,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Commissie</span>
                                 <span className="font-headline text-2xl">20%</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </Card>
             </div>
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-16 border-dashed border-4 border-muted flex flex-col items-center justify-center text-center space-y-6 bg-white shadow-inner">
                <CloudUpload className="w-16 h-16 opacity-20" />
                <div className="space-y-2">
                   <h2 className="text-xl font-headline font-light italic">Onthul nieuw werk</h2>
                   <p className="text-sm text-muted-foreground">Sleep hier de Master Files (min. 4000px) naar binnen.</p>
                   <div className="flex items-center justify-center gap-2 mt-4 text-accent">
                      <CircleAlert className="w-4 h-4" />
                      <p className="text-[10px] uppercase font-bold tracking-widest italic">{t('asset_specs_pixels')}</p>
                   </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
                <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="rounded-full px-12 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-[11px] shadow-2xl transition-all">
                   {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />} Selecteer Bestanden
                </Button>
                {isUploading && (
                   <div className="w-full max-w-xs space-y-2">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[10px] uppercase font-bold opacity-40">{uploadStatus}</p>
                   </div>
                )}
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-none w-screen h-screen p-0 flex flex-col bg-background border-none rounded-none overflow-hidden fixed inset-0 translate-x-0 translate-y-0 left-0 top-0 z-[100]">
          <DialogTitle className="sr-only">Editor - {editingArtwork?.title}</DialogTitle>
          
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Linkerkant: Preview */}
            <div className="flex-1 bg-black/5 flex flex-col overflow-hidden">
              <div className="h-14 md:h-20 border-b border-black/5 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setEditingId(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-sm font-bold uppercase tracking-widest truncate">{editingArtwork?.displayTitle || editingArtwork?.title}</h2>
                 </div>
                 <div className="flex items-center gap-4">
                    {editingArtwork?.featured && <Star className="w-4 h-4 text-accent fill-accent" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">{editingArtwork?.series}</span>
                 </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-hidden relative">
                <div className="relative group max-w-full max-h-full overflow-hidden">
                  <img 
                    src={editingArtwork?.imageUrl} 
                    className="max-h-[70vh] w-auto object-contain shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] bg-white p-2" 
                    alt="Master Preview" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <Maximize2 className="text-white w-12 h-12" />
                  </div>
                </div>
              </div>
            </div>

            {/* Rechterkant: Formulier (Scrollbaar) */}
            <div className="w-full md:w-[450px] lg:w-[600px] shrink-0 bg-white border-l border-black/5 flex flex-col overflow-y-auto shadow-2xl z-10">
              <div className="p-8 space-y-12 pb-32">
                
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                     <Palette className="w-4 h-4 text-accent" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Identiteit & Locatie</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Publieke Titel</Label>
                       <Input 
                         defaultValue={editingArtwork?.displayTitle || ''} 
                         onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} 
                         placeholder="De naam zoals bezoekers hem zien"
                         className="h-12 border-black/10 focus:border-accent"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Expositieruimte / Collectie (Zaal)</Label>
                       <Input 
                         defaultValue={editingArtwork?.series || ''} 
                         onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} 
                         placeholder="Bijv: Polders of Archief"
                         className="h-12 border-black/10 focus:border-accent font-bold"
                       />
                       <p className="text-[9px] text-muted-foreground italic">Wijzig deze naam om het werk naar een andere zaal te verplaatsen of een nieuwe zaal te maken.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                     <Tag className="w-4 h-4 text-primary" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Tags & Curator Filters</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl">
                        <Tags className="w-4 h-4 opacity-30" />
                        <Input 
                          value={editingArtwork?.tags?.join(', ') || ''} 
                          onChange={(e) => updateArtworkField(editingId!, 'tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))} 
                          placeholder="zee, groet, licht"
                          className="bg-transparent border-none p-0 focus-visible:ring-0"
                        />
                    </div>

                    <div className="bg-accent/5 rounded-2xl p-6 space-y-6 border border-accent/10">
                       <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-accent">Snelkeuze Menu</span>
                       </div>

                       <div className="space-y-6">
                          {Object.entries(QUICK_TAG_CATEGORIES).map(([cat, tags]) => (
                            <div key={cat} className="space-y-2">
                               <Label className="text-[8px] uppercase font-bold opacity-40 block">{cat}</Label>
                               <div className="flex flex-wrap gap-1.5">
                                  {tags.map(tag => {
                                    const isActive = editingArtwork?.tags?.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        onClick={() => toggleTagInArtwork(editingId!, editingArtwork?.tags, tag)}
                                        className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                          isActive 
                                            ? "bg-accent text-accent-foreground border-accent" 
                                            : "bg-white border-black/10 text-muted-foreground hover:border-accent/40"
                                        )}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                               </div>
                            </div>
                          ))}

                          {allExistingTags.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-accent/10">
                               <Label className="text-[8px] uppercase font-bold opacity-40 block">Elders Gebruikt</Label>
                               <div className="flex flex-wrap gap-1.5">
                                  {allExistingTags.map(tag => {
                                    // Sla tags over die al in de categorieën staan
                                    const isStandard = Object.values(QUICK_TAG_CATEGORIES).flat().includes(tag);
                                    if (isStandard) return null;
                                    
                                    const isActive = editingArtwork?.tags?.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        onClick={() => toggleTagInArtwork(editingId!, editingArtwork?.tags, tag)}
                                        className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                          isActive 
                                            ? "bg-primary text-primary-foreground border-primary" 
                                            : "bg-black/5 border-transparent text-muted-foreground hover:bg-black/10"
                                        )}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                     <Info className="w-4 h-4 text-primary" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Specificaties</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Jaartal</Label>
                       <Input defaultValue={editingArtwork?.year || ''} onBlur={(e) => updateArtworkField(editingId!, 'year', e.target.value)} placeholder="bijv. 1954" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Afmetingen</Label>
                       <Input defaultValue={editingArtwork?.dimensions || ''} onBlur={(e) => updateArtworkField(editingId!, 'dimensions', e.target.value)} placeholder="bijv. 45x50 cm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Techniek / Medium</Label>
                     <Input defaultValue={editingArtwork?.medium || ''} onBlur={(e) => updateArtworkField(editingId!, 'medium', e.target.value)} placeholder="bijv. Olieverf op doek" />
                  </div>
                </div>

                <div className="space-y-6 bg-accent/5 p-6 rounded-3xl border border-accent/10">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                        <ShoppingBag className="w-4 h-4 text-accent" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Commercieel</h3>
                     </div>
                     <Switch checked={editingArtwork?.inShop} onCheckedChange={(val) => updateArtworkField(editingId!, 'inShop', val)} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[9px] uppercase font-bold opacity-40">Kaart (€)</Label>
                       <Input type="number" step="0.10" defaultValue={editingArtwork?.pricePostcard || 2.50} onBlur={(e) => updateArtworkField(editingId!, 'pricePostcard', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[9px] uppercase font-bold opacity-40">Poster (€)</Label>
                       <Input type="number" step="1" defaultValue={editingArtwork?.pricePoster || 24.00} onBlur={(e) => updateArtworkField(editingId!, 'pricePoster', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[9px] uppercase font-bold opacity-40">Art Print (€)</Label>
                       <Input type="number" step="1" defaultValue={editingArtwork?.pricePrint || 85.00} onBlur={(e) => updateArtworkField(editingId!, 'pricePrint', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[9px] uppercase font-bold opacity-40">Digitaal (€)</Label>
                       <Input type="number" step="1" defaultValue={editingArtwork?.priceDigital || 15.00} onBlur={(e) => updateArtworkField(editingId!, 'priceDigital', parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex items-center gap-2"><FileText className="w-3 h-3" /> Verhaal bij het werk</Label>
                  <Textarea 
                    defaultValue={editingArtwork?.description || ''} 
                    onBlur={(e) => updateArtworkField(editingId!, 'description', e.target.value)} 
                    placeholder="Vertel hier meer over de context of historie van dit werk..."
                    className="min-h-[150px] border-black/10 focus:border-accent resize-none rounded-2xl p-6"
                  />
                </div>

                <div className="pt-8 border-t border-black/5 space-y-4">
                   <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                      <div className="flex items-center gap-3">
                         <Star className={cn("w-4 h-4", editingArtwork?.featured ? "text-accent fill-accent" : "opacity-20")} />
                         <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Featured (Homepage)</Label>
                      </div>
                      <Switch checked={editingArtwork?.featured} onCheckedChange={(val) => updateArtworkField(editingId!, 'featured', val)} />
                   </div>
                   
                   <Button 
                     variant="destructive" 
                     className="w-full h-14 rounded-2xl uppercase font-bold tracking-widest text-[10px] flex items-center gap-3" 
                     onClick={() => { if(confirm('Dit werk permanent uit het archief verwijderen?')) { 
                       if (firestore && editingId) {
                         deleteDoc(doc(firestore, 'artworks', editingId)); 
                         setEditingId(null); 
                       }
                     }}}
                   >
                     <Trash2 className="w-4 h-4" /> Verwijder uit Collectie
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
