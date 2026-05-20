
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, setDoc } from 'firebase/firestore';
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
  Download,
  FileJson,
  PenTool,
  Home,
  User,
  Quote,
  Languages,
  Sparkles,
  Tag,
  Info,
  Calendar,
  Maximize,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Globe2,
  Mail
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { translateMuseumText } from '@/ai/flows/translate-flow';

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const { data: rawArtworks } = useCollection(artworksQuery);

  const parseTitleForSort = (title: string) => {
    if (!title) return { romanVal: 999, num: 999, suffix: '' };
    const romanMatch = title.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/i);
    const numMatch = title.match(/(\d+)([a-z]*)?/i);
    return {
      romanVal: romanMatch ? (ROMAN_VALUES[romanMatch[1].toUpperCase()] || 999) : 999,
      num: numMatch ? parseInt(numMatch[1], 10) : 999,
      suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
    };
  };

  const artworks = useMemo(() => {
    if (!rawArtworks) return [];
    const seen = new Set();
    const unique = rawArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    return [...unique].sort((a: any, b: any) => {
      const pA = parseTitleForSort(a.title || '');
      const pB = parseTitleForSort(b.title || '');
      if (pA.romanVal !== pB.romanVal) return pA.romanVal - pB.romanVal;
      if (pA.num !== pB.num) return pA.num - pB.num;
      return pA.suffix.localeCompare(pB.suffix);
    });
  }, [rawArtworks]);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art: any) => {
      const displayTitle = art.displayTitle || art.title || "";
      const matchesSearch = displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (art.title?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [artworks, searchQuery]);

  const editingArtwork = useMemo(() => {
    if (!editingId) return null;
    return artworks.find((art: any) => art.id === editingId);
  }, [artworks, editingId]);

  const navigateEditor = useCallback((direction: 'next' | 'prev') => {
    if (!editingId || !filteredArtworks.length) return;
    const currentIndex = filteredArtworks.findIndex((art: any) => art.id === editingId);
    if (currentIndex === -1) return;
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setEditingId(filteredArtworks[nextIndex].id);
  }, [editingId, filteredArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') navigateEditor('next');
      if (e.key === 'ArrowLeft') navigateEditor('prev');
      if (e.key === 'Escape') setEditingId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, navigateEditor]);

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' }));
    });
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'site');
    setDoc(settingsRef, { [field]: value }, { merge: true }).catch(async () => 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsRef.path, operation: 'update' }))
    );
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
        setUploadStatus(`Uploaden: ${file.name} (${processedCount + 1}/${totalFiles})`);
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
          year: "", dimensions: ""
        });
        processedCount++;
        setUploadProgress((processedCount / totalFiles) * 100);
      } catch (e) { console.error(e); }
    }
    setIsUploading(false);
    setUploadStatus('');
    toast({ title: "Upload voltooid" });
  };

  const handleExportBackup = () => {
    const exportData = {
      version: "3.1",
      exportedAt: new Date().toISOString(),
      artworks: artworks,
      settings: siteSettings || {}
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thijs-sterk-master-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Onbekend";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" className="h-10 w-auto" alt="Logo" />
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <h1 className="font-headline text-lg font-light text-foreground">Digitaal Museum</h1>
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-accent">Thijs Sterk &bull; Beheer</span>
          </div>
        </div>
        <Link href="/" className="text-[11px] uppercase tracking-widest font-black text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Website
        </Link>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="archive" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto flex flex-wrap justify-center h-auto">
            <TabsTrigger value="archive" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Archief [{artworks.length}]</TabsTrigger>
            <TabsTrigger value="upload" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Upload</TabsTrigger>
            <TabsTrigger value="texts" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Pagina Teksten</TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Master Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input 
                    placeholder="Zoek op titel, bestandsnaam of zaal..." 
                    className="pl-12 h-12 bg-white/50 border-none rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="text-[9px] font-black uppercase opacity-40">Groepering op Romeinse Cijfers (I, II, III...)</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredArtworks.map((art: any) => (
                <Card key={art.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all" onClick={() => setEditingId(art.id)}>
                  <div className="aspect-square bg-muted/20">
                    <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} style={{ filter: `brightness(${art.brightness || 1})` }} />
                  </div>
                  <CardContent className="p-2 text-center">
                    <h4 className="text-[9px] font-black uppercase truncate">{art.displayTitle || art.title}</h4>
                    <p className="text-[7px] opacity-40 uppercase font-bold mt-1">{art.series}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-24 border-dashed border-4 border-muted flex flex-col items-center justify-center text-center space-y-6">
                <CloudUpload className="w-16 h-16 opacity-20" />
                <div className="space-y-2">
                   <h2 className="text-xl font-headline font-light">Nieuwe werken toevoegen</h2>
                   <p className="text-sm text-muted-foreground max-w-md mx-auto">Upload hier meerdere foto's tegelijk. Ze verschijnen direct in de categorie 'Nieuwe Uploads'.</p>
                </div>
                <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="rounded-full px-12">
                   {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />} 
                   Selecteer Foto's
                </Button>
                {isUploading && (
                  <div className="w-full max-w-md space-y-4">
                     <Progress value={uploadProgress} />
                     <p className="text-[10px] uppercase font-black tracking-widest text-accent">{uploadStatus}</p>
                  </div>
                )}
             </Card>
          </TabsContent>

          <TabsContent value="texts">
            <Card className="p-8 md:p-12 rounded-3xl max-w-4xl mx-auto space-y-12">
              <div className="space-y-2 text-center border-b border-border/20 pb-8">
                  <PenTool className="w-8 h-8 mx-auto text-accent mb-4" />
                  <h2 className="text-2xl font-headline font-light">Website Teksten</h2>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Beheer hier alle biografieën en het openingswoord</p>
                  <Link href="/admin/translate">
                    <Button variant="outline" className="mt-6 rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                      <Globe2 className="w-4 h-4 mr-2" /> Naar het Vertaal Station
                    </Button>
                  </Link>
              </div>

              <div className="grid gap-12">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <Home className="w-4 h-4 text-accent" />
                       <Label className="text-[11px] font-black uppercase text-accent border-l-4 border-accent pl-4 block">Introductie Tekst (Bovenaan Homepagina)</Label>
                    </div>
                    <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Kopregel (Groot)</Label>
                        <Input defaultValue={siteSettings?.homeHeroTitle || ''} onBlur={(e) => updateSettingsField('homeHeroTitle', e.target.value)} className="bg-white border-none font-headline text-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Openingswoord</Label>
                        <Textarea key={siteSettings?.homeHeroIntro} defaultValue={siteSettings?.homeHeroIntro || ''} onBlur={(e) => updateSettingsField('homeHeroIntro', e.target.value)} className="min-h-[150px] bg-white border-none p-6 text-base font-light" />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-8 border-t border-border/10">
                    <div className="flex items-center gap-3">
                       <Quote className="w-4 h-4 text-accent" />
                       <Label className="text-[11px] font-black uppercase text-accent border-l-4 border-accent pl-4 block">Biografie Thijs Sterk</Label>
                    </div>
                    <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Biografie Titel</Label>
                        <Input defaultValue={siteSettings?.homeBioTitle || ''} onBlur={(e) => updateSettingsField('homeBioTitle', e.target.value)} className="bg-white border-none font-headline text-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Biografische Tekst</Label>
                        <Textarea key={siteSettings?.homeBio} defaultValue={siteSettings?.homeBio || ''} onBlur={(e) => updateSettingsField('homeBio', e.target.value)} className="min-h-[200px] bg-white border-none p-6 text-base font-light" />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-8 border-t border-border/10">
                    <div className="flex items-center gap-3">
                       <Mail className="w-4 h-4 text-accent" />
                       <Label className="text-[11px] font-black uppercase text-accent border-l-4 border-accent pl-4 block">Contact Sectie Teksten</Label>
                    </div>
                    <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Contact Titel</Label>
                        <Input defaultValue={siteSettings?.contactTitle || 'Informatie & Uw Verhalen'} onBlur={(e) => updateSettingsField('contactTitle', e.target.value)} className="bg-white border-none font-headline text-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Contact Introductie</Label>
                        <Textarea defaultValue={siteSettings?.contactIntro || ''} onBlur={(e) => updateSettingsField('contactIntro', e.target.value)} className="min-h-[100px] bg-white border-none p-4 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Contact Quote (Italic)</Label>
                        <Textarea defaultValue={siteSettings?.contactQuote || ''} onBlur={(e) => updateSettingsField('contactQuote', e.target.value)} className="min-h-[100px] bg-white border-none p-4 text-sm italic" />
                      </div>
                    </div>
                 </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-12 text-center space-y-8">
              <FileJson className="w-12 h-12 mx-auto opacity-20" />
              <h2 className="text-xl font-headline font-light">Master Backup</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={handleExportBackup} size="lg" className="rounded-full px-12"><Download className="mr-2" /> Download Backup</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none">
          <DialogTitle className="sr-only">Editor</DialogTitle>
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4 relative group">
             {editingArtwork && (
               <>
                  <button onClick={() => navigateEditor('prev')} className="absolute left-8 z-10 p-4 rounded-full bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"><ChevronLeft className="w-8 h-8" /></button>
                  <img src={editingArtwork.imageUrl} className="max-h-[60vh] object-contain shadow-2xl" alt="Preview" style={{ filter: `brightness(${editingArtwork.brightness || 1})` }} />
                  <div className="absolute top-4 right-4"><Button variant="destructive" size="icon" onClick={() => { if(confirm('Zeker weten?')) { deleteDoc(doc(firestore!, 'artworks', editingId!)); setEditingId(null); }}} className="rounded-full"><Trash2 className="w-4 h-4" /></Button></div>
                  <button onClick={() => navigateEditor('next')} className="absolute right-8 z-10 p-4 rounded-full bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-8 h-8" /></button>
               </>
             )}
          </div>
          <div className="h-[45vh] border-t p-8 bg-background overflow-y-auto">
             {editingArtwork && (
               <div className="max-w-7xl mx-auto space-y-8">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4 bg-muted/20 p-6 rounded-2xl">
                      <Label className="text-[10px] font-black uppercase opacity-60">Publieke Titel</Label>
                      <Input key={`displayTitle-${editingId}`} defaultValue={editingArtwork?.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} />
                      <Label className="text-[10px] font-black uppercase opacity-60">Jaartal</Label>
                      <Input key={`year-${editingId}`} defaultValue={editingArtwork?.year || ''} onBlur={(e) => updateArtworkField(editingId!, 'year', e.target.value)} />
                      <Label className="text-[10px] font-black uppercase opacity-60">Zaal / Serie</Label>
                      <Input key={`series-${editingId}`} defaultValue={editingArtwork?.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 space-y-4 bg-black/[0.02] p-6 rounded-2xl border border-black/5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-accent">Tags</Label>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                         {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
                           <div key={category} className="space-y-2">
                              <Label className="text-[9px] font-black uppercase opacity-40">{category}</Label>
                              <div className="flex flex-wrap gap-1">
                                 {tags.map(tag => {
                                   const hasTag = editingArtwork?.tags?.includes(tag);
                                   return (
                                     <button key={tag} onClick={() => {
                                       const current = editingArtwork?.tags || [];
                                       const next = hasTag ? current.filter((t: string) => t !== tag) : [...current, tag];
                                       updateArtworkField(editingId!, 'tags', next);
                                     }} className={cn("px-2 py-1 rounded text-[9px] font-black uppercase border", hasTag ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground")}>{tag}</button>
                                   )
                                 })}
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
