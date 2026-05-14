
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
  Upload,
  Plus,
  Minus,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Cloud,
  HardDrive,
  Star,
  CheckCircle2,
  Copy,
  Save,
  Download,
  FileJson,
  Square,
  CloudUpload,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const STANDARD_TAGS = [
  "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
  "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
  "Bloemen", "Dieren", "Water", "Portretten"
];

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDirInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const cancelUploadRef = useRef(false);
  
  const [nasBaseUrl, setNasBaseUrl] = useState('http://192.168.178.15/fotos/');
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

  const existingSeries = useMemo(() => {
    if (!artworks) return [];
    const series = new Set<string>();
    artworks.forEach(art => {
      if (art.series) series.add(art.series);
    });
    return Array.from(series).sort();
  }, [artworks]);

  const editingArtwork = useMemo(() => {
    return artworks?.find(art => art.id === editingId) || null;
  }, [artworks, editingId]);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter(art => 
      (art.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [artworks, searchQuery]);

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

  const handleScanFolder = () => directoryInputRef.current?.click();

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const artworksToImport: any[] = [];
    const imageExtensions = /\.(jpe?g|png|webp|avif)$/i;
    let baseUrlClean = nasBaseUrl.trim();
    if (!baseUrlClean.endsWith('/')) baseUrlClean += '/';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (imageExtensions.test(file.name)) {
        const relativePath = (file as any).webkitRelativePath || "";
        const pathParts = relativePath.split('/');
        let detectedSeries = "Hoofdcollectie";
        if (pathParts.length > 2) detectedSeries = pathParts[pathParts.length - 2];
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const finalUrl = baseUrlClean + (relativePath || file.name);

        const isDuplicate = artworks?.some(art => 
          art.title.toLowerCase() === fileNameOnly.toLowerCase() && 
          art.series.toLowerCase() === detectedSeries.toLowerCase()
        );

        if (isDuplicate) continue;

        artworksToImport.push({
          title: fileNameOnly || "Zonder titel",
          series: detectedSeries,
          imageUrl: finalUrl,
          medium: "Olieverf op doek",
          year: "",
          description: "",
          imageHint: "painting",
          tags: [],
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          brightness: 1,
          featured: false
        });
      }
    }

    setBulkJson(JSON.stringify(artworksToImport, null, 2));
    setActiveTab('bulk');
    toast({ title: "Analyse Voltooid", description: `${artworksToImport.length} nieuwe foto's herkend.` });
  };

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || files.length === 0 || !storage || !firestore) return;
    setIsUploading(true);
    setUploadProgress(0);
    cancelUploadRef.current = false;
    const totalFiles = files.length;
    let startedCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      if (cancelUploadRef.current) break;
      const file = files[i];
      if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) continue;

      const relativePath = (file as any).webkitRelativePath || "";
      const pathParts = relativePath.split('/');
      let detectedSeries = pathParts.length > 2 ? pathParts[pathParts.length - 2] : "Nieuwe Uploads";
      const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

      if (artworks?.some(art => art.title.toLowerCase() === fileNameOnly.toLowerCase() && art.series.toLowerCase() === detectedSeries.toLowerCase())) {
        duplicateCount++;
        startedCount++;
        setUploadProgress((startedCount / totalFiles) * 100);
        continue;
      }

      setUploadStatus(`Uploaden: ${file.name} (${i + 1}/${totalFiles})`);
      const storageRef = ref(storage, `artworks/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        const newArtwork = { title: fileNameOnly, series: detectedSeries, imageUrl: downloadUrl, medium: "Olieverf op doek", year: new Date().getFullYear().toString(), description: "", imageHint: "painting", tags: [], cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1, featured: false, createdAt: serverTimestamp() };
        addDoc(collection(firestore, 'artworks'), newArtwork).catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'artworks', operation: 'create' })));
        startedCount++;
        setUploadProgress((startedCount / totalFiles) * 100);
      } catch (error) {
        toast({ variant: "destructive", title: "Fout", description: `Kon ${file.name} niet uploaden.` });
      }
    }
    setIsUploading(false);
    setUploadStatus('');
    toast({ title: "Batch Voltooid", description: `${startedCount - duplicateCount} verwerkt.` });
    setActiveTab('archive');
  };

  const handleBulkUpload = async () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const data = JSON.parse(bulkJson);
      const artworksArray = Array.isArray(data) ? data : [data];
      let added = 0;
      for (const item of artworksArray) {
        const { id, ...rest } = item;
        if (artworks?.some(art => art.imageUrl === rest.imageUrl || (art.title.toLowerCase() === rest.title.toLowerCase() && art.series.toLowerCase() === rest.series.toLowerCase()))) continue;
        addDoc(collection(firestore, 'artworks'), { ...rest, createdAt: serverTimestamp() }).catch(() => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'artworks', operation: 'create' })));
        added++;
      }
      toast({ title: "Import Succesvol", description: `${added} items toegevoegd.` });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout" });
    } finally { setLoading(false); }
  };

  const handleExportArchive = (download = false) => {
    if (!artworks) return;
    const exportData = artworks.map(({ id, createdAt, ...rest }) => rest);
    const jsonString = JSON.stringify(exportData, null, 2);
    setBulkJson(jsonString);
    if (download) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thijs-sterk-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setActiveTab('bulk');
      toast({ title: "Backup Gegenereerd" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !firestore) return;
    setLoading(true);
    const storageRef = ref(storage, `site/logo_${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await setDoc(doc(firestore, 'settings', 'site'), { logoUrl: url }, { merge: true });
      toast({ title: "Logo Opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Logo Fout" });
    } finally { setLoading(false); }
  };

  const updateArtworkField = async (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    setIsSaving(true);
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' })))
      .finally(() => setTimeout(() => setIsSaving(false), 500));
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Verwijderen?")) return;
    deleteDoc(doc(firestore, 'artworks', artId)).catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `artworks/${artId}`, operation: 'delete' })));
    if (editingId === artId) setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={directoryInputRef} style={{ display: 'none' }} onChange={handleDirectoryChange} {...({ webkitdirectory: "", directory: "" } as any)} />
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />
      <input type="file" ref={jsonFileInputRef} style={{ display: 'none' }} onChange={(e) => { const reader = new FileReader(); reader.onload = (ev) => setBulkJson(ev.target?.result as string); reader.readAsText(e.target.files![0]); }} accept=".json" />
      <input type="file" ref={logoInputRef} style={{ display: 'none' }} onChange={handleLogoUpload} accept="image/*" />

      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings?.logoUrl ? <img src={settings.logoUrl} className="h-6 w-auto mr-2" /> : <Cloud className="w-5 h-5 text-accent" />}
          <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => handleExportArchive(true)} className="text-[10px] uppercase tracking-widest font-bold"><Download className="w-3 h-3 mr-2" /> Exporteer Archief</Button>
          <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 border-l border-border pl-4 ml-4"><ArrowLeft className="w-3 h-3" /> Naar Website</Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-muted/50 p-1 rounded-full w-fit">
              <TabsTrigger value="archive" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Archief ({artworks?.length || 0})</TabsTrigger>
              <TabsTrigger value="upload" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Uploaden</TabsTrigger>
              <TabsTrigger value="nas" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">NAS Import</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Backup</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-full px-6 text-[10px] uppercase font-bold tracking-widest">Instellingen</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Zoek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full h-10 text-xs bg-muted/30 border-none" />
            </div>
          </div>

          <TabsContent value="archive" className="mt-0">
            {isCollectionLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : artworks && artworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredArtworks.map((art: any) => (
                  <Card key={art.id} className={cn("overflow-hidden bg-card border-border rounded-2xl group cursor-pointer transition-all hover:ring-2 hover:ring-accent/40", art.featured && "ring-2 ring-accent")} onClick={() => setEditingId(art.id)}>
                    <div className="relative aspect-square bg-muted/20 overflow-hidden">
                      <img src={art.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }} />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {art.featured && <Star className="w-3 h-3 fill-white" />}
                        <Badge className={cn("text-white p-1", art.imageUrl.includes('firebasestorage') ? "bg-blue-500" : "bg-orange-500")}>{art.imageUrl.includes('firebasestorage') ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}</Badge>
                      </div>
                      <div className="absolute bottom-2 left-2"><Badge className="bg-black/40 text-[7px] text-white border-none uppercase tracking-widest">{art.series || "Andere"}</Badge></div>
                    </div>
                    <CardContent className="p-3 text-center"><h4 className="text-xs font-light truncate">{art.title}</h4></CardContent>
                  </Card>
                ))}
              </div>
            ) : <div className="py-32 text-center opacity-40"><p className="italic">Leeg archief.</p></div>}
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-12 rounded-3xl max-w-2xl mx-auto space-y-8">
              <h3 className="font-headline text-2xl font-light">Website Instellingen</h3>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-bold">Website Logo</Label>
                <div className="flex items-center gap-6 p-6 border rounded-2xl bg-muted/10">
                  <div className="w-24 h-24 bg-white rounded-xl border flex items-center justify-center overflow-hidden">
                    {settings?.logoUrl ? <img src={settings.logoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="opacity-20" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">Upload een transparant PNG of SVG logo voor de beste weergave.</p>
                    <Button onClick={() => logoInputRef.current?.click()} className="rounded-full px-6 text-[10px] uppercase font-bold">Kies Nieuw Logo</Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-10 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto">
                <CloudUpload className="w-12 h-12 text-accent" />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-20 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex flex-col gap-2"><Plus className="w-5 h-5" />Bestanden</Button>
                  <Button onClick={() => uploadDirInputRef.current?.click()} disabled={isUploading} variant="secondary" className="h-20 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex flex-col gap-2"><FolderOpen className="w-5 h-5" />Mappen</Button>
                </div>
                {isUploading && (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-accent">{uploadStatus}</p>
                      <Button variant="destructive" size="sm" className="h-7 px-4 rounded-full text-[8px] uppercase font-bold" onClick={() => cancelUploadRef.current = true}><Square className="w-3 h-3 mr-1 fill-current" /> Stop</Button>
                    </div>
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                )}
              </Card>
          </TabsContent>

          <TabsContent value="nas">
            <Card className="p-12 rounded-3xl max-w-2xl mx-auto text-center space-y-8">
              <h3 className="font-headline text-2xl font-light">NAS Map Scannen</h3>
              <div className="space-y-4">
                <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent text-lg shadow-lg"><FolderOpen className="mr-4 w-8 h-8" />Selecteer Hoofdmap</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-8 rounded-3xl max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center"><Label className="text-[10px] uppercase font-bold">Backup Data (JSON)</Label></div>
              <Textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
              <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl">{loading ? <Loader2 className="animate-spin" /> : "Importeer Data"}</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Bewerk Kunstwerk</DialogTitle>
          <div className="relative h-[67vh] w-full flex items-center justify-center overflow-hidden bg-black/5 group">
            {editingArtwork && <img src={editingArtwork.imageUrl} className="max-w-[95%] max-h-[90%] object-contain p-4 transition-all duration-300 shadow-2xl" style={{ clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`, filter: `brightness(${editingArtwork.brightness || 1})` }} />}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => navigateEditing('prev')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all"><ChevronLeft className="w-8 h-8" /></button>
              <button onClick={() => navigateEditing('next')} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all"><ChevronRight className="w-8 h-8" /></button>
            </div>
            <div className="absolute top-8 right-8 z-50 flex gap-4">
              <Button variant="destructive" size="icon" onClick={() => editingArtwork && handleDeleteArtwork(editingArtwork.id)} className="rounded-full h-10 w-10 opacity-40 hover:opacity-100 shadow-lg"><Trash2 className="w-5 h-5" /></Button>
              <DialogClose className="p-2.5 bg-background/20 backdrop-blur-md rounded-full hover:bg-background/40 shadow-lg"><X className="w-6 h-6 opacity-60" /></DialogClose>
            </div>
          </div>
          <div className="h-[33vh] w-full bg-background/95 backdrop-blur-md border-t border-border/10 p-8 flex flex-col overflow-y-auto">
            <div className="max-w-[1600px] mx-auto grid grid-cols-4 gap-12 items-start w-full">
              <div className="space-y-6">
                <Label className="text-[10px] uppercase font-black tracking-widest text-accent">Titel & Status</Label>
                <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl"><span className="text-[11px] uppercase font-bold">Op Home tonen</span><Switch checked={editingArtwork?.featured || false} onCheckedChange={(val) => editingArtwork && updateArtworkField(editingArtwork.id, 'featured', val)} /></div>
                <Input defaultValue={editingArtwork?.title || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'title', e.target.value)} className="h-12 text-lg font-headline bg-muted/10 border-none rounded-xl" />
              </div>
              <div className="space-y-6">
                <Label className="text-[10px] uppercase font-black tracking-widest text-accent">Zaal (Serie)</Label>
                <Input defaultValue={editingArtwork?.series || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'series', e.target.value)} className="h-12 text-xs bg-muted/10 border-none uppercase tracking-widest font-black rounded-xl" />
                <div className="flex flex-wrap gap-2">{existingSeries.map(s => <button key={s} onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'series', s)} className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent/10 text-accent hover:bg-accent/20 transition-colors">{s}</button>)}</div>
              </div>
              <div className="space-y-6">
                <Label className="text-[10px] uppercase font-black tracking-widest text-accent">Helderheid ({editingArtwork?.brightness?.toFixed(2) || '1.00'})</Label>
                <div className="flex items-center gap-4 bg-muted/10 p-2 rounded-xl"><Button variant="ghost" size="icon" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.max(0, (editingArtwork.brightness || 1) - 0.01))}><Minus /></Button><Slider value={[editingArtwork?.brightness || 1]} max={2} step={0.01} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', val)} className="flex-1" /><Button variant="ghost" size="icon" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.min(2, (editingArtwork.brightness || 1) + 0.01))}><Plus /></Button></div>
                <div className="flex flex-col gap-2 pt-4 border-t border-border/10">
                  <div className="flex items-center gap-2 opacity-60 text-[10px] uppercase font-black tracking-widest">{isSaving ? <><Loader2 className="animate-spin" /> Opslaan...</> : <><CheckCircle2 className="text-green-500" /> Wijzigingen actief</>}</div>
                  <Button onClick={() => setEditingId(null)} className="w-full h-12 text-[12px] uppercase font-black tracking-widest bg-primary text-white rounded-full">Sluiten</Button>
                </div>
              </div>
              <div className="space-y-4">
                {['Top', 'Bottom', 'Left', 'Right'].map(side => {
                  const field = `crop${side}`;
                  const currentVal = editingArtwork?.[field as keyof typeof editingArtwork] as number || 0;
                  return (
                    <div key={side} className="space-y-1">
                      <Label className="text-[9px] uppercase font-black opacity-40">{side} {currentVal}%</Label>
                      <div className="flex items-center gap-2 bg-muted/10 p-1.5 rounded-xl"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.max(0, currentVal - 1))}><Minus className="h-3 w-3" /></Button><Slider value={[currentVal]} max={50} step={1} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} className="flex-1" /><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.min(50, currentVal + 1))}><Plus className="h-3 w-3" /></Button></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
