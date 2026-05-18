"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
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
  Archive,
  Square,
  CheckSquare,
  FileJson,
  Type,
  Upload,
  Download,
  Database,
  ShieldCheck,
  Layers,
  Eye,
  EyeOff,
  Tag as TagIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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

const STANDARD_TAGS = ["Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood", "Bloemen", "Dieren", "Water", "Portretten"];

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
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

  const { data: rawArtworks, loading: isCollectionLoading } = useCollection(artworksQuery);

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

  const hiddenSeries = useMemo(() => siteSettings?.hiddenSeries || [], [siteSettings]);

  const seriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    artworks.forEach(art => {
      const s = art.series || "Geen zaal";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter(art => {
      const matchesSearch = (art.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchesFilter = !filterSeries || (art.series || "Geen zaal") === filterSeries;
      return matchesSearch && matchesFilter;
    });
  }, [artworks, searchQuery, filterSeries]);

  const editingArtwork = useMemo(() => {
    return artworks.find(art => art.id === editingId) || null;
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
      setNewTagInput('');
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

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' })));
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtwork || !newTagInput.trim()) return;
    const currentTags = editingArtwork.tags || [];
    if (!currentTags.includes(newTagInput.trim())) {
      updateArtworkField(editingArtwork.id, 'tags', [...currentTags, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'site');
    setDoc(settingsRef, { [field]: value }, { merge: true })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsRef.path, operation: 'update' })));
  };

  const toggleSeriesVisibility = (name: string) => {
    const current = siteSettings?.hiddenSeries || [];
    const updated = current.includes(name) 
      ? current.filter((s: string) => s !== name) 
      : [...current, name];
    updateSettingsField('hiddenSeries', updated);
  };

  const handleBulkMove = () => {
    if (!firestore || selectedIds.length === 0 || !bulkMoveSeries.trim()) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    const totalToMove = selectedIds.length;
    
    selectedIds.forEach(id => {
      batch.update(doc(firestore, 'artworks', id), { series: bulkMoveSeries.trim() });
    });
    
    batch.commit()
      .then(() => {
        toast({ title: "Verplaatst", description: `${totalToMove} werken verplaatst.` });
        setSelectedIds([]);
        setBulkMoveSeries('');
        
        setTimeout(() => {
          if (!window.confirm("Verplaatsing voltooid en selectie vrijgegeven. Wilt u nog meer werken verplaatsen?")) {
            // Geen verdere actie nodig
          }
        }, 150);
      })
      .finally(() => setIsSaving(false));
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleLocalStep = (field: string, delta: number, min = 0, max = 50) => {
    if (!editingArtwork || !editingId) return;
    const current = localCrops[field] ?? (editingArtwork as any)[field] ?? (field === 'brightness' ? 1 : 0);
    const next = Math.min(max, Math.max(min, Number((current + delta).toFixed(2))));
    setLocalCrops(prev => ({ ...prev, [field]: next }));
    updateArtworkField(editingId, field, next);
  };

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || !firestore || !storage) return;
    setIsUploading(true);
    setUploadProgress(0);
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalFiles = filesArray.length;
    let processed = 0;

    try {
      for (const file of filesArray) {
        try {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
          const storageRef = ref(storage, `artworks/${timestamp}_${randomId}_${safeName}`);
          
          setUploadStatus(`Uploaden: ${file.name}... (${processed + 1}/${totalFiles})`);

          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000));
          
          const snapshot: any = await Promise.race([uploadPromise, timeoutPromise]);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          
          const docData = {
            title: file.name.split('.')[0] || "Naamloos",
            series: "Nieuwe Uploads",
            year: new Date().getFullYear().toString(),
            medium: "Olieverf",
            imageUrl: downloadUrl,
            tags: [],
            featured: false,
            createdAt: serverTimestamp(),
            cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1
          };
          
          await addDoc(collection(firestore, 'artworks'), docData);
        } catch (e) { 
          toast({ variant: "destructive", title: "Upload Fout", description: `Kon ${file.name} niet verwerken.` });
        }
        processed++;
        setUploadProgress((processed / totalFiles) * 100);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (uploadDirInputRef.current) uploadDirInputRef.current.value = '';
      toast({ title: "Klaar", description: "Import naar Depot voltooid." });
    }
  };

  const handleImportJson = () => {
    if (!firestore || !bulkJson) return;
    setIsSaving(true);
    try {
      const imported = JSON.parse(bulkJson);
      let dataToImport: any[] = [];
      let settingsToImport: any = null;

      if (imported.artworks && Array.isArray(imported.artworks)) {
        dataToImport = imported.artworks;
        settingsToImport = imported.settings;
      } else if (Array.isArray(imported)) {
        dataToImport = imported;
      } else if (imported.placeholderImages) {
        dataToImport = imported.placeholderImages;
      } else {
        dataToImport = [imported];
      }
      
      if (settingsToImport) {
        const settingsRef = doc(firestore, 'settings', 'site');
        setDoc(settingsRef, settingsToImport, { merge: true }).catch(async () => {});
      }

      const chunkSize = 400;
      for (let i = 0; i < dataToImport.length; i += chunkSize) {
        const chunk = dataToImport.slice(i, i + chunkSize);
        const batch = writeBatch(firestore);
        
        chunk.forEach(item => {
          const { id, createdAt, ...rest } = item;
          const sanitizedItem = {
            ...rest,
            series: rest.series || "Nieuwe Uploads",
            tags: Array.isArray(rest.tags) ? rest.tags : [],
            cropTop: Number(rest.cropTop) || 0,
            cropBottom: Number(rest.cropBottom) || 0,
            cropLeft: Number(rest.cropLeft) || 0,
            cropRight: Number(rest.cropRight) || 0,
            brightness: Number(rest.brightness) || 1,
            createdAt: serverTimestamp()
          };
          batch.set(doc(collection(firestore, 'artworks')), sanitizedItem);
        });

        batch.commit().catch(async () => {});
      }

      toast({ title: "Herstel Gestart", description: `${dataToImport.length} werken worden nu op de achtergrond hersteld.` });
      setBulkJson('');
    } catch (e) { 
      toast({ variant: "destructive", title: "Import Fout", description: "Controleer of de JSON data correct is." }); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = (isMaster: boolean = true) => {
    if (!artworks || artworks.length === 0) {
      toast({ title: "Leeg Depot", description: "Niets te exporteren." });
      return;
    }

    let exportData: any;
    let filename: string;

    if (isMaster) {
      exportData = {
        version: "2.1",
        exportedAt: new Date().toISOString(),
        artworks: artworks,
        settings: siteSettings || {}
      };
      filename = `thijs-sterk-master-backup-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      exportData = artworks;
      filename = `thijs-sterk-kaal-depot-${new Date().toISOString().split('T')[0]}.json`;
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ 
      title: isMaster ? "Master Backup Geslaagd" : "Kaal Depot Geëxporteerd", 
      description: isMaster ? "Volledig Depot inclusief zalen en instellingen opgeslagen." : "Alleen de lijst met schilderijen is opgeslagen."
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />
      
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="h-10 w-auto" alt="Logo" />
          <h1 className="font-headline text-lg font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <Link href="/" className="text-[11px] uppercase tracking-widest font-black text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Website
        </Link>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-muted/50 p-1 rounded-full w-fit flex flex-wrap justify-center h-auto">
              <TabsTrigger value="archive" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">
                Archief (Depot) <span className="ml-2 opacity-40">[{artworks.length}]</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Importeer Map</TabsTrigger>
              <TabsTrigger value="texts" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Pagina Teksten</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Master Backup</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Zoek op titel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-full h-10 text-xs bg-muted/30 border-none" />
            </div>
          </div>

          <TabsContent value="archive" className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-black/5">
              <Button variant={filterSeries === null ? "default" : "outline"} size="sm" onClick={() => setFilterSeries(null)} className="rounded-full text-[9px] uppercase tracking-widest font-bold h-7">Alles ({artworks.length})</Button>
              {seriesWithCounts.map(s => {
                const isHidden = hiddenSeries.includes(s.name);
                return (
                  <div key={s.name} className="flex items-center gap-1 group">
                    <Button variant={filterSeries === s.name ? "default" : "outline"} size="sm" onClick={() => setFilterSeries(s.name)} className={cn("rounded-l-full rounded-r-none text-[9px] uppercase tracking-widest font-bold h-7 whitespace-nowrap pr-2", isHidden && "opacity-40 grayscale")}>
                      {s.name} ({s.count})
                    </Button>
                    <button onClick={() => toggleSeriesVisibility(s.name)} className={cn("h-7 px-2 rounded-r-full border-2 border-l-0 transition-colors flex items-center justify-center bg-background", isHidden ? "text-red-500 border-red-200 hover:bg-red-50" : "text-green-600 border-black hover:bg-black/5")}>
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center h-12">
               <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" disabled={isUploading} className="rounded-full text-[11px] uppercase font-black tracking-widest border-accent text-accent">
                 {isUploading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
                 Bestand naar Depot
               </Button>
            </div>

            {selectedIds.length > 0 && (
              <div className="bg-accent/10 border border-accent/20 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-accent">{selectedIds.length} geselecteerd</span>
                  <Input placeholder="Verplaats naar zaal..." value={bulkMoveSeries} onChange={(e) => setBulkMoveSeries(e.target.value)} className="h-8 text-[11px] font-black uppercase w-48" />
                  <Button onClick={handleBulkMove} disabled={isSaving || !bulkMoveSeries} size="sm" className="h-8 rounded-full text-[11px] font-black uppercase tracking-widest bg-accent">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verplaats Nu"}
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => { if(confirm('Verwijderen?')) { const b = writeBatch(firestore!); selectedIds.forEach(id => b.delete(doc(firestore!, 'artworks', id))); b.commit(); setSelectedIds([]); } }} className="h-8 rounded-full text-[11px] font-black uppercase tracking-widest text-red-500">Verwijder</Button>
              </div>
            )}

            {isCollectionLoading && artworks.length === 0 ? <div className="flex justify-center py-20"><Loader2 className="animate-spin opacity-20" /></div> : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredArtworks.map((art: any) => (
                  <Card key={art.id} className={cn("overflow-hidden group cursor-pointer transition-all relative border-2", selectedIds.includes(art.id) ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-transparent")} onClick={() => setEditingId(art.id)}>
                    <button onClick={(e) => toggleSelect(e, art.id)} className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-white/80 border-2 border-accent flex items-center justify-center">
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4 text-accent fill-accent" /> : <Square className="w-4 h-4 text-accent/30" />}
                    </button>
                    <div className="relative aspect-square bg-muted/20">
                      <img src={art.imageUrl} className="w-full h-full object-cover" style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }} alt={art.title} />
                    </div>
                    <CardContent className="p-2 text-center">
                      <h4 className="text-[9px] font-black text-black uppercase tracking-widest truncate">{art.title}</h4>
                      <p className="text-[7px] uppercase tracking-widest opacity-40 mt-1 truncate">{art.series}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-16 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto text-center">
                <CloudUpload className="w-12 h-12 text-accent" />
                <div className="space-y-2">
                  <h3 className="text-[12px] font-black uppercase tracking-widest">Bulk Import naar Depot</h3>
                  <p className="text-[10px] uppercase opacity-40 leading-relaxed">Alle afbeeldingen in de geselecteerde map worden direct naar het centrale Depot geüpload onder "Nieuwe Uploads".</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-24 rounded-2xl font-black uppercase tracking-widest text-[11px]"><Plus className="w-4 h-4 mr-2" />Bestanden</Button>
                  <Button onClick={() => uploadDirInputRef.current?.click()} disabled={isUploading} variant="secondary" className="h-24 rounded-2xl font-black uppercase tracking-widest text-[11px]"><FolderOpen className="w-4 h-4 mr-2" />Volledige Map</Button>
                </div>
                {isUploading && (
                  <div className="w-full space-y-4">
                    <Progress value={uploadProgress} className="h-1 bg-black/10" />
                    <p className="text-[9px] font-black text-black uppercase text-center">{uploadStatus}</p>
                  </div>
                )}
              </Card>
          </TabsContent>

          <TabsContent value="texts">
            <Card className="p-8 rounded-3xl max-w-4xl mx-auto space-y-8">
              <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                <Type className="w-5 h-5 text-accent" />
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">Pagina Teksten</h2>
              </div>
              
              <div className="grid gap-8">
                 <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase text-accent border-b border-accent/20 pb-1 block">Homepagina - Thijs Sterk</Label>
                    <Input defaultValue={siteSettings?.homeBioImageUrl || ''} onBlur={(e) => updateSettingsField('homeBioImageUrl', e.target.value)} placeholder="Hoofdafbeelding URL..." className="bg-black/5 border-none h-10 text-xs" />
                    <Textarea defaultValue={siteSettings?.homeBio || ''} onBlur={(e) => updateSettingsField('homeBio', e.target.value)} className="min-h-[120px] bg-black/5 border-none rounded-xl p-4 text-sm" placeholder="Biografie..." />
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Hanneke Sterk (Bio)</Label>
                        <Textarea defaultValue={siteSettings?.hannekeBio || ''} onBlur={(e) => updateSettingsField('hannekeBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" placeholder="Hanneke bio..." />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Beatrijs Sterk (Bio)</Label>
                        <Textarea defaultValue={siteSettings?.beatrijsBio || ''} onBlur={(e) => updateSettingsField('beatrijsBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" placeholder="Beatrijs bio..." />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase opacity-60">Peter Bes (Bio)</Label>
                    <Textarea defaultValue={siteSettings?.peterBesBio || ''} onBlur={(e) => updateSettingsField('peterBesBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" placeholder="Peter Bes bio..." />
                 </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-8 rounded-3xl max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col items-center justify-center p-12 bg-accent/5 rounded-2xl border-2 border-dashed border-accent/20 text-center space-y-6">
                <ShieldCheck className="w-16 h-16 text-accent" />
                <div className="space-y-2">
                  <h2 className="text-[14px] font-black uppercase tracking-widest">Master Backup & Herstel</h2>
                  <p className="text-[10px] uppercase opacity-40 max-w-md mx-auto leading-relaxed">
                    Kies hieronder welk type backup u wilt maken. Een Master Backup bevat alles (zalen, teksten, instellingen), een Kaal Depot alleen de schilderij-data.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={() => handleExportBackup(true)} className="h-14 px-8 rounded-xl font-black uppercase tracking-widest text-[11px] bg-accent hover:bg-accent/90">
                    <Download className="w-4 h-4 mr-2" /> Download Master Backup
                  </Button>
                  <Button variant="outline" onClick={() => handleExportBackup(false)} className="h-14 px-8 rounded-xl font-black uppercase tracking-widest text-[11px] border-accent text-accent bg-background">
                    <Layers className="w-4 h-4 mr-2" /> Download Kaal Depot
                  </Button>
                </div>

                <div className="pt-8 border-t border-black/5 w-full">
                  <Button variant="secondary" onClick={() => jsonFileInputRef.current?.click()} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] w-full max-w-xs">
                    <Upload className="w-4 h-4 mr-2" /> Kies Backup Bestand om te Herstellen
                  </Button>
                </div>
              </div>
              
              <input type="file" ref={jsonFileInputRef} style={{ display: 'none' }} accept=".json" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setBulkJson(ev.target?.result as string);
                reader.readAsText(file);
              }} />
              
              {bulkJson && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">JSON Preview (Geselecteerd voor Import)</Label>
                    <Button variant="ghost" size="sm" onClick={() => setBulkJson('')} className="text-[9px] uppercase font-bold text-red-500">Annuleren</Button>
                  </div>
                  <Textarea value={bulkJson} readOnly className="min-h-[200px] font-mono text-[10px] bg-black/5 border-none rounded-xl" />
                  <Button onClick={handleImportJson} disabled={isSaving} className="h-14 rounded-xl font-black uppercase tracking-widest w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Start Herstel naar Cloud (Inclusief Zalen)
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none outline-none">
          <DialogTitle className="sr-only">Master Editor</DialogTitle>
          <div className="relative h-[65vh] w-full flex items-center justify-center bg-[#f3f3f3] group">
            {editingArtwork && (
              <img 
                src={editingArtwork.imageUrl} 
                className="max-w-[90%] max-h-[90%] object-contain shadow-2xl" 
                style={{ 
                  clipPath: `inset(${localCrops.cropTop ?? 0}% ${localCrops.cropRight ?? 0}% ${localCrops.cropBottom ?? 0}% ${localCrops.cropLeft ?? 0}%)`, 
                  filter: `brightness(${localCrops.brightness ?? 1})` 
                }} 
                alt={editingArtwork.title}
              />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button onClick={() => navigateEditing('prev')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10"><ChevronLeft className="w-8 h-8 text-black" /></button>
              <button onClick={() => navigateEditing('next')} className="p-4 rounded-full bg-black/5 pointer-events-auto hover:bg-black/10"><ChevronRight className="w-8 h-8 text-black" /></button>
            </div>
            <div className="absolute top-4 right-4 flex gap-3 items-center">
              <Button variant="ghost" size="icon" onClick={() => { if (!editingId || !firestore) return; if(confirm('Verwijderen?')) { deleteDoc(doc(firestore, 'artworks', editingId)); setEditingId(null); } }} className="h-4 w-4 rounded-full text-red-600"><Trash2 className="w-3 h-3" /></Button>
              <DialogClose className="h-5 w-5 flex items-center justify-center bg-black/10 rounded-full hover:bg-black/20"><X className="w-2.5 h-2.5 text-black" /></DialogClose>
            </div>
          </div>

          <div className="h-[35vh] w-full bg-background border-t border-black/10 px-8 py-4 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full h-full">
              <div className="flex flex-col gap-4 border-r border-black/5 pr-8">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Titel</Label>
                  <Input key={`${editingId}-title`} defaultValue={editingArtwork?.title || ''} onBlur={(e) => editingId && updateArtworkField(editingId, 'title', e.target.value)} className="h-8 text-[11px] font-black uppercase border-none bg-black/5 rounded-sm p-2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-accent">Zaal (Serie)</Label>
                  <Input key={`${editingId}-series`} defaultValue={editingArtwork?.series || ''} onBlur={(e) => editingId && updateArtworkField(editingId, 'series', e.target.value)} className="h-8 text-[11px) font-black uppercase border-none bg-accent/5 rounded-sm p-2" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Sun className="w-3 h-3 text-black/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Licht {(localCrops.brightness ?? 1).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RepeatButton onStep={() => handleLocalStep('brightness', -0.01, 0, 2)} className="h-6 w-6"><Minus className="h-3 w-3" /></RepeatButton>
                    <RepeatButton onStep={() => handleLocalStep('brightness', 0.01, 0, 2)} className="h-6 w-6"><Plus className="h-3 w-3" /></RepeatButton>
                  </div>
                </div>
                <Slider value={[localCrops.brightness ?? 1]} max={2} step={0.01} onValueChange={([val]) => { setLocalCrops(prev => ({ ...prev, brightness: val })); updateArtworkField(editingId!, 'brightness', val); }} className="w-full" />
              </div>

              <div className="flex flex-col gap-4 border-r border-black/5 pr-8">
                <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <TagIcon className="w-3 h-3" /> Tags & Kenmerken
                </Label>
                
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto">
                  {(editingArtwork?.tags || []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase rounded-sm group">
                      {tag}
                      <button onClick={() => {
                        const newTags = (editingArtwork?.tags || []).filter((t: string) => t !== tag);
                        updateArtworkField(editingId!, 'tags', newTags);
                      }} className="hover:text-red-400 transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {(editingArtwork?.tags || []).length === 0 && <span className="text-[9px] uppercase opacity-30 font-bold">Geen tags...</span>}
                </div>

                <form onSubmit={handleAddCustomTag} className="flex gap-2 mb-4">
                  <Input 
                    value={newTagInput} 
                    onChange={(e) => setNewTagInput(e.target.value)} 
                    placeholder="Nieuwe Tag..." 
                    className="h-7 text-[10px] uppercase font-black tracking-widest bg-black/5 border-none rounded-sm"
                  />
                  <Button type="submit" size="sm" className="h-7 px-3 text-[9px] font-black uppercase">Voeg Toe</Button>
                </form>

                <div className="grid grid-cols-3 gap-1 overflow-y-auto">
                  {STANDARD_TAGS.map(tag => {
                    const isActive = (editingArtwork?.tags || []).includes(tag);
                    return (
                      <button 
                        key={tag} 
                        onClick={() => {
                          const currentTags = editingArtwork?.tags || [];
                          const newTags = isActive ? currentTags.filter((t: string) => t !== tag) : [...currentTags, tag];
                          updateArtworkField(editingId!, 'tags', newTags);
                        }} 
                        className={cn(
                          "px-1 py-1 rounded-sm text-[8px] font-black uppercase tracking-tight border transition-all text-center", 
                          isActive ? "bg-black text-white border-black" : "bg-white text-black border-black/10 hover:border-black/30"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <Label className="text-[10px] font-black uppercase tracking-widest">Uitsnede (Cropping)</Label>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {['Top', 'Bottom', 'Left', 'Right'].map(side => {
                    const fieldName = `crop${side}`;
                    const currentVal = localCrops[fieldName] ?? 0;
                    return (
                      <div key={side} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase">{side}</span>
                          <span className="text-[9px] font-mono opacity-50">{currentVal.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <RepeatButton onStep={() => handleLocalStep(fieldName, -0.1)} className="h-6 w-6"><Minus className="h-3 w-3" /></RepeatButton>
                          <RepeatButton onStep={() => handleLocalStep(fieldName, 0.1)} className="h-6 w-6"><Plus className="h-3 w-3" /></RepeatButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
