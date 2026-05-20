
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
  Tag as TagIcon,
  Monitor
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

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
      const displayTitle = art.displayTitle || art.title || "";
      const matchesSearch = displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      version: "2.3",
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
      <input type="file" ref={uploadDirInputRef} style={{ display: 'none' }} onChange={(e) => handleBatchProcess(e.target.files)} {...({ webkitdirectory: "", directory: "" } as any)} />
      
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredArtworks.map((art: any) => (
                <Card key={art.id} className="overflow-hidden cursor-pointer" onClick={() => setEditingId(art.id)}>
                  <div className="aspect-square bg-muted/20">
                    <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} style={{ filter: `brightness(${art.brightness || 1})` }} />
                  </div>
                  <CardContent className="p-2 text-center">
                    <h4 className="text-[9px] font-black uppercase truncate">{art.displayTitle || art.title}</h4>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="texts">
            <Card className="p-8 rounded-3xl max-w-4xl mx-auto space-y-8">
              <div className="grid gap-8">
                 <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase text-accent border-b border-accent/20 pb-1 block">Leo Duppen (Bio)</Label>
                    <Textarea defaultValue={siteSettings?.leoDuppenBio || ''} onBlur={(e) => updateSettingsField('leoDuppenBio', e.target.value)} className="min-h-[120px] bg-black/5 border-none rounded-xl p-4 text-sm" placeholder="Biografie Leo Duppen..." />
                 </div>
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Hanneke Sterk (Bio)</Label>
                        <Textarea defaultValue={siteSettings?.hannekeBio || ''} onBlur={(e) => updateSettingsField('hannekeBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-60">Beatrijs Sterk (Bio)</Label>
                        <Textarea defaultValue={siteSettings?.beatrijsBio || ''} onBlur={(e) => updateSettingsField('beatrijsBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase opacity-60">Peter Bes (Bio)</Label>
                    <Textarea defaultValue={siteSettings?.peterBesBio || ''} onBlur={(e) => updateSettingsField('peterBesBio', e.target.value)} className="min-h-[100px] bg-black/5 border-none text-xs" />
                 </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="p-12 text-center">
              <Button onClick={handleExportBackup} size="lg"><Download className="mr-2" /> Download Master Backup</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background">
          <DialogTitle className="sr-only">Editor</DialogTitle>
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4">
             {editingArtwork && <img src={editingArtwork.imageUrl} className="max-h-full object-contain shadow-2xl" />}
          </div>
          <div className="h-[35vh] border-t p-8 bg-background overflow-y-auto">
             <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase">Schermtitel</Label>
                  <Input defaultValue={editingArtwork?.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} />
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
