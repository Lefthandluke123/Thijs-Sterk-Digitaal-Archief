"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useStorage, useDoc } from '@/firebase';
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
  Minus,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Cloud,
  Star,
  CheckCircle2,
  Download,
  CloudUpload,
  Image as ImageIcon,
  Sun
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const STANDARD_TAGS = [
  "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
  "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
  "Bloemen", "Dieren", "Water", "Portretten", "Atmosferisch", "Licht", "Polder", "Kust"
];

// Precision button with auto-repeat for both click and hold
function RepeatButton({ onClick, children, className, disabled }: { onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    onClick();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onClick();
      }, 60);
    }, 400);
  }, [onClick]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("select-none", className)}
      disabled={disabled}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      onClick={(e) => { e.preventDefault(); }} 
    >
      {children}
    </Button>
  );
}

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDirInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: settings } = useDoc(settingsRef);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: isCollectionLoading } = useCollection(artworksQuery);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter(art => 
      (art.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [artworks, searchQuery]);

  const editingArtwork = useMemo(() => {
    return artworks?.find(art => art.id === editingId) || null;
  }, [artworks, editingId]);

  const navigateEditing = useCallback((direction: 'next' | 'prev') => {
    if (!editingId || !filteredArtworks.length) return;
    const currentIndex = filteredArtworks.findIndex(art => art.id === editingId);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setEditingId(filteredArtworks[nextIndex].id);
  }, [editingId, filteredArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingId) return;
      if (e.key === 'ArrowRight') navigateEditing('next');
      if (e.key === 'ArrowLeft') navigateEditing('prev');
      if (e.key === 'Escape') setEditingId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, navigateEditing]);

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || files.length === 0 || !storage || !firestore) return;
    setIsUploading(true);
    setUploadProgress(0);
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) continue;

      const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setUploadStatus(`Uploaden: ${file.name} (${i + 1}/${totalFiles})`);
      const storageRef = ref(storage, `artworks/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        await addDoc(collection(firestore, 'artworks'), { 
          title: fileNameOnly, 
          series: "Nieuwe Uploads", 
          imageUrl: downloadUrl, 
          medium: "Olieverf op doek", 
          year: new Date().getFullYear().toString(), 
          description: "", 
          imageHint: "painting", 
          tags: [], 
          cropTop: 0, 
          cropBottom: 0, 
          cropLeft: 0, 
          cropRight: 0, 
          brightness: 1, 
          featured: false, 
          createdAt: serverTimestamp() 
        });
        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        toast({ variant: "destructive", title: "Fout", description: `Kon ${file.name} niet uploaden.` });
      }
    }
    setIsUploading(false);
    setUploadStatus('');
    toast({ title: "Upload voltooid" });
    setActiveTab('archive');
  };

  const handleBulkUpload = async () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const artworksArray = JSON.parse(bulkJson);
      const items = Array.isArray(artworksArray) ? artworksArray : [artworksArray];
      for (const item of items) {
        const { id, createdAt, ...rest } = item;
        await addDoc(collection(firestore, 'artworks'), { ...rest, createdAt: serverTimestamp() });
      }
      toast({ title: "Import voltooid" });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "Ongeldig formaat." });
    } finally { setLoading(false); }
  };

  const updateArtworkField = async (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    setIsSaving(true);
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' })))
      .finally(() => {
        setTimeout(() => setIsSaving(false), 300);
      });
  };

  const toggleTag = (tag: string) => {
    if (!editingArtwork) return;
    const currentTags = editingArtwork.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter((t: string) => t !== tag) 
      : [...currentTags, tag];
    updateArtworkField(editingArtwork.id, 'tags', newTags);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />
      <input type="file" ref={jsonFileInputRef} style={{ display: 'none' }} onChange={(e) => { const reader = new FileReader(); reader.onload = (ev) => setBulkJson(ev.target?.result as string); reader.readAsText(e.target.files![0]); }} accept=".json" />
      <input type="file" ref={logoInputRef} style={{ display: 'none' }} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file || !storage || !firestore) return;
        setLoading(true);
        const storageRef = ref(storage, `site/logo_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        await setDoc(doc(firestore, 'settings', 'site'), { logoUrl: url }, { merge: true });
        toast({ title: "Logo opgeslagen" });
        setLoading(false);
      }} accept="image/*" />

      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings?.logoUrl ? <img src={settings.logoUrl} className="h-6 w-auto mr-2" /> : <Cloud className="w-5 h-5 text-accent" />}
          <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => {
            const exportData = artworks?.map(({ id, createdAt, ...rest }) => rest);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "thijs-sterk-archive.json"; a.click();
          }} className="text-[10px] uppercase tracking-widest font-bold"><Download className="w-3 h-3 mr-2" /> Export</Button>
          <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2"><ArrowLeft className="w-3 h-3" /> Website</Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-muted/50 p-1 rounded-full w-fit">
              <TabsTrigger value="archive" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Archief ({artworks?.length || 0})</TabsTrigger>
              <TabsTrigger value="upload" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Cloud Upload</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Bulk Import</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Instellingen</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Zoek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full h-10 text-xs bg-muted/30 border-none" />
            </div>
          </div>

          <TabsContent value="archive">
            {isCollectionLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : artworks && artworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredArtworks.map((art: any) => (
                  <Card key={art.id} className={cn("overflow-hidden bg-card border-border rounded-xl group cursor-pointer transition-all hover:ring-1 hover:ring-accent", art.featured && "ring-1 ring-accent")} onClick={() => setEditingId(art.id)}>
                    <div className="relative aspect-square bg-muted/20">
                      <img src={art.imageUrl} className="w-full h-full object-cover" style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }} />
                    </div>
                    <CardContent className="p-2 text-center"><h4 className="text-[10px] font-black text-black uppercase tracking-widest truncate">{art.title}</h4></CardContent>
                  </Card>
                ))}
              </div>
            ) : <div className="py-32 text-center opacity-40">Geen werken in de cloud.</div>}
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-16 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto">
                <CloudUpload className="w-12 h-12 text-accent" />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-24 rounded-2xl font-bold uppercase tracking-widest text-[11px]"><Plus className="w-4 h-4 mr-2" />Bestanden</Button>
                  <Button onClick={() => uploadDirInputRef.current?.click()} disabled={isUploading} variant="secondary" className="h-24 rounded-2xl font-bold uppercase tracking-widest text-[11px]"><FolderOpen className="w-4 h-4 mr-2" />Map</Button>
                </div>
                {isUploading && (
                  <div className="w-full space-y-4">
                    <Progress value={uploadProgress} className="h-1 bg-black/10" />
                    <p className="text-[8px] font-black text-black uppercase text-center">{uploadStatus}</p>
                  </div>
                )}
              </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-8 rounded-3xl max-w-4xl mx-auto space-y-6">
              <Label className="text-[8px] font-black text-black uppercase tracking-widest">JSON Data</Label>
              <Textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => jsonFileInputRef.current?.click()} variant="outline" className="h-14 rounded-xl text-[10px] font-bold uppercase tracking-widest">Bestand Kiezen</Button>
                <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="h-14 rounded-xl font-bold uppercase tracking-widest">Importeer</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-12 rounded-3xl max-w-2xl mx-auto space-y-8">
              <h3 className="font-headline text-2xl font-light">Instellingen</h3>
              <div className="flex items-center gap-6 p-6 border rounded-2xl bg-muted/10">
                <div className="w-24 h-24 bg-white rounded-xl border flex items-center justify-center overflow-hidden">
                  {settings?.logoUrl ? <img src={settings.logoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="opacity-20" />}
                </div>
                <Button onClick={() => logoInputRef.current?.click()} className="rounded-full px-6 text-[10px] font-bold uppercase tracking-widest">Logo Uploaden</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Master Editor (75/25)</DialogTitle>
          
          {/* Top 75% - Museale Preview */}
          <div className="relative h-[75vh] w-full flex items-center justify-center overflow-hidden bg-[#f3f3f3] group">
            {editingArtwork && (
              <img 
                src={editingArtwork.imageUrl} 
                className="max-w-[90%] max-h-[90%] object-contain transition-all duration-300 shadow-2xl" 
                style={{ 
                  clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`, 
                  filter: `brightness(${editingArtwork.brightness || 1})` 
                }} 
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-12 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => navigateEditing('prev')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10"><ChevronLeft className="w-8 h-8 text-black" /></button>
              <button onClick={() => navigateEditing('next')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10"><ChevronRight className="w-8 h-8 text-black" /></button>
            </div>
            <div className="absolute top-4 right-4 flex gap-4 items-center">
              <Button variant="ghost" size="icon" onClick={() => editingArtwork && handleDeleteArtwork(editingArtwork.id)} className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
              <DialogClose className="h-6 w-6 flex items-center justify-center bg-black/10 rounded-full hover:bg-black/20"><X className="w-3 h-3 text-black" /></DialogClose>
            </div>
          </div>

          {/* Bottom 25% - Parameterbalk */}
          <div className="h-[25vh] w-full bg-background border-t border-black/10 px-8 py-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
            <div className="flex items-start gap-12 w-full h-full">
              
              {/* Identiteit & Status (Small) */}
              <div className="flex flex-col gap-3 min-w-[160px] border-r border-black/5 pr-8">
                <div className="space-y-1">
                  <Label className="text-[8px] font-black text-black uppercase tracking-widest">Titel</Label>
                  <Input 
                    defaultValue={editingArtwork?.title || ''} 
                    onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'title', e.target.value)} 
                    className="h-7 text-[8px] font-black text-black uppercase border-none bg-black/5 rounded-sm p-1.5"
                  />
                </div>
                <div className="flex items-center justify-between bg-black/5 p-1.5 rounded-sm">
                  <span className="text-[8px] font-black text-black uppercase tracking-widest">Home</span>
                  <Switch 
                    checked={editingArtwork?.featured || false} 
                    onCheckedChange={(val) => editingArtwork && updateArtworkField(editingArtwork.id, 'featured', val)}
                    className="scale-50 h-4"
                  />
                </div>
                <div className="flex items-center justify-center pt-1">
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-black/20" /> : <CheckCircle2 className="w-3 h-3 text-green-500/30" />}
                </div>
              </div>

              {/* Crop Controls (Monumentaal) */}
              <div className="flex items-center gap-10">
                {['Top', 'Bottom', 'Left', 'Right'].map(side => {
                  const field = `crop${side}`;
                  const currentVal = (editingArtwork as any)?.[field] || 0;
                  return (
                    <div key={side} className="flex flex-col items-center gap-3">
                      <span className="text-[8px] font-black text-black uppercase tracking-widest">{side} {currentVal.toFixed(1)}%</span>
                      <div className="flex items-center gap-4">
                        <RepeatButton 
                          onClick={() => {
                            const newVal = Math.max(0, currentVal - 0.1);
                            editingArtwork && updateArtworkField(editingArtwork.id, field, newVal);
                          }}
                          className="h-12 w-12 border-black/10 hover:bg-black/5 rounded-lg"
                        >
                          <Minus className="h-5 w-5 text-black" />
                        </RepeatButton>
                        <Slider 
                          value={[currentVal]} 
                          max={50} 
                          step={0.1} 
                          onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} 
                          className="w-24"
                        />
                        <RepeatButton 
                          onClick={() => {
                            const newVal = Math.min(50, currentVal + 0.1);
                            editingArtwork && updateArtworkField(editingArtwork.id, field, newVal);
                          }}
                          className="h-12 w-12 border-black/10 hover:bg-black/5 rounded-lg"
                        >
                          <Plus className="h-5 w-5 text-black" />
                        </RepeatButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thema's (Royale Ruimte) */}
              <div className="flex flex-col gap-4 border-l border-black/5 pl-12 flex-1 min-w-[300px]">
                <span className="text-[8px] font-black text-black uppercase tracking-widest">Thema's & Tags</span>
                <div className="flex flex-wrap gap-2 max-h-[16vh] overflow-y-auto pr-4 no-scrollbar">
                  {STANDARD_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-[8px] font-black uppercase tracking-widest border transition-all",
                        editingArtwork?.tags?.includes(tag)
                          ? "bg-black text-white border-black"
                          : "bg-transparent text-black/40 border-black/10 hover:border-black/30"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Licht/Donker (Nu Prominent) */}
              <div className="flex flex-col items-center gap-5 border-l border-black/5 pl-12 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <Sun className="w-3 h-3 text-black/40" />
                  <span className="text-[8px] font-black text-black uppercase tracking-widest">Licht {(editingArtwork?.brightness || 1).toFixed(2)}</span>
                </div>
                <Slider 
                  value={[editingArtwork?.brightness || 1]} 
                  max={2} 
                  step={0.01} 
                  onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', val)} 
                  className="w-36"
                />
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function handleDeleteArtwork(artId: string) {
    if (!firestore || !confirm("Definitief verwijderen?")) return;
    deleteDoc(doc(firestore, 'artworks', artId));
    setEditingId(null);
  }
}
