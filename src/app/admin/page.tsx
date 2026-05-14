"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
  Image as ImageIcon,
  FolderOpen,
  Maximize2,
  Tag,
  Info,
  Globe,
  CloudUpload,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Cloud,
  HardDrive,
  Link as LinkIcon,
  Calendar,
  Type,
  Star,
  LayoutGrid,
  CheckCircle2,
  Save
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  
  const [nasBaseUrl, setNasBaseUrl] = useState('http://192.168.178.15/fotos/');
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
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
        
        // Gebruik de direct bovenliggende mapnaam als de serie
        let detectedSeries = "Hoofdcollectie";
        if (pathParts.length > 1) {
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
      description: `${artworksToImport.length} foto's verdeeld over collecties. Controleer de 'Bulk' tab.` 
    });
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !storage || !firestore) return;

    setIsUploading(true);
    setUploadProgress(0);
    const totalFiles = files.length;
    let startedCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      setUploadStatus(`Verwerken: ${file.name} (${i + 1}/${totalFiles})`);
      
      const uniqueId = Math.random().toString(36).substring(7);
      const storageRef = ref(storage, `artworks/${Date.now()}_${uniqueId}_${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        
        const newArtwork = {
          title: fileNameOnly,
          series: "Cloud Collectie",
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

        const artworkCol = collection(firestore, 'artworks');
        addDoc(artworkCol, newArtwork).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: 'artworks',
            operation: 'create',
            requestResourceData: newArtwork,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        startedCount++;
        setUploadProgress((startedCount / totalFiles) * 100);
      } catch (error: any) {
        console.error('Storage error:', error);
      }
    }

    toast({ 
      title: "Batch Voltooid", 
      description: `${startedCount} foto's zijn verwerkt.` 
    });
    
    setIsUploading(false);
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setActiveTab('archive'), 800);
  };

  const handleManualAdd = async () => {
    if (!manualUrl || !firestore) return;
    
    setLoading(true);
    try {
      const newArtwork = {
        title: manualTitle || "Nieuw Werk",
        series: "Handmatige Toevoeging",
        imageUrl: manualUrl,
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

      const artworkCol = collection(firestore, 'artworks');
      addDoc(artworkCol, newArtwork);

      toast({ title: "Toegevoegd", description: "Het werk staat nu in het archief." });
      setManualTitle('');
      setManualUrl('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "Fout", description: "Kon het werk niet toevoegen." });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const data = JSON.parse(bulkJson);
      const artworksArray = Array.isArray(data) ? data : [data];
      const artworkCol = collection(firestore, 'artworks');
      
      artworksArray.forEach((item: any) => {
        const payload = {
          ...item,
          createdAt: serverTimestamp(),
          cropTop: item.cropTop || 0,
          cropBottom: item.cropBottom || 0,
          cropLeft: item.cropLeft || 0,
          cropRight: item.cropRight || 0,
          brightness: item.brightness || 1,
          featured: item.featured || false,
          tags: item.tags || []
        };
        
        addDoc(artworkCol, payload);
      });
      
      toast({ title: "Import Succesvol", description: `${artworksArray.length} items toegevoegd aan het archief.` });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "Controleer het format." });
    } finally {
      setLoading(false);
    }
  };

  const updateArtworkField = async (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    setIsSaving(true);
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value })
      .then(() => {
        setTimeout(() => setIsSaving(false), 300);
      })
      .catch(async (serverError) => {
        setIsSaving(false);
      });
  };

  const toggleArtworkTag = (artwork: any, tag: string) => {
    const currentTags = artwork.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    updateArtworkField(artwork.id, 'tags', newTags);
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Weet u het zeker? Dit kan niet ongedaan gemaakt worden.")) return;
    const artRef = doc(firestore, 'artworks', artId);
    deleteDoc(artRef);
    if (editingId === artId) setEditingId(null);
  };

  const isStorageUrl = (url: string) => url?.includes('firebasestorage.googleapis.com');

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={directoryInputRef} style={{ display: 'none' }} onChange={handleDirectoryChange} {...({ webkitdirectory: "", directory: "" } as any)} />
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" multiple />

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
              <TabsTrigger value="upload" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Upload</TabsTrigger>
              <TabsTrigger value="nas" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Map Scannen</TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Bulk</TabsTrigger>
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
                <p className="text-sm font-light italic">Archief wordt geladen...</p>
              </div>
            ) : filteredArtworks.length === 0 ? (
              <div className="py-20 text-center border border-dashed rounded-3xl opacity-40">
                <p className="text-sm font-light italic">
                  {searchQuery ? "Geen resultaten gevonden." : "Nog niets in het archief. Begin met uploaden!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredArtworks.map((art: any) => (
                  <Card 
                    key={art.id} 
                    className={cn(
                      "overflow-hidden bg-card border-border rounded-2xl group cursor-pointer transition-all hover:ring-2 hover:ring-accent/40",
                      art.featured && "ring-2 ring-accent shadow-lg"
                    )}
                    onClick={() => setEditingId(art.id)}
                  >
                    <div className="relative aspect-square bg-muted/20 overflow-hidden">
                      <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ 
                          clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, 
                          filter: `brightness(${art.brightness || 1})` 
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+Fout'; }}
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {art.featured && (
                          <Badge className="bg-accent text-white border-none p-1 shadow-md"><Star className="w-3 h-3 fill-white" /></Badge>
                        )}
                        {isStorageUrl(art.imageUrl) ? (
                          <Badge className="bg-blue-500 text-white border-none p-1"><Cloud className="w-3 h-3" /></Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white border-none p-1"><HardDrive className="w-3 h-3" /></Badge>
                        )}
                      </div>
                      
                      {art.series && (
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-black/40 text-[7px] text-white border-none backdrop-blur-md uppercase tracking-widest">{art.series}</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-headline text-xs font-light truncate">{art.title}</h4>
                      <p className="text-[8px] text-accent font-bold uppercase tracking-widest truncate">{art.series || "Geen Zaal"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-headline font-light">Mappen Importeren</h2>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
                  Selecteer een hoofdmap. De app herkent automatisch alle submappen en gebruikt die als <strong>Zaal (Serie)</strong> voor de schilderijen daarin.
                </p>
              </div>
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Basis URL van je server (bijv. NAS)</Label>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                  </div>
                  <div className="pt-4 border-t border-border/20">
                    <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg group">
                      <FolderOpen className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" />
                      Hoofdmap Kiezen & Analyseren
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                <div className="space-y-6">
                  <Label className="text-[10px] uppercase font-bold">Gevonden Schilderijen (JSON)</Label>
                  <Textarea placeholder='Eerst een map scannen...' value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
                  <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl">
                    {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Toevoegen aan Archief</>}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-headline font-light">Cloud Upload</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">Plaats bestanden direct in de beveiligde Firebase Cloud.</p>
                </div>

                <Card className="p-10 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-6">
                  <CloudUpload className="w-12 h-12 text-accent" />
                  <Button onClick={handleFileSelect} disabled={isUploading} className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl">
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                    Kies Bestanden
                  </Button>
                  {isUploading && (
                    <div className="w-full space-y-3">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[10px] uppercase font-bold text-accent text-center">{uploadStatus}</p>
                    </div>
                  )}
                </Card>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-headline font-light">Losse Link</h2>
                  <p className="text-muted-foreground text-xs">Voor individuele afbeeldingen van andere locaties.</p>
                </div>
                <Card className="p-8 rounded-3xl border-border bg-card/50 space-y-6">
                  <div className="space-y-4">
                    <Input placeholder="Titel" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="rounded-xl h-10" />
                    <Input placeholder="https://..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="rounded-xl h-10 font-mono text-[10px]" />
                    <Button disabled={!manualUrl || loading} onClick={handleManualAdd} className="w-full h-12 rounded-xl font-bold uppercase tracking-widest bg-secondary">
                      {loading ? <Loader2 className="animate-spin" /> : 'Toevoegen'}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Master Editor - {editingArtwork?.title}</DialogTitle>
          <DialogDescription className="sr-only">Pas details en uitsnede aan onderaan.</DialogDescription>
          
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/10">
            {editingArtwork && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={editingArtwork.imageUrl} 
                  alt={editingArtwork.title} 
                  className="max-w-[85%] max-h-[85%] object-contain p-4 transition-all duration-300 shadow-2xl" 
                  style={{
                    clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`,
                    filter: `brightness(${editingArtwork.brightness || 1})`
                  }}
                />
              </div>
            )}
            
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); navigateEditing('prev'); }} className="p-3 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigateEditing('next'); }} className="p-3 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button variant="destructive" size="icon" onClick={() => editingArtwork && handleDeleteArtwork(editingArtwork.id)} className="rounded-full h-8 w-8 opacity-40 hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </Button>
              <DialogClose className="p-2 bg-background/20 backdrop-blur-md rounded-full">
                <X className="w-5 h-5" />
              </DialogClose>
            </div>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md border-t border-border/10 px-8 py-3 shadow-2xl overflow-y-auto max-h-[25vh]">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[7px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><Star className="w-2.5 h-2.5" /> Uitgelicht</Label>
                  <Switch checked={editingArtwork?.featured || false} onCheckedChange={(val) => editingArtwork && updateArtworkField(editingArtwork.id, 'featured', val)} />
                </div>
                <Input 
                  defaultValue={editingArtwork?.title || ''} 
                  onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'title', e.target.value)} 
                  placeholder="Titel"
                  className="h-7 text-xs font-headline bg-muted/10 border-none px-2"
                />
                <Input 
                  defaultValue={editingArtwork?.series || ''} 
                  onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'series', e.target.value)} 
                  placeholder="Zaal (Serie)"
                  className="h-7 text-[9px] bg-muted/10 border-none px-2 text-accent font-bold"
                />
                <div className="flex flex-wrap gap-1">
                  {existingSeries.map(s => (
                    <button key={s} onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'series', s)} className={cn("text-[6px] uppercase font-bold px-1 py-0.5 rounded-sm", editingArtwork?.series === s ? "bg-accent text-white" : "bg-muted/30")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input defaultValue={editingArtwork?.year || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'year', e.target.value)} placeholder="Jaar" className="h-7 text-[9px] bg-muted/10 border-none" />
                  <Input defaultValue={editingArtwork?.medium || ''} onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'medium', e.target.value)} placeholder="Medium" className="h-7 text-[9px] bg-muted/10 border-none" />
                </div>
                <Label className="text-[7px] uppercase font-bold tracking-widest opacity-50">Thema's</Label>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto no-scrollbar">
                  {STANDARD_TAGS.map(tag => (
                    <button key={tag} onClick={() => editingArtwork && toggleArtworkTag(editingArtwork, tag)} className={cn("px-1.5 py-0.5 rounded-full text-[6px] font-bold uppercase border", editingArtwork?.tags?.includes(tag) ? "bg-accent text-white border-accent" : "bg-background/50 text-muted-foreground border-border/40")}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[7px] uppercase font-bold opacity-40">Helderheid ({editingArtwork?.brightness?.toFixed(2) || '1.00'})</Label>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-3.5 w-3.5 rounded-sm" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.max(0, (editingArtwork.brightness || 1) - 0.05))}>
                        <Minus className="h-2 w-2" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-3.5 w-3.5 rounded-sm" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.min(2, (editingArtwork.brightness || 1) + 0.05))}>
                        <Plus className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                  <Slider value={[editingArtwork?.brightness || 1]} max={2} step={0.01} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', val)} />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    {['Top', 'Bottom'].map(side => {
                      const field = `crop${side}`;
                      return (
                        <div key={side} className="space-y-1">
                          <div className="flex justify-between items-center text-[6px] uppercase font-bold opacity-40">
                            {side} {editingArtwork?.[field] || 0}%
                            <div className="flex gap-0.5">
                              <button onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.max(0, (editingArtwork[field] || 0) - 1))} className="p-0.5 bg-muted/20 hover:bg-muted/40 rounded"><Minus className="w-1.5 h-1.5" /></button>
                              <button onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.min(50, (editingArtwork[field] || 0) + 1))} className="p-0.5 bg-muted/20 hover:bg-muted/40 rounded"><Plus className="w-1.5 h-1.5" /></button>
                            </div>
                          </div>
                          <Slider value={[editingArtwork?.[field] || 0]} max={50} step={1} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                   <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {['Left', 'Right'].map(side => {
                      const field = `crop${side}`;
                      return (
                        <div key={side} className="space-y-1">
                          <div className="flex justify-between items-center text-[6px] uppercase font-bold opacity-40">
                            {side} {editingArtwork?.[field] || 0}%
                            <div className="flex gap-0.5">
                              <button onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.max(0, (editingArtwork[field] || 0) - 1))} className="p-0.5 bg-muted/20 hover:bg-muted/40 rounded"><Minus className="w-1.5 h-1.5" /></button>
                              <button onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, field, Math.min(50, (editingArtwork[field] || 0) + 1))} className="p-0.5 bg-muted/20 hover:bg-muted/40 rounded"><Plus className="w-1.5 h-1.5" /></button>
                            </div>
                          </div>
                          <Slider value={[editingArtwork?.[field] || 0]} max={50} step={1} onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, field, val)} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-1 pt-2">
                    <Button onClick={() => setEditingId(null)} className="h-6 text-[8px] uppercase tracking-widest font-bold">Gereed</Button>
                    <div className="flex items-center justify-center gap-1 opacity-40 text-[6px] uppercase font-bold">
                      {isSaving ? <><Loader2 className="w-2 h-2 animate-spin" /> Bezig...</> : <><CheckCircle2 className="w-2 h-2" /> Opgeslagen</>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
