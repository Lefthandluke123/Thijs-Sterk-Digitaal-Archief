
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
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
  History,
  CloudUpload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  
  const [nasBaseUrl, setNasBaseUrl] = useState('http://192.168.178.15/fotos/');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleScanFolder = () => {
    if (directoryInputRef.current) {
      directoryInputRef.current.click();
    }
  };

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const artworksToImport: any[] = [];
    const imageExtensions = /\.(jpe?g|png|webp|avif)$/i;
    
    let baseUrlClean = nasBaseUrl.trim();
    if (!baseUrlClean.endsWith('/')) {
      baseUrlClean += '/';
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (imageExtensions.test(file.name)) {
        const relativePath = (file as any).webkitRelativePath || "";
        const pathParts = relativePath.split('/');
        
        // Root is index 0. Immediate subfolder is index 1.
        let detectedSeries = "Hoofdcollectie";
        if (pathParts.length > 2) {
          detectedSeries = pathParts[pathParts.length - 2];
        }

        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const finalUrl = baseUrlClean + (relativePath || file.name);

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
    toast({ 
      title: "Map Analyse Voltooid", 
      description: `${artworksToImport.length} foto's verdeeld over collecties gebaseerd op de mappenstructuur.` 
    });
  };

  const handleBatchProcess = async (files: FileList | null, toCloud: boolean = true) => {
    if (!files || files.length === 0 || !storage || !firestore) return;

    setIsUploading(true);
    setUploadProgress(0);
    const totalFiles = files.length;
    let startedCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const imageExtensions = /\.(jpe?g|png|webp|avif)$/i;
      if (!imageExtensions.test(file.name)) continue;

      setUploadStatus(`Verwerken: ${file.name} (${i + 1}/${totalFiles})`);
      
      const uniqueId = Math.random().toString(36).substring(7);
      const storageRef = ref(storage, `artworks/${Date.now()}_${uniqueId}_${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        
        const relativePath = (file as any).webkitRelativePath || "";
        const pathParts = relativePath.split('/');
        let detectedSeries = "Nieuwe Uploads";
        if (pathParts.length > 2) {
          detectedSeries = pathParts[pathParts.length - 2];
        }

        const newArtwork = {
          title: fileNameOnly,
          series: detectedSeries,
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
        };

        await addDoc(collection(firestore, 'artworks'), newArtwork);
        startedCount++;
        setUploadProgress((startedCount / totalFiles) * 100);
      } catch (error: any) {
        console.error('Storage error:', error);
      }
    }

    toast({ title: "Batch Voltooid", description: `${startedCount} foto's zijn verwerkt en toegevoegd.` });
    setIsUploading(false);
    setUploadStatus('');
    setActiveTab('archive');
  };

  const handleBulkUpload = async () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const data = JSON.parse(bulkJson);
      const artworksArray = Array.isArray(data) ? data : [data];
      
      for (const item of artworksArray) {
        const { id, ...rest } = item;
        await addDoc(collection(firestore, 'artworks'), {
          ...rest,
          createdAt: serverTimestamp()
        });
      }
      
      toast({ title: "Import Succesvol", description: `${artworksArray.length} items toegevoegd.` });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "Controleer het format." });
    } finally {
      setLoading(false);
    }
  };

  const handleExportArchive = () => {
    if (!artworks) return;
    const exportData = artworks.map(art => {
      const { id, createdAt, ...rest } = art;
      return rest;
    });
    setBulkJson(JSON.stringify(exportData, null, 2));
    setActiveTab('bulk');
    toast({ title: "Backup Gegenereerd", description: "Kopieer de JSON-tekst en bewaar deze veilig." });
  };

  const updateArtworkField = async (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    setIsSaving(true);
    const artRef = doc(firestore, 'artworks', id);
    await updateDoc(artRef, { [field]: value });
    setTimeout(() => setIsSaving(false), 500);
  };

  const toggleArtworkTag = (artwork: any, tag: string) => {
    const currentTags = artwork.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    updateArtworkField(artwork.id, 'tags', newTags);
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Weet u het zeker?")) return;
    deleteDoc(doc(firestore, 'artworks', artId));
    if (editingId === artId) setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={directoryInputRef} style={{ display: 'none' }} onChange={handleDirectoryChange} {...({ webkitdirectory: "", directory: "" } as any)} />
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />

      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-accent" />
          <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Naar Website
        </Link>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-muted/50 p-1 rounded-full w-fit">
              <TabsTrigger value="archive" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Archief ({artworks?.length || 0})</TabsTrigger>
              <TabsTrigger value="upload" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Uploaden</TabsTrigger>
              <TabsTrigger value="nas" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Map Importeren (NAS)</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Backup & Bulk</TabsTrigger>
            </TabsList>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek in archief..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full h-10 text-xs bg-muted/30 border-none"
              />
            </div>
          </div>

          <TabsContent value="archive" className="mt-0">
            {isCollectionLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-sm font-light italic">Laden...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredArtworks.map((art: any) => (
                  <Card 
                    key={art.id} 
                    className={cn(
                      "overflow-hidden bg-card border-border rounded-2xl group cursor-pointer transition-all hover:ring-2 hover:ring-accent/40",
                      art.featured && "ring-2 ring-accent"
                    )}
                    onClick={() => setEditingId(art.id)}
                  >
                    <div className="relative aspect-square bg-muted/20 overflow-hidden">
                      <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ 
                          clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, 
                          filter: `brightness(${art.brightness || 1})` 
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {art.featured && <Badge className="bg-accent text-white p-1"><Star className="w-3 h-3 fill-white" /></Badge>}
                        <Badge className={cn("text-white p-1", art.imageUrl.includes('firebasestorage') ? "bg-blue-500" : "bg-orange-500")}>
                          {art.imageUrl.includes('firebasestorage') ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-black/40 text-[7px] text-white border-none backdrop-blur-md uppercase tracking-widest">{art.series || "Geen Zaal"}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-headline text-xs font-light truncate">{art.title}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nas">
            <Card className="p-12 rounded-3xl border-border bg-card/50 shadow-xl max-w-2xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h3 className="font-headline text-2xl font-light">Hoofdmap Selecteren (NAS)</h3>
                <p className="text-sm text-muted-foreground">Kies een map op uw NAS of computer. Submappen worden automatisch herkent als aparte zalen.</p>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-bold text-left block">Basis URL</Label>
                <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg">
                  <FolderOpen className="mr-4 w-8 h-8" />
                  Selecteer Hoofdmap
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-10 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto">
                <CloudUpload className="w-12 h-12 text-accent" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-20 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex flex-col items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Bestanden Kiezen
                  </Button>
                  <Button onClick={() => uploadDirInputRef.current?.click()} disabled={isUploading} variant="secondary" className="h-20 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex flex-col items-center justify-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Mappen Uploaden
                  </Button>
                </div>
                {isUploading && (
                  <div className="w-full space-y-3">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-[10px] uppercase font-bold text-accent text-center">{uploadStatus}</p>
                  </div>
                )}
              </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase font-bold">Backup Data (JSON)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleExportArchive} className="h-7 text-[8px] uppercase font-bold"><History className="w-3 h-3 mr-1" /> Exporteer</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(bulkJson)} className="h-7 text-[8px] uppercase font-bold"><Copy className="w-3 h-3 mr-1" /> Kopieer</Button>
                </div>
              </div>
              <Textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
              <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl">
                {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Importeer / Herstel</>}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black/5">
            {editingArtwork && (
              <img 
                src={editingArtwork.imageUrl} 
                alt={editingArtwork.title} 
                className="max-w-[95%] max-h-[85%] object-contain p-4 transition-all duration-300 shadow-2xl" 
                style={{
                  clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`,
                  filter: `brightness(${editingArtwork.brightness || 1})`
                }}
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
              <button onClick={() => navigateEditing('prev')} className="p-3 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={() => navigateEditing('next')} className="p-3 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40"><ChevronRight className="w-6 h-6" /></button>
            </div>
            <div className="absolute top-4 right-4 z-50 flex gap-2">
               <Button variant="destructive" size="icon" onClick={() => editingArtwork && handleDeleteArtwork(editingArtwork.id)} className="rounded-full h-8 w-8 opacity-40 hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </Button>
              <DialogClose className="p-2 bg-background/20 backdrop-blur-md rounded-full"><X className="w-5 h-5" /></DialogClose>
            </div>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md border-t border-border/10 p-2 shadow-2xl">
            <div className="max-w-[1400px] mx-auto grid grid-cols-4 gap-4 items-start pb-4">
              <div className="space-y-2">
                <DialogTitle className="font-headline text-2xl font-light text-center mb-1 leading-tight truncate">
                  {editingArtwork?.title}
                </DialogTitle>
                <div className="flex items-center justify-between px-2">
                  <Label className="text-[7px] uppercase font-bold opacity-50">Uitgelicht</Label>
                  <Switch checked={editingArtwork?.featured || false} onCheckedChange={(val) => editingArtwork && updateArtworkField(editingArtwork.id, 'featured', val)} />
                </div>
                <Input defaultValue={editingArtwork?.title || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'title', e.target.value)} placeholder="Titel" className="h-7 text-xs font-headline bg-muted/10 border-none px-2" />
                <Input defaultValue={editingArtwork?.series || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'series', e.target.value)} placeholder="Zaal (Serie)" className="h-7 text-[8px] bg-muted/10 border-none px-2 text-accent font-bold" />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input defaultValue={editingArtwork?.year || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'year', e.target.value)} placeholder="Jaar" className="h-7 text-[8px] bg-muted/10 border-none px-2" />
                  <Input defaultValue={editingArtwork?.medium || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'medium', e.target.value)} placeholder="Medium" className="h-7 text-[8px] bg-muted/10 border-none px-2" />
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                  {STANDARD_TAGS.map(tag => (
                    <button key={tag} onClick={() => editingArtwork && toggleArtworkTag(editingArtwork, tag)} className={cn("px-1 py-0.5 rounded-full text-[6px] font-bold uppercase border", editingArtwork?.tags?.includes(tag) ? "bg-accent text-white border-accent" : "bg-background/50 text-muted-foreground border-border/40")}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-[7px] uppercase font-bold opacity-40 block">Helderheid ({editingArtwork?.brightness?.toFixed(2) || '1.00'})</Label>
                <Slider value={[editingArtwork?.brightness || 1]} max={2} step={0.01} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', val)} />
                <div className="grid grid-cols-2 gap-4">
                  {['Top', 'Bottom'].map(side => {
                    const field = `crop${side}`;
                    return (
                      <div key={side} className="space-y-1">
                        <Label className="text-[6px] uppercase font-bold opacity-40">{side} {editingArtwork?.[field] || 0}%</Label>
                        <Slider value={[editingArtwork?.[field] || 0]} max={50} step={1} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  {['Left', 'Right'].map(side => {
                    const field = `crop${side}`;
                    return (
                      <div key={side} className="space-y-1">
                        <Label className="text-[6px] uppercase font-bold opacity-40">{side} {editingArtwork?.[field] || 0}%</Label>
                        <Slider value={[editingArtwork?.[field] || 0]} max={50} step={1} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 opacity-40 text-[7px] uppercase font-bold">
                    {isSaving ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> ...</> : <><CheckCircle2 className="w-2.5 h-2.5" /> Opgeslagen</>}
                  </div>
                  <Button onClick={() => setEditingId(null)} className="h-7 px-8 text-[8px] uppercase tracking-widest font-bold">Gereed</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
