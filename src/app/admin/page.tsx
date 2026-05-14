"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  Trash2, 
  Settings, 
  Archive, 
  Database,
  Plus,
  X,
  Home,
  RefreshCw,
  Loader2,
  Tag,
  Brush,
  Minus,
  Sun,
  Crop,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Type
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState('db');
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [includeRootFolder, setIncludeRootFolder] = useState(false);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  
  const [selectedAtelierId, setSelectedAtelierId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    brightness: 100,
    title: ""
  });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: dbLoading } = useCollection(artworksQuery);

  const selectedArtwork = useMemo(() => 
    artworks?.find(a => a.id === selectedAtelierId), 
  [artworks, selectedAtelierId]);

  useEffect(() => {
    if (selectedArtwork) {
      setEditValues({
        cropTop: selectedArtwork.cropTop || 0,
        cropBottom: selectedArtwork.cropBottom || 0,
        cropLeft: selectedArtwork.cropLeft || 0,
        cropRight: selectedArtwork.cropRight || 0,
        brightness: (selectedArtwork.brightness || 1) * 100,
        title: selectedArtwork.title || ""
      });
    }
  }, [selectedArtwork]);

  const handleUpdateAtelier = (field: string, value: number) => {
    const newVal = Math.max(0, Math.min(field === 'brightness' ? 200 : 50, value));
    setEditValues(prev => ({ ...prev, [field]: newVal }));
    
    if (firestore && selectedAtelierId) {
      const artRef = doc(firestore, 'artworks', selectedAtelierId);
      const data = { [field]: field === 'brightness' ? newVal / 100 : newVal };
      updateDoc(artRef, data).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
    }
  };

  const handleUpdateText = (field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
    if (firestore && selectedAtelierId) {
      const artRef = doc(firestore, 'artworks', selectedAtelierId);
      const data = { [field]: value };
      updateDoc(artRef, data).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
    }
  };

  const navigateAtelier = (direction: 'next' | 'prev') => {
    if (!artworks || !selectedAtelierId) return;
    const currentIndex = artworks.findIndex(a => a.id === selectedAtelierId);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % artworks.length;
    } else {
      nextIndex = (currentIndex - 1 + artworks.length) % artworks.length;
    }
    setSelectedAtelierId(artworks[nextIndex].id);
  };

  const generateImageUrl = (relativePath: string) => {
    const encodedPath = relativePath.split('/').map(part => encodeURIComponent(part)).join('/');
    return `${nasBaseUrl}${encodedPath}`;
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const scanned = Array.from(files).map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      let detectedSeries = 'Onbekende Serie';
      if (pathParts.length > 1) {
        detectedSeries = pathParts[pathParts.length - 2] || detectedSeries;
      }
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      return {
        title: cleanName,
        series: detectedSeries,
        year: "Onbekend",
        medium: "Olieverf",
        relativePath: relativePath,
        fileName: file.name,
        description: "",
        imageHint: "painting",
        tags: []
      };
    });
    setScannedFiles(scanned);
    toast({ title: "Scan voltooid", description: `${scanned.length} werken gevonden.` });
  };

  const handleSeedDatabase = async () => {
    if (!firestore) return;
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    
    try {
      const artworksToSeed = PlaceHolderImages.filter(img => img.id.startsWith('artwork-'));
      
      for (const item of artworksToSeed) {
        const data = {
          title: item.title || 'Ongetiteld',
          series: item.series || 'Collectie',
          year: item.year || 'Onbekend',
          medium: item.medium || 'Gemengde techniek',
          imageUrl: item.imageUrl,
          description: item.description,
          imageHint: item.imageHint,
          tags: [],
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          brightness: 1,
          createdAt: serverTimestamp(),
        };
        addDoc(artworkCol, data).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: artworkCol.path,
            operation: 'create',
            requestResourceData: data
          }));
        });
      }
      toast({ title: "Database gevuld", description: "Voorbeelddata toegevoegd." });
      setActiveTab('db');
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij vullen" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!firestore || scannedFiles.length === 0) return;
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    
    try {
      for (let i = 0; i < scannedFiles.length; i++) {
        const artwork = scannedFiles[i];
        const data = { 
          title: artwork.title,
          series: artwork.series,
          year: artwork.year,
          medium: artwork.medium,
          imageUrl: generateImageUrl(artwork.relativePath),
          description: artwork.description,
          imageHint: artwork.imageHint,
          tags: [],
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          brightness: 1,
          createdAt: serverTimestamp(),
        };
        setCurrentUploadItem(i + 1);
        setUploadProgress(((i + 1) / scannedFiles.length) * 100);
        
        addDoc(artworkCol, data).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: artworkCol.path,
            operation: 'create',
            requestResourceData: data
          }));
        });
      }
      
      setTimeout(() => {
        toast({ title: "Import voltooid" });
        setScannedFiles([]);
        setLoading(false);
        setActiveTab('db');
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Fout bij importeren" });
    }
  };

  const handleAddTag = async (artId: string, currentTags: string[]) => {
    if (!firestore) return;
    const tagValue = newTagInputs[artId]?.trim();
    if (!tagValue || currentTags?.includes(tagValue)) return;
    
    const updatedTags = [...(currentTags || []), tagValue];
    const artRef = doc(firestore, 'artworks', artId);
    
    updateDoc(artRef, { tags: updatedTags })
      .then(() => {
        setNewTagInputs(prev => ({ ...prev, [artId]: "" }));
        toast({ title: "Tag toegevoegd" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: { tags: updatedTags }
        }));
      });
  };

  const handleRemoveTag = async (artId: string, tagToRemove: string, currentTags: string[]) => {
    if (!firestore) return;
    const updatedTags = (currentTags || []).filter(t => t !== tagToRemove);
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tag verwijderd" }))
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: { tags: updatedTags }
        }));
      });
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Zeker weten?")) return;
    const artRef = doc(firestore, 'artworks', artId);
    deleteDoc(artRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: artRef.path,
        operation: 'delete'
      }));
    });
  };

  const handleClearDatabase = async () => {
    if (!firestore || !confirm("Weet je zeker dat je ALLES wilt wissen?")) return;
    setLoading(true);
    try {
      const snaps = await getDocs(collection(firestore, 'artworks'));
      snaps.docs.forEach((d) => {
        deleteDoc(d.ref).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: d.ref.path,
            operation: 'delete'
          }));
        });
      });
      toast({ title: "Database opschonen gestart" });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout bij ophalen documenten" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">T</div>
            <span className="font-bold text-sm uppercase tracking-widest hidden sm:block">Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Button variant={activeTab === 'db' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('db')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Archief</Button>
            <Button variant={activeTab === 'atelier' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('atelier')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Atelier</Button>
            <Button variant={activeTab === 'scan' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('scan')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Importeren</Button>
            <Button variant={activeTab === 'system' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('system')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Systeem</Button>
          </nav>
        </div>
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/">Website</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <h2 className="text-3xl font-headline font-light">Mijn Archief ({artworks?.length || 0})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {artworks?.map((art: any) => (
                <Card key={art.id} className="overflow-hidden bg-card border-border rounded-2xl group">
                  <div className="relative aspect-[4/3]">
                    <Image 
                      src={art.imageUrl} 
                      alt={art.title} 
                      fill 
                      className="object-cover" 
                      unoptimized={true} 
                      style={{
                        clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                        filter: `brightness(${art.brightness || 1})`
                      }}
                    />
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="icon" onClick={() => { setActiveTab('atelier'); setSelectedAtelierId(art.id); }} className="rounded-full h-8 w-8"><Brush className="w-3.5 h-3.5" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h4 className="font-headline text-xl font-light mb-1">{art.title}</h4>
                    <p className="text-[9px] text-accent font-bold uppercase tracking-widest mb-4">{art.series} &bull; {art.year}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {art.tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="gap-1 py-0.5 px-2 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary/5">
                          {tag}
                          <button onClick={() => handleRemoveTag(art.id, tag, art.tags)}><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={newTagInputs[art.id] || ""} 
                        onChange={(e) => setNewTagInputs(prev => ({ ...prev, [art.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(art.id, art.tags) }}
                        placeholder="Tag..." className="h-8 text-[9px] rounded-full"
                      />
                      <Button variant="outline" size="icon" onClick={() => handleAddTag(art.id, art.tags)} className="h-8 w-8 rounded-full"><Plus className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'atelier' && selectedArtwork && (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <div className="bg-muted/10 rounded-3xl border border-border p-8 min-h-[500px] flex items-center justify-center">
                <div className="relative aspect-square w-full max-w-[600px]">
                  <Image 
                    src={selectedArtwork.imageUrl} alt={selectedArtwork.title} fill className="object-contain" unoptimized 
                    style={{
                      clipPath: `inset(${editValues.cropTop}% ${editValues.cropRight}% ${editValues.cropBottom}% ${editValues.cropLeft}%)`,
                      filter: `brightness(${editValues.brightness / 100})`
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <Card className="rounded-3xl p-8 border-border bg-card/50 space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest">Titel</Label>
                  <Input value={editValues.title} onChange={(e) => handleUpdateText('title', e.target.value)} />
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Crop (%)</h4>
                  {['cropTop', 'cropBottom', 'cropLeft', 'cropRight'].map(field => (
                    <div key={field} className="space-y-2">
                      <div className="flex justify-between text-[9px] uppercase tracking-widest opacity-60">
                        <span>{field.replace('crop', '')}</span>
                        <span>{editValues[field as keyof typeof editValues]}%</span>
                      </div>
                      <Slider value={[editValues[field as keyof typeof editValues]]} max={50} step={0.1} onValueChange={([val]) => handleUpdateAtelier(field, val)} />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest">Helderheid ({editValues.brightness}%)</Label>
                  <Slider value={[editValues.brightness]} max={200} min={50} step={1} onValueChange={([val]) => handleUpdateAtelier('brightness', val)} />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button onClick={() => navigateAtelier('next')} className="flex-1 h-12 rounded-xl text-[10px] uppercase font-bold tracking-widest">Volgende</Button>
                  <Button variant="outline" onClick={() => setSelectedAtelierId(null)} className="flex-1 h-12 rounded-xl text-[10px] uppercase font-bold tracking-widest">Sluiten</Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="max-w-2xl mx-auto space-y-12 text-center">
            <h2 className="text-4xl font-headline font-light">Importeren</h2>
            <div className="border-2 border-dashed border-border rounded-3xl p-16 bg-muted/5 group hover:border-primary/50 transition-all">
              <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
              <FolderOpen className="w-16 h-16 text-primary/20 mb-6 mx-auto" />
              <Button size="lg" className="h-14 px-12 rounded-full font-bold uppercase tracking-widest text-xs" asChild>
                <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
              </Button>
            </div>
            {scannedFiles.length > 0 && (
              <Card className="p-8 border-primary/20 bg-primary/5 rounded-3xl space-y-6">
                <p className="font-bold text-sm uppercase tracking-widest">{scannedFiles.length} kunstwerken gevonden.</p>
                {loading ? <Progress value={uploadProgress} className="h-3" /> : <Button onClick={handleSaveAll} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest">Start Import</Button>}
              </Card>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl font-headline font-light text-center">Systeem</h2>
            <Card className="p-8 space-y-6 rounded-3xl bg-card/30">
              <div className="flex items-center justify-between p-6 bg-background rounded-2xl border">
                <div>
                  <h3 className="text-xl font-headline font-light">Voorbeelden</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Herstel de basiscollectie</p>
                </div>
                <Button onClick={handleSeedDatabase} disabled={loading} className="h-10 px-6 font-bold text-[10px] uppercase tracking-widest">Seed DB</Button>
              </div>
              <div className="flex items-center justify-between p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                <h3 className="text-xl font-headline font-light text-destructive">Database Wissen</h3>
                <Button variant="outline" onClick={handleClearDatabase} disabled={loading} className="h-10 px-6 border-destructive text-destructive font-bold text-[10px] uppercase tracking-widest">Reset DB</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
