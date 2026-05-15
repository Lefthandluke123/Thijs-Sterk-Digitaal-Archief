
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
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
  CheckCircle2,
  CloudUpload,
  Sun,
  Tag,
  FileJson,
  Layers,
  Filter,
  CheckSquare,
  Square,
  MoveHorizontal,
  Archive
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function RepeatButton({ onStep, children, className, disabled }: { onStep: () => void, children: React.ReactNode, className?: string, disabled?: boolean }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onStepRef = useRef(onStep);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    onStepRef.current(); 
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onStepRef.current();
      }, 50);
    }, 400);
  }, [disabled]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("select-none transition-all active:scale-95 border-2 border-black", className)}
      disabled={disabled}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
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
  const [filterSeries, setFilterSeries] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDirInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMoveSeries, setBulkMoveSeries] = useState('');

  const [localCrops, setLocalCrops] = useState<Record<string, number>>({});

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: isCollectionLoading } = useCollection(artworksQuery);

  const allSeries = useMemo(() => {
    if (!artworks) return [];
    return Array.from(new Set(artworks.map(a => a.series || "Geen zaal"))).sort();
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter(art => {
      const matchesSearch = (art.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = !filterSeries || art.series === filterSeries;
      return matchesSearch && matchesFilter;
    });
  }, [artworks, searchQuery, filterSeries]);

  const editingArtwork = useMemo(() => {
    return artworks?.find(art => art.id === editingId) || null;
  }, [artworks, editingId]);

  useEffect(() => {
    if (editingArtwork) {
      setLocalCrops({
        cropTop: editingArtwork.cropTop || 0,
        cropBottom: editingArtwork.cropBottom || 0,
        cropLeft: editingArtwork.cropLeft || 0,
        cropRight: editingArtwork.cropRight || 0,
        brightness: editingArtwork.brightness || 1,
      });
    }
  }, [editingId, editingArtwork?.id]);

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

  const updateArtworkField = async (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    setIsSaving(true);
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' })))
      .finally(() => {
        setTimeout(() => setIsSaving(false), 100);
      });
  };

  const handleBulkMove = async () => {
    if (!firestore || selectedIds.length === 0 || !bulkMoveSeries.trim()) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const artRef = doc(firestore, 'artworks', id);
      batch.update(artRef, { series: bulkMoveSeries.trim() });
    });
    
    try {
      await batch.commit();
      toast({ title: "Bulk verplaatsing gelukt", description: `${selectedIds.length} werken verplaatst naar ${bulkMoveSeries}` });
      setSelectedIds([]);
      setBulkMoveSeries('');
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij bulk verplaatsing" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const artRef = doc(firestore, 'artworks', id);
      batch.delete(artRef);
    });
    
    try {
      await batch.commit();
      toast({ title: "Verwijderen gelukt", description: `${selectedIds.length} werken verwijderd` });
      setSelectedIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij verwijderen" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseCurrentSeries = async () => {
    if (!firestore || !filterSeries || filteredArtworks.length === 0) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    filteredArtworks.forEach(art => {
      const artRef = doc(firestore, 'artworks', art.id);
      batch.update(artRef, { series: "Geen zaal" });
    });
    
    try {
      await batch.commit();
      toast({ title: "Zaal gesloten", description: `Alle ${filteredArtworks.length} werken uit ${filterSeries} zijn teruggezet naar het archief.` });
      setFilterSeries(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij het sluiten van de zaal" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleLocalStep = (field: string, delta: number, min = 0, max = 50) => {
    if (!editingArtwork || !editingId) return;
    const current = localCrops[field] ?? (editingArtwork as any)[field] ?? (field === 'brightness' ? 1 : 0);
    const next = Math.min(max, Math.max(min, current + delta));
    setLocalCrops(prev => ({ ...prev, [field]: next }));
    updateArtworkField(editingId, field, next);
  };

  const toggleTag = (tag: string) => {
    if (!editingArtwork) return;
    const currentTags = editingArtwork.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter((t: string) => t !== tag) 
      : [...currentTags, tag];
    updateArtworkField(editingArtwork.id, 'tags', newTags);
  };

  const addCustomTag = () => {
    if (!editingArtwork || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    const currentTags = editingArtwork.tags || [];
    if (!currentTags.includes(tag)) {
      updateArtworkField(editingArtwork.id, 'tags', [...currentTags, tag]);
    }
    setNewTagInput('');
  };

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || !firestore || !storage) return;
    setIsUploading(true);
    setUploadProgress(0);
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalFiles = filesArray.length;
    let processed = 0;

    for (const file of filesArray) {
      try {
        const storageRef = ref(storage, `artworks/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        await addDoc(collection(firestore, 'artworks'), {
          title: file.name.split('.')[0],
          series: filterSeries || "Geen zaal",
          year: new Date().getFullYear().toString(),
          medium: "Olieverf",
          imageUrl: downloadUrl,
          tags: [],
          featured: false,
          createdAt: serverTimestamp(),
          cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1
        });
      } catch (e) { console.error(e); }
      processed++;
      setUploadProgress((processed / totalFiles) * 100);
      setUploadStatus(`Verwerkt: ${processed}/${totalFiles}`);
    }
    setIsUploading(false);
    toast({ title: "Upload Voltooid" });
  };

  const exportAsBasisJson = () => {
    if (!artworks) return;
    const exportData = {
      placeholderImages: artworks.map(({ id, createdAt, ...rest }) => ({
        id: id.substring(0, 8),
        ...rest
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "placeholder-images.json"; a.click();
    toast({ title: "JSON Geëxporteerd" });
  };

  const STANDARD_TAGS = [
    "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
    "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
    "Bloemen", "Dieren", "Water", "Portretten", "Atmosferisch", "Licht", "Polder", "Kust"
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />
      
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="h-10 w-auto">
            <img src="/logo.png" className="h-10 w-auto" />
          </Link>
          <h1 className="font-headline text-lg font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={exportAsBasisJson} className="text-[9px] uppercase tracking-widest font-bold">
            <Layers className="w-3 h-3 mr-2" /> Exporteer Basis JSON
          </Button>
          <Link href="/" className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> Website
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-muted/50 p-1 rounded-full w-fit">
              <TabsTrigger value="archive" className="rounded-full px-6 text-[9px] uppercase font-bold tracking-widest">Archief ({artworks?.length || 0})</TabsTrigger>
              <TabsTrigger value="upload" className="rounded-full px-6 text-[9px] uppercase font-bold tracking-widest">Cloud Upload</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-6 text-[9px] uppercase font-bold tracking-widest">Bulk Import</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Zoek op titel of thema..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full h-10 text-xs bg-muted/30 border-none" />
            </div>
          </div>

          <TabsContent value="archive" className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 overflow-x-auto pb-2 no-scrollbar border-b border-black/5">
              <Button 
                variant={filterSeries === null ? "default" : "outline"} 
                size="sm" 
                onClick={() => setFilterSeries(null)}
                className="rounded-full text-[9px] uppercase tracking-widest font-bold h-7"
              >
                Alles
              </Button>
              {allSeries.map(s => (
                <Button 
                  key={s}
                  variant={filterSeries === s ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFilterSeries(s)}
                  className="rounded-full text-[9px] uppercase tracking-widest font-bold h-7 whitespace-nowrap"
                >
                  {s}
                </Button>
              ))}
            </div>

            <div className="flex justify-between items-center h-12">
               {filterSeries && filterSeries !== "Geen zaal" && (
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 hover:bg-accent/5 text-[9px] uppercase font-black tracking-widest">
                       <Archive className="w-3 h-3 mr-2" /> Zaal "{filterSeries}" sluiten (terug naar archief)
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Zaal sluiten?</AlertDialogTitle>
                       <AlertDialogDescription>
                         Dit zal alle {filteredArtworks.length} schilderijen in de zaal "{filterSeries}" verplaatsen naar "Geen zaal". De schilderijen blijven bewaard in uw archief.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Annuleren</AlertDialogCancel>
                       <AlertDialogAction onClick={handleCloseCurrentSeries} className="bg-accent">Zaal Sluiten</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               )}
            </div>

            {selectedIds.length > 0 && (
              <div className="bg-accent/10 border border-accent/20 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">{selectedIds.length} geselecteerd</span>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Nieuwe zaalnaam..." 
                      value={bulkMoveSeries} 
                      onChange={(e) => setBulkMoveSeries(e.target.value)}
                      className="h-8 text-[10px] font-black uppercase border-accent/30 bg-white w-48"
                    />
                    <Button onClick={handleBulkMove} disabled={isSaving || !bulkMoveSeries} size="sm" className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent">
                      <MoveHorizontal className="w-3 h-3 mr-2" /> Verplaats naar Zaal
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="outline" size="sm" className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest text-red-500 border-red-200">
                         <Trash2 className="w-3 h-3 mr-2" /> Selectie Verwijderen
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Selectie verwijderen?</AlertDialogTitle>
                        <AlertDialogDescription>Weet u zeker dat u deze {selectedIds.length} schilderijen wilt verwijderen?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-500">Verwijderen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest">Annuleren</Button>
                </div>
              </div>
            )}

            {isCollectionLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin opacity-20" /></div> : artworks && artworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredArtworks.map((art: any) => (
                  <Card 
                    key={art.id} 
                    className={cn(
                      "overflow-hidden bg-card border-border rounded-xl group cursor-pointer transition-all hover:ring-1 hover:ring-accent relative",
                      art.featured && "ring-1 ring-accent",
                      selectedIds.includes(art.id) && "ring-2 ring-accent bg-accent/5"
                    )} 
                    onClick={() => setEditingId(art.id)}
                  >
                    <button 
                      onClick={(e) => toggleSelect(e, art.id)}
                      className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-white/80 border-2 border-accent flex items-center justify-center transition-all hover:scale-110"
                    >
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4 text-accent fill-accent" /> : <Square className="w-4 h-4 text-accent/30" />}
                    </button>
                    <div className="relative aspect-square bg-muted/20">
                      <img src={art.imageUrl} className="w-full h-full object-cover" style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }} />
                    </div>
                    <CardContent className="p-2 text-center">
                      <h4 className="text-[9px] font-black text-black uppercase tracking-widest truncate">{art.title}</h4>
                      <p className="text-[7px] uppercase tracking-widest opacity-40 mt-1 truncate">{art.series}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : <div className="py-32 text-center opacity-40 uppercase tracking-[0.2em] text-[9px] font-bold">Geen werken gevonden.</div>}
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-16 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto">
                <CloudUpload className="w-12 h-12 text-accent" />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-24 rounded-2xl font-bold uppercase tracking-widest text-[10px]"><Plus className="w-4 h-4 mr-2" />Bestanden</Button>
                  <Button onClick={() => uploadDirInputRef.current?.click()} disabled={isUploading} variant="secondary" className="h-24 rounded-2xl font-bold uppercase tracking-widest text-[10px]"><FolderOpen className="w-4 h-4 mr-2" />Map</Button>
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
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-black text-black uppercase tracking-widest">JSON Data / Basis Config</Label>
                <div className="flex gap-2">
                  <input type="file" ref={jsonFileInputRef} style={{ display: 'none' }} accept=".json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setBulkJson(ev.target?.result as string);
                    reader.readAsText(file);
                  }} />
                  <Button variant="outline" size="sm" onClick={() => jsonFileInputRef.current?.click()} className="text-[9px] uppercase tracking-widest font-bold">
                    <FileJson className="w-3 h-3 mr-2" /> Kies JSON Bestand
                  </Button>
                </div>
              </div>
              <Textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} placeholder='[{"title": "Werk", "series": "Reeks", "imageUrl": "..."}]' className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
              <Button onClick={() => {
                if (!firestore || !bulkJson) return;
                setLoading(true);
                try {
                  const items = JSON.parse(bulkJson);
                  const dataToImport = Array.isArray(items) ? items : (items.placeholderImages || [items]);
                  dataToImport.forEach(item => {
                    const { id, createdAt, ...rest } = item;
                    addDoc(collection(firestore, 'artworks'), { ...rest, createdAt: serverTimestamp() });
                  });
                  setBulkJson(''); setActiveTab('archive'); toast({ title: "Import Succesvol" });
                } catch (e) { toast({ variant: "destructive", title: "Fout" }); }
                finally { setLoading(false); }
              }} disabled={loading || !bulkJson} className="h-14 rounded-xl font-bold uppercase tracking-widest w-full">Importeer naar Cloud</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Master Editor (75/25)</DialogTitle>
          
          <div className="relative h-[75vh] w-full flex items-center justify-center overflow-hidden bg-[#f3f3f3] group">
            {editingArtwork && (
              <img 
                src={editingArtwork.imageUrl} 
                className="max-w-[90%] max-h-[90%] object-contain transition-all duration-300 shadow-2xl" 
                style={{ 
                  clipPath: `inset(${localCrops.cropTop ?? editingArtwork.cropTop ?? 0}% ${localCrops.cropRight ?? editingArtwork.cropRight ?? 0}% ${localCrops.cropBottom ?? editingArtwork.cropBottom ?? 0}% ${localCrops.cropLeft ?? editingArtwork.cropLeft ?? 0}%)`, 
                  filter: `brightness(${localCrops.brightness ?? editingArtwork.brightness ?? 1})` 
                }} 
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-12 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => navigateEditing('prev')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10 transition-colors"><ChevronLeft className="w-8 h-8 text-black" /></button>
              <button onClick={() => navigateEditing('next')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10 transition-colors"><ChevronRight className="w-8 h-8 text-black" /></button>
            </div>
            <div className="absolute top-4 right-4 flex gap-3 items-center">
              <Button variant="ghost" size="icon" onClick={() => editingId && deleteDoc(doc(firestore!, 'artworks', editingId))} className="h-4 w-4 rounded-full text-red-600 hover:bg-red-50 p-0"><Trash2 className="w-3 h-3" /></Button>
              <DialogClose className="h-5 w-5 flex items-center justify-center bg-black/10 rounded-full hover:bg-black/20 transition-colors"><X className="w-2.5 h-2.5 text-black" /></DialogClose>
            </div>
          </div>

          <div className="h-[25vh] w-full bg-background border-t border-black/10 px-8 py-4 overflow-y-auto">
            <div className="flex items-start gap-12 w-full min-h-full">
              
              <div className="flex flex-col gap-4 min-w-[200px] border-r border-black/5 pr-8">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-black uppercase tracking-widest">Titel</Label>
                  <Input 
                    key={`${editingId}-title`}
                    defaultValue={editingArtwork?.title || ''} 
                    onBlur={(e) => editingId && updateArtworkField(editingId, 'title', e.target.value)} 
                    className="h-8 text-[10px] font-black text-black uppercase border-none bg-black/5 rounded-sm p-2 focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-accent uppercase tracking-widest">Zaal (Serie)</Label>
                  <Input 
                    key={`${editingId}-series`}
                    defaultValue={editingArtwork?.series || ''} 
                    onBlur={(e) => editingId && updateArtworkField(editingId, 'series', e.target.value)} 
                    className="h-8 text-[10px] font-black text-accent uppercase border-none bg-accent/5 rounded-sm p-2 focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center justify-between bg-black/5 p-2 rounded-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-black/60" />
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Home</span>
                  </div>
                  <Switch 
                    checked={editingArtwork?.featured || false} 
                    onCheckedChange={(val) => editingId && updateArtworkField(editingId, 'featured', val)}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-black/20" /> : <CheckCircle2 className="w-3 h-3 text-green-500/30" />}
                  <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">{isSaving ? 'Saving' : 'Opgeslagen'}</span>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-w-0 border-r border-black/5 pr-8">
                <div className="flex items-center justify-between gap-6 pb-6 border-b border-black/5">
                  {['Top', 'Bottom', 'Left', 'Right'].map(side => {
                    const fieldName = `crop${side}`;
                    const currentVal = localCrops[fieldName] ?? (editingArtwork as any)?.[fieldName] ?? 0;
                    return (
                      <div key={side} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{side} {currentVal.toFixed(1)}%</span>
                        <div className="flex items-center gap-2">
                          <RepeatButton 
                            onStep={() => handleLocalStep(fieldName, -0.1)}
                            className="h-10 w-10"
                          >
                            <Minus className="h-5 w-5 text-black" />
                          </RepeatButton>
                          <Slider 
                            value={[currentVal]} 
                            max={50} 
                            step={0.1} 
                            onValueChange={([val]) => {
                              setLocalCrops(prev => ({ ...prev, [fieldName]: val }));
                              editingId && updateArtworkField(editingId, fieldName, val);
                            }}
                            className="w-24"
                          />
                          <RepeatButton 
                            onStep={() => handleLocalStep(fieldName, 0.1)}
                            className="h-10 w-10"
                          >
                            <Plus className="h-5 w-5 text-black" />
                          </RepeatButton>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">Thema's</span>
                    <div className="flex items-center gap-3">
                      <Input 
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Nieuw..."
                        className="h-7 text-[10px] font-black text-black uppercase border-none bg-black/5 rounded-sm p-2 w-32 focus-visible:ring-0"
                        onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                      />
                      <Button onClick={addCustomTag} variant="ghost" className="h-7 w-7 p-0 bg-black/5 hover:bg-black/10"><Tag className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pr-4 pb-4">
                    {STANDARD_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest border transition-all",
                          editingArtwork?.tags?.includes(tag)
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black/20 hover:border-black/50"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-6 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-black/40" />
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">Licht {(localCrops.brightness ?? editingArtwork?.brightness ?? 1).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4">
                   <RepeatButton onStep={() => handleLocalStep('brightness', -0.01, 0, 2)} className="h-10 w-10"><Minus className="h-5 w-5" /></RepeatButton>
                   <Slider 
                    value={[localCrops.brightness ?? editingArtwork?.brightness ?? 1]} 
                    max={2} 
                    step={0.01} 
                    onValueChange={([val]) => {
                      setLocalCrops(prev => ({ ...prev, brightness: val }));
                      editingId && updateArtworkField(editingId, 'brightness', val);
                    }}
                    className="w-28"
                  />
                  <RepeatButton onStep={() => handleLocalStep('brightness', 0.01, 0, 2)} className="h-10 w-10"><Plus className="h-5 w-5" /></RepeatButton>
                </div>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
