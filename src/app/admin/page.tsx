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
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

const STANDARD_TAGS = [
  "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
  "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
  "Bloemen", "Dieren", "Water", "Portretten"
];

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
  
  // Atelier State
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
    const pathParts = relativePath.split('/');
    let adjustedPath = relativePath;
    if (!includeRootFolder && pathParts.length > 1) {
      adjustedPath = pathParts.slice(1).join('/');
    }
    const encodedPath = adjustedPath.split('/').map(part => encodeURIComponent(part)).join('/');
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
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        title: cleanName,
        series: detectedSeries,
        year: new Date().getFullYear().toString(),
        medium: "Olieverf op doek",
        relativePath: relativePath,
        fileName: file.name,
        description: `Werk uit de serie ${detectedSeries}.`,
        imageHint: "painting art",
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
      for (let i = 0; i < PlaceHolderImages.length; i++) {
        const item = PlaceHolderImages[i];
        const data = {
          title: item.title || 'Ongetiteld',
          series: item.series || 'Voorbeeld Serie',
          year: item.year || '2023',
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
          const permissionError = new FirestorePermissionError({
            path: artworkCol.path,
            operation: 'create',
            requestResourceData: data
          });
          errorEmitter.emit('permission-error', permissionError);
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

  const handleAddTag = async (artId: string, currentTags: string[], tagToAdd?: string) => {
    if (!firestore) return;
    const tagValue = tagToAdd || newTagInputs[artId]?.trim();
    if (!tagValue) return;
    
    if (currentTags?.includes(tagValue)) return;
    
    const updatedTags = [...(currentTags || []), tagValue];
    const artRef = doc(firestore, 'artworks', artId);
    
    updateDoc(artRef, { tags: updatedTags })
      .then(() => {
        if (!tagToAdd) setNewTagInputs(prev => ({ ...prev, [artId]: "" }));
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
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg shadow-sm group-hover:scale-105 transition-transform relative overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain p-1" 
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
              <span className="relative z-10">T</span>
            </div>
            <span className="font-bold text-sm leading-none uppercase tracking-widest hidden sm:block">Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Button variant={activeTab === 'db' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('db')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Archive className="w-3.5 h-3.5" /> Archief
            </Button>
            <Button variant={activeTab === 'atelier' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('atelier')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Brush className="w-3.5 h-3.5" /> Atelier
            </Button>
            <Button variant={activeTab === 'scan' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('scan')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <UploadCloud className="w-3.5 h-3.5" /> Foto's Invoeren
            </Button>
            <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('settings')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Settings className="w-3.5 h-3.5" /> NAS
            </Button>
            <Button variant={activeTab === 'system' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('system')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Database className="w-3.5 h-3.5" /> Systeem
            </Button>
          </nav>
        </div>
        
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/" className="gap-2"><Home className="w-3.5 h-3.5" /> Website</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-light">Mijn Archief</h2>
                <p className="text-muted-foreground uppercase tracking-[0.2em] font-bold text-[9px]">{artworks?.length || 0} Geregistreerde werken</p>
              </div>
            </div>

            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Laden...</p>
              </div>
            ) : artworks?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6 border-2 border-dashed border-border rounded-3xl">
                <p className="text-muted-foreground font-light text-lg">Uw archief is nog leeg.</p>
                <Button onClick={() => setActiveTab('scan')} className="rounded-full px-8 uppercase tracking-widest font-bold text-xs h-12">
                  <Plus className="mr-2 w-4 h-4" /> Voeg uw eerste foto's toe
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border hover:shadow-xl transition-all group rounded-2xl">
                    <div className="relative aspect-[4/3] group/img">
                      <Image 
                        src={art.imageUrl} 
                        alt={art.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover/img:scale-105" 
                        unoptimized={true} 
                        style={{
                          clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                          filter: `brightness(${art.brightness || 1})`
                        }}
                      />
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="icon" onClick={() => { setActiveTab('atelier'); setSelectedAtelierId(art.id); }} className="rounded-full shadow-lg h-8 w-8">
                          <Brush className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full shadow-lg h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-0.5">
                        <h4 className="font-headline text-xl font-light leading-tight">{art.title}</h4>
                        <p className="text-[9px] text-accent font-bold uppercase tracking-[0.2em]">{art.series} &bull; {art.year}</p>
                      </div>
                      
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {art.tags?.length > 0 ? art.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="gap-1.5 pr-1 py-0.5 px-2 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                              {tag}
                              <button onClick={() => handleRemoveTag(art.id, tag, art.tags)} className="text-primary/40 hover:text-destructive transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )) : (
                            <span className="text-[8px] text-muted-foreground uppercase tracking-widest italic opacity-40">Geen tags</span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input 
                              value={newTagInputs[art.id] || ""} 
                              onChange={(e) => setNewTagInputs(prev => ({ ...prev, [art.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(art.id, art.tags) }}
                              placeholder="Tag toevoegen..." 
                              className="h-8 text-[9px] rounded-full bg-background/50 border-border"
                            />
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleAddTag(art.id, art.tags)}
                              className="h-8 w-8 rounded-full border-primary/20 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {STANDARD_TAGS.filter(t => !art.tags?.includes(t)).slice(0, 8).map(tag => (
                              <button 
                                key={tag}
                                onClick={() => handleAddTag(art.id, art.tags, tag)}
                                className="text-[7px] uppercase font-bold tracking-tighter text-muted-foreground hover:text-accent transition-colors border border-border px-1.5 py-0.5 rounded-sm"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'atelier' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-light">Atelier</h2>
                <p className="text-muted-foreground uppercase tracking-[0.2em] font-bold text-[9px]">Beeldbewerking & Optimalisatie</p>
              </div>
              <div className="flex gap-3">
                {selectedAtelierId && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => navigateAtelier('prev')} className="h-8 w-8 p-0 rounded-full"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigateAtelier('next')} className="h-8 w-8 p-0 rounded-full"><ChevronRight className="w-4 h-4" /></Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => { setSelectedAtelierId(null); setActiveTab('db'); }} className="text-[9px] uppercase font-bold rounded-full h-8 px-6">Terug naar archief</Button>
              </div>
            </div>

            {!selectedAtelierId ? (
              artworks && artworks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {artworks.map(art => (
                    <button 
                      key={art.id} 
                      onClick={() => setSelectedAtelierId(art.id)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                    >
                      <Image src={art.imageUrl} alt={art.title} fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                        <Brush className="text-white w-6 h-6" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-40 gap-6 border-2 border-dashed border-border rounded-3xl bg-muted/5">
                  <p className="text-muted-foreground font-light text-lg">Importeer eerst schilderijen om ze te bewerken.</p>
                  <Button onClick={() => setActiveTab('scan')} className="rounded-full px-8 uppercase tracking-widest font-bold text-xs h-12">
                    <UploadCloud className="mr-2 w-4 h-4" /> Foto's Invoeren
                  </Button>
                </div>
              )
            ) : (
              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                  <div className="bg-muted/10 rounded-3xl border border-border overflow-hidden flex items-center justify-center p-8 min-h-[500px] relative">
                    <div className="relative w-full h-full aspect-square max-h-[600px]">
                      {selectedArtwork && (
                        <Image 
                          src={selectedArtwork.imageUrl} 
                          alt={selectedArtwork.title} 
                          fill 
                          className="object-contain" 
                          unoptimized 
                          style={{
                            clipPath: `inset(${editValues.cropTop}% ${editValues.cropRight}% ${editValues.cropBottom}% ${editValues.cropLeft}%)`,
                            filter: `brightness(${editValues.brightness / 100})`
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-8">
                  <Card className="rounded-3xl p-8 border-border bg-card/50 shadow-xl space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-primary" />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest">Informatie</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase tracking-widest opacity-60">Titel</Label>
                          <Input 
                            value={editValues.title} 
                            onChange={(e) => handleUpdateText('title', e.target.value)}
                            className="bg-background border-border"
                            placeholder="Titel van het werk"
                          />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-accent">{selectedArtwork?.series} &bull; {selectedArtwork?.year}</p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      {/* Crop Controls */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Crop className="w-4 h-4 text-primary" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Crop Instellingen (%)</h4>
                        </div>

                        {[
                          { label: 'Boven', field: 'cropTop' },
                          { label: 'Onder', field: 'cropBottom' },
                          { label: 'Links', field: 'cropLeft' },
                          { label: 'Rechts', field: 'cropRight' },
                        ].map((c) => (
                          <div key={c.field} className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-[9px] uppercase tracking-widest opacity-60">{c.label}</Label>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-md border-primary/20 hover:bg-primary/5"
                                  onClick={() => handleUpdateAtelier(c.field, editValues[c.field as keyof typeof editValues] - 0.1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-[10px] font-mono font-bold min-w-[50px] text-center">
                                  {editValues[c.field as keyof typeof editValues].toFixed(1)}%
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-md border-primary/20 hover:bg-primary/5"
                                  onClick={() => handleUpdateAtelier(c.field, editValues[c.field as keyof typeof editValues] + 0.1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <Slider 
                              value={[editValues[c.field as keyof typeof editValues]]} 
                              max={50} 
                              step={0.1}
                              onValueChange={([val]) => handleUpdateAtelier(c.field, val)}
                              className="mt-2"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Brightness Control */}
                      <div className="space-y-6 pt-8 border-t border-border">
                        <div className="flex items-center gap-2 mb-4">
                          <Sun className="w-4 h-4 text-primary" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest">Helderheid</h4>
                        </div>
                        <div className="flex justify-between items-center">
                          <Label className="text-[9px] uppercase tracking-widest opacity-60">Belichting</Label>
                          <span className="text-[10px] font-mono font-bold">{editValues.brightness}%</span>
                        </div>
                        <Slider 
                          value={[editValues.brightness]} 
                          max={200} 
                          min={50}
                          step={1}
                          onValueChange={([val]) => handleUpdateAtelier('brightness', val)}
                        />
                      </div>
                    </div>

                    <div className="pt-8 flex gap-4">
                      <Button 
                        onClick={() => navigateAtelier('next')} 
                        className="flex-1 h-14 text-[10px] font-bold uppercase tracking-widest rounded-2xl"
                      >
                        Volgende Schilderij
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => { setSelectedAtelierId(null); }} 
                        className="flex-1 h-14 text-[10px] font-bold uppercase tracking-widest rounded-2xl border-primary/20"
                      >
                        Klaar
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="space-y-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4 mb-12">
              <h2 className="text-4xl font-headline font-light">Foto's Invoeren</h2>
              <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Importeer een serie schilderijen van je NAS</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="border-2 border-dashed border-border rounded-3xl p-16 bg-muted/5 flex flex-col items-center justify-center text-center transition-all hover:bg-muted/10 hover:border-primary/50 group">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-16 h-16 text-primary/20 mb-6 transition-colors group-hover:text-primary/40" />
                  <Button size="lg" className="h-14 px-12 rounded-full font-bold uppercase tracking-widest text-xs" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                  </Button>
                  <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest">Selecteer de map met schilderijen op je NAS</p>
                </div>

                <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                  <h3 className="font-headline text-xl flex items-center gap-3"><Settings className="w-5 h-5 text-accent" /> Import Instellingen</h3>
                  <div className="space-y-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">De mapnaam wordt automatisch als 'Serie' herkend. Bestandsnamen worden de 'Titel'.</p>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                      <Label htmlFor="root-folder" className="text-xs font-bold uppercase tracking-widest">Hoofdmap in URL</Label>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </div>
                </div>
              </div>

              {scannedFiles.length > 0 && (
                <div className="space-y-6">
                  <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-3xl p-8 space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-headline font-light flex items-center gap-4 text-primary">Scan Gereed</h3>
                      <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">{scannedFiles.length} kunstwerken gevonden.</p>
                    </div>
                    {loading ? (
                      <div className="space-y-4">
                        <Progress value={uploadProgress} className="h-4 rounded-full" />
                        <p className="text-center font-bold text-[10px] uppercase tracking-widest">Bezig met importeren: {currentUploadItem} / {scannedFiles.length}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button onClick={handleSaveAll} className="w-full h-16 text-lg font-bold rounded-2xl uppercase tracking-widest shadow-xl">Start Import</Button>
                        <Button variant="ghost" onClick={() => setScannedFiles([])} className="w-full text-[10px] uppercase font-bold tracking-widest">Annuleren</Button>
                      </div>
                    )}
                  </Card>
                  
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                    {scannedFiles.slice(0, 10).map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-[10px] uppercase tracking-widest font-bold">
                        <span className="truncate flex-1">{f.title}</span>
                        <span className="text-accent opacity-60 ml-4 shrink-0">{f.series}</span>
                      </div>
                    ))}
                    {scannedFiles.length > 10 && <p className="text-center text-[9px] uppercase tracking-widest opacity-40">... en nog {scannedFiles.length - 10} meer</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-border shadow-2xl rounded-3xl p-10 space-y-12 bg-card/50">
              <div className="space-y-2">
                <h2 className="text-4xl font-headline font-light">NAS Setup</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Configureer de verbinding met je Synology NAS</p>
              </div>
              <div className="space-y-6">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Netwerk Locatie</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="h-16 text-[10px] uppercase tracking-widest font-bold rounded-xl">Lokaal Netwerk</Button>
                  <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="h-16 text-[10px] uppercase tracking-widest font-bold rounded-xl">QuickConnect</Button>
                </div>
                <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-12 text-sm rounded-lg" />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-headline font-light">Systeem</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Beheer de database status</p>
            </div>
            <Card className="border-border shadow-xl rounded-3xl p-8 space-y-6 bg-card/30">
              <div className="p-6 bg-background rounded-2xl border border-border space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-headline font-light">Voorbeelden Herstellen</h3>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Vult de database met de standaard collectie</p>
                  </div>
                  <Button onClick={handleSeedDatabase} disabled={loading} className="h-12 px-8 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest bg-accent text-accent-foreground">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Seed DB
                  </Button>
                </div>
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-2"><Tag className="w-3 h-3" /> Standaard Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_TAGS.map(t => (
                      <Badge key={t} variant="outline" className="text-[8px] uppercase tracking-widest border-primary/20 bg-primary/5">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                <div className="space-y-1">
                  <h3 className="text-xl font-headline font-light text-destructive">Database Wissen</h3>
                  <p className="text-[9px] text-destructive/60 uppercase tracking-widest">Verwijder alle geregistreerde werken</p>
                </div>
                <Button variant="outline" onClick={handleClearDatabase} disabled={loading} className="h-12 px-8 rounded-xl border-destructive text-destructive font-bold text-[10px] uppercase tracking-widest">
                  Reset DB
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
