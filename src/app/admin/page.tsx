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
  Sparkles
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
  "Techniek": ["Olieverf", "Aquarel", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
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
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: rawArtworks } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!rawArtworks) return [];
    const seen = new Set();
    return rawArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [rawArtworks]);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const filteredArtworks = useMemo(() => {
    return artworks.filter(art => {
      const displayTitle = art.displayTitle || art.title || "";
      const matchesSearch = displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [artworks, searchQuery]);

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' }));
      });
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'site');
    setDoc(settingsRef, { [field]: value }, { merge: true })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsRef.path, operation: 'update' })));
  };

  const handleTranslate = async (field: string, currentText: string, context: string) => {
    if (!currentText || isTranslating) return;
    setIsTranslating(field);
    try {
      const result = await translateMuseumText({ text: currentText, context });
      updateSettingsField(field, result.translatedText);
      toast({ title: "Vertaling voltooid", description: "De tekst is bijgewerkt." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Vertaling mislukt", description: "Probeer het later opnieuw." });
    } finally {
      setIsTranslating(null);
    }
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
        const storageRef = ref(storage, `artworks/${timestamp}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        await addDoc(collection(firestore, 'artworks'), {
          title: file.name.split('.')[0] || "Naamloos",
          series: "Nieuwe Uploads",
          imageUrl: downloadUrl,
          createdAt: serverTimestamp(),
          cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1
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
      version: "2.5",
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
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
                    placeholder="Zoek in collectie..." 
                    className="pl-12 h-12 bg-white/50 border-none rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
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
              </div>

              <div className="grid gap-12">
                 {/* Introductie Tekst (Bovenaan Homepagina) */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Home className="w-4 h-4 text-accent" />
                         <Label className="text-[11px] font-black uppercase text-accent border-l-4 border-accent pl-4 block">Introductie Tekst (Bovenaan Homepagina)</Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] uppercase font-black tracking-widest text-accent hover:text-accent/70"
                        onClick={() => handleTranslate('homeHeroIntro', siteSettings?.homeHeroIntro || '', 'Introductietekst bovenaan de homepagina')}
                        disabled={!!isTranslating}
                      >
                        {isTranslating === 'homeHeroIntro' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                        Vertaal naar Engels (AI)
                      </Button>
                    </div>
                    <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Kopregel (Groot)</Label>
                        <Input 
                          defaultValue={siteSettings?.homeHeroTitle || 'Een leven gewijd aan Licht, Ruimte en Water'} 
                          onBlur={(e) => updateSettingsField('homeHeroTitle', e.target.value)}
                          className="bg-white border-none font-headline text-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Openingswoord / Introductie</Label>
                        <Textarea 
                          key={siteSettings?.homeHeroIntro}
                          defaultValue={siteSettings?.homeHeroIntro || ''} 
                          onBlur={(e) => updateSettingsField('homeHeroIntro', e.target.value)} 
                          className="min-h-[200px] bg-white border-none p-6 text-base leading-relaxed font-light" 
                          placeholder="De tekst die direct bovenaan de homepagina verschijnt..." 
                        />
                      </div>
                    </div>
                 </div>

                 {/* Thijs Sterk Hoofd Bio (Onderaan Homepagina) */}
                 <div className="space-y-4 pt-8 border-t border-border/10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Quote className="w-4 h-4 text-accent" />
                          <Label className="text-[11px] font-black uppercase text-accent border-l-4 border-accent pl-4 block">Biografie Thijs Sterk (Onderaan Homepagina)</Label>
                       </div>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] uppercase font-black tracking-widest text-accent hover:text-accent/70"
                        onClick={() => handleTranslate('homeBio', siteSettings?.homeBio || '', 'Hoofdbiografie van de artiest Thijs Sterk')}
                        disabled={!!isTranslating}
                      >
                        {isTranslating === 'homeBio' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                        Vertaal naar Engels (AI)
                      </Button>
                    </div>
                    <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Biografie Titel / Kopregel</Label>
                        <Input 
                          defaultValue={siteSettings?.homeBioTitle || 'Een leven gewijd aan de Essentie'} 
                          onBlur={(e) => updateSettingsField('homeBioTitle', e.target.value)}
                          className="bg-white border-none font-headline text-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase opacity-50">Biografische Tekst</Label>
                        <Textarea 
                          key={siteSettings?.homeBio}
                          defaultValue={siteSettings?.homeBio || ''} 
                          onBlur={(e) => updateSettingsField('homeBio', e.target.value)} 
                          className="min-h-[250px] bg-white border-none p-6 text-base leading-relaxed font-light" 
                          placeholder="De hoofdtekst over Thijs Sterk die onderaan de homepagina verschijnt..." 
                        />
                      </div>
                    </div>
                 </div>

                 {/* Leo Duppen Bio */}
                 <div className="space-y-4 pt-8 border-t border-border/10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <User className="w-4 h-4 opacity-40" />
                          <Label className="text-[11px] font-black uppercase opacity-60 block">Leo Duppen (Kunsthistoricus)</Label>
                       </div>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] uppercase font-black tracking-widest opacity-40 hover:opacity-100"
                        onClick={() => handleTranslate('leoDuppenBio', siteSettings?.leoDuppenBio || '', 'Biografie van kunsthistoricus Leo Duppen')}
                        disabled={!!isTranslating}
                      >
                        {isTranslating === 'leoDuppenBio' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                        Vertaal naar Engels (AI)
                      </Button>
                    </div>
                    <Textarea 
                      key={siteSettings?.leoDuppenBio}
                      defaultValue={siteSettings?.leoDuppenBio || ''} 
                      onBlur={(e) => updateSettingsField('leoDuppenBio', e.target.value)} 
                      className="min-h-[150px] bg-black/5 border-none rounded-xl p-4 text-sm" 
                      placeholder="Biografie Leo Duppen..." 
                    />
                 </div>

                 <div className="grid md:grid-cols-2 gap-12 pt-8 border-t border-border/10">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Hanneke Sterk (Dochter)</Label>
                        <Textarea 
                          defaultValue={siteSettings?.hannekeBio || ''} 
                          onBlur={(e) => updateSettingsField('hannekeBio', e.target.value)} 
                          className="min-h-[120px] bg-black/5 border-none text-xs rounded-xl p-4" 
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Beatrijs Sterk (Dochter)</Label>
                        <Textarea 
                          defaultValue={siteSettings?.beatrijsBio || ''} 
                          onBlur={(e) => updateSettingsField('beatrijsBio', e.target.value)} 
                          className="min-h-[120px] bg-black/5 border-none text-xs rounded-xl p-4" 
                        />
                    </div>
                 </div>

                 <div className="space-y-4 pt-8 border-t border-border/10">
                    <Label className="text-[10px] font-black uppercase opacity-60">Peter Bes (Leerling)</Label>
                    <Textarea 
                      defaultValue={siteSettings?.peterBesBio || ''} 
                      onBlur={(e) => updateSettingsField('peterBesBio', e.target.value)} 
                      className="min-h-[120px] bg-black/5 border-none text-xs rounded-xl p-4" 
                    />
                 </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-12 text-center space-y-8">
              <div className="space-y-2">
                 <FileJson className="w-12 h-12 mx-auto opacity-20" />
                 <h2 className="text-xl font-headline font-light">Master Backup</h2>
                 <p className="text-sm text-muted-foreground">Download een volledig overzicht van alle schermtitels, tags en uitsnedes als veiligheidsnet.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={handleExportBackup} size="lg" className="rounded-full px-12"><Download className="mr-2" /> Download Master Backup</Button>
                <Button variant="outline" size="lg" className="rounded-full px-12 border-accent text-accent hover:bg-accent/5">
                  <Languages className="mr-2 w-4 h-4" /> Batch Vertaling Starten
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background">
          <DialogTitle className="sr-only">Editor</DialogTitle>
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4">
             {editingArtwork && (
               <div className="relative max-h-full">
                  <img src={editingArtwork.imageUrl} className="max-h-[60vh] object-contain shadow-2xl" />
                  <div className="absolute top-4 right-4 flex gap-2">
                     <Button variant="destructive" size="icon" onClick={() => { if(confirm('Zeker weten?')) { deleteDoc(doc(firestore!, 'artworks', editingId!)); setEditingId(null); }}} className="rounded-full shadow-xl"><Trash2 className="w-4 h-4" /></Button>
                  </div>
               </div>
             )}
          </div>
          <div className="h-[40vh] border-t p-8 bg-background overflow-y-auto">
             <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40">Schermtitel</Label>
                    <Input defaultValue={editingArtwork?.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40">Zaal / Serie</Label>
                    <Input defaultValue={editingArtwork?.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                   <Label className="text-[10px] font-black uppercase opacity-40">Tags & Categorieën</Label>
                   <div className="flex flex-wrap gap-1">
                      {Object.values(TAG_CATEGORIES).flat().map(tag => {
                        const hasTag = editingArtwork?.tags?.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const current = editingArtwork?.tags || [];
                              const next = hasTag ? current.filter((t: string) => t !== tag) : [...current, tag];
                              updateArtworkField(editingId!, 'tags', next);
                            }}
                            className={cn(
                              "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all border",
                              hasTag ? "bg-accent text-accent-foreground border-accent" : "bg-transparent text-muted-foreground border-border opacity-40 hover:opacity-100"
                            )}
                          >
                            {tag}
                          </button>
                        )
                      })}
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase opacity-40">Jaartal / Periode</Label>
                      <Input defaultValue={editingArtwork?.year || ''} onBlur={(e) => updateArtworkField(editingId!, 'year', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <Label className="text-[10px] font-black uppercase">Toon op homepagina</Label>
                      <input 
                        type="checkbox" 
                        checked={editingArtwork?.featured || false} 
                        onChange={(e) => updateArtworkField(editingId!, 'featured', e.target.checked)}
                        className="w-5 h-5 accent-accent"
                      />
                   </div>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
