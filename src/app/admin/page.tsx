
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
  LayoutGrid
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
        const fileName = file.name;
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const finalUrl = baseUrlClean + fileName;

        artworksToImport.push({
          title: fileNameOnly || "Zonder titel",
          series: "NAS Import",
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
        toast({ 
          variant: "destructive", 
          title: "Upload Mislukt", 
          description: `Kon ${file.name} niet uploaden naar de cloud.` 
        });
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
      addDoc(artworkCol, newArtwork).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'artworks',
          operation: 'create',
          requestResourceData: newArtwork,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

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
        
        addDoc(artworkCol, payload).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: 'artworks',
            operation: 'create',
            requestResourceData: payload,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      });
      
      toast({ title: "Import Succesvol", description: `${artworksArray.length} items toegevoegd.` });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "Controleer het format." });
    } finally {
      setLoading(false);
    }
  };

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: artRef.path,
        operation: 'update',
        requestResourceData: { [field]: value },
      });
      errorEmitter.emit('permission-error', permissionError);
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
    deleteDoc(artRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: artRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
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
              <TabsTrigger value="upload" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Toevoegen</TabsTrigger>
              <TabsTrigger value="nas" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">NAS</TabsTrigger>
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
                  {searchQuery ? "Geen resultaten gevonden." : "Nog niets in het archief. Gebruik de tab 'Toevoegen'!"}
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
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="text-white w-6 h-6" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-headline text-xs font-light truncate">{art.title}</h4>
                      <p className="text-[8px] text-accent font-bold uppercase tracking-widest truncate">{art.series}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-headline font-light">Batch Cloud Upload</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">Selecteer bestanden om direct in de Firebase Cloud te plaatsen.</p>
                </div>

                <Card className="p-10 rounded-3xl border-dashed border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <CloudUpload className="w-8 h-8 text-accent" />
                  </div>
                  
                  <div className="space-y-4 w-full text-center">
                    <Button 
                      onClick={handleFileSelect} 
                      disabled={isUploading}
                      className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl"
                    >
                      {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                      Bestanden Kiezen
                    </Button>
                    
                    {isUploading && (
                      <div className="space-y-3">
                        <Progress value={uploadProgress} className="h-2" />
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-[10px] uppercase font-bold text-accent animate-pulse">{uploadStatus}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-headline font-light">Handmatige Link</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">Plak een directe URL naar een afbeelding hieronder.</p>
                </div>

                <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-sm space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold tracking-widest">Titel van het werk</Label>
                      <Input placeholder="Bijv. Licht over Schoorl" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="rounded-xl h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold tracking-widest">Directe URL</Label>
                      <Input placeholder="https://..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="rounded-xl h-10 font-mono text-[10px]" />
                    </div>
                    <Button 
                      disabled={!manualUrl || loading} 
                      onClick={handleManualAdd}
                      className="w-full h-12 rounded-xl font-bold uppercase tracking-widest bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <><LinkIcon className="mr-2 w-4 h-4" /> Toevoegen</>}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-headline font-light">NAS Folder Helper</h2>
                <p className="text-muted-foreground text-sm">Beheer je foto&apos;s vanaf je eigen Synology server.</p>
              </div>
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Basis URL van je NAS</Label>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                  </div>
                  <div className="pt-4 border-t border-border/20">
                    <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg group">
                      <FolderOpen className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" />
                      Map Scannen & Bulk JSON Genereren
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
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Gegenereerde JSON Data</Label>
                    <Textarea placeholder='Scan eerst een map...' value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
                  </div>
                  <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl">
                    {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Importeer in Archief</>}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Master Editor - {editingArtwork?.title}</DialogTitle>
          <DialogDescription className="sr-only">Pas details, uitsnede en helderheid aan.</DialogDescription>
          
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/10">
            {editingArtwork && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={editingArtwork.imageUrl} 
                  alt={editingArtwork.title} 
                  className="max-w-[85%] max-h-[85%] object-contain p-4 md:p-12 transition-all duration-300 shadow-2xl" 
                  style={{
                    clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`,
                    filter: `brightness(${editingArtwork.brightness || 1})`
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+niet+gevonden'; }}
                />
              </div>
            )}
            
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); navigateEditing('prev'); }} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-colors">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigateEditing('next'); }} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-colors">
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            <div className="absolute top-8 right-8 z-50 flex gap-4">
               <Button variant="destructive" size="icon" onClick={() => editingArtwork && handleDeleteArtwork(editingArtwork.id)} className="rounded-full h-10 w-10 opacity-50 hover:opacity-100">
                <Trash2 className="w-5 h-5" />
              </Button>
              <DialogClose className="p-2 bg-background/20 backdrop-blur-md rounded-full hover:bg-background/40 transition-colors">
                <X className="w-6 h-6" />
              </DialogClose>
            </div>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md border-t border-border/10 p-4 md:px-8 md:py-6 shadow-2xl overflow-y-auto max-h-[40vh]">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><Star className="w-3 h-3" /> Uitgelicht (Home)</Label>
                  <Switch 
                    checked={editingArtwork?.featured || false} 
                    onCheckedChange={(val) => editingArtwork && updateArtworkField(editingArtwork.id, 'featured', val)} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><Type className="w-3 h-3" /> Titel</Label>
                  <Input 
                    key={editingArtwork?.id + '-title'}
                    defaultValue={editingArtwork?.title || ''} 
                    onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'title', e.target.value)} 
                    className="h-8 text-sm font-headline bg-muted/20 border-border/30 rounded-lg px-3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> Selectie / Serie (Zaal)</Label>
                  <Input 
                    key={editingArtwork?.id + '-series'}
                    defaultValue={editingArtwork?.series || ''} 
                    onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'series', e.target.value)} 
                    className="h-8 text-[10px] bg-muted/20 border-border/30 rounded-lg px-3 text-accent font-bold"
                    placeholder="Bijv. Landschappen"
                  />
                  {existingSeries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {existingSeries.map(s => (
                        <button 
                          key={s} 
                          onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'series', s)}
                          className="text-[7px] uppercase font-bold bg-muted/30 px-1.5 py-0.5 rounded-sm hover:bg-accent hover:text-white transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><Calendar className="w-3 h-3" /> Jaar</Label>
                    <Input 
                      key={editingArtwork?.id + '-year'}
                      defaultValue={editingArtwork?.year || ''} 
                      onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'year', e.target.value)} 
                      className="h-8 text-[10px] bg-muted/20 border-border/30 rounded-lg px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50">Medium</Label>
                    <Input 
                      key={editingArtwork?.id + '-medium'}
                      defaultValue={editingArtwork?.medium || ''} 
                      onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'medium', e.target.value)} 
                      className="h-8 text-[10px] bg-muted/20 border-border/30 rounded-lg px-3"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 space-y-4">
                <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Thema&apos;s / Tags
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar p-1">
                  {STANDARD_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => editingArtwork && toggleArtworkTag(editingArtwork, tag)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border",
                        editingArtwork?.tags?.includes(tag) 
                          ? "bg-accent text-white border-accent shadow-sm scale-105" 
                          : "bg-background/50 text-muted-foreground border-border/40 hover:border-accent/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-muted-foreground italic">Klik op een tag om deze toe te voegen of te verwijderen.</p>
              </div>

              <div className="md:col-span-3 space-y-4">
                <div className="space-y-3">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex justify-between items-center">
                    Helderheid 
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-5 w-5 rounded-md" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.max(0, (editingArtwork.brightness || 1) - 0.05))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{editingArtwork?.brightness?.toFixed(2) || '1.00'}</span>
                      <Button variant="outline" size="icon" className="h-5 w-5 rounded-md" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', Math.min(2, (editingArtwork.brightness || 1) + 0.05))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </Label>
                  <Slider 
                    value={[editingArtwork?.brightness || 1]} 
                    max={2} 
                    step={0.01} 
                    onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, 'brightness', val)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {['Top', 'Bottom', 'Left', 'Right'].map(side => {
                    const fieldName = `crop${side}`;
                    return (
                      <div key={side} className="space-y-2">
                        <Label className="text-[8px] uppercase font-bold opacity-40 flex justify-between items-center">
                          Crop {side}
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-4 w-4 rounded-sm border-none bg-muted/20" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, fieldName, Math.max(0, (editingArtwork[fieldName] || 0) - 1))}>
                              <Minus className="h-2 w-2" />
                            </Button>
                            <span className="w-6 text-center">{editingArtwork?.[fieldName] || 0}%</span>
                            <Button variant="outline" size="icon" className="h-4 w-4 rounded-sm border-none bg-muted/20" onClick={() => editingArtwork && updateArtworkField(editingArtwork.id, fieldName, Math.min(50, (editingArtwork[fieldName] || 0) + 1))}>
                              <Plus className="h-2 w-2" />
                            </Button>
                          </div>
                        </Label>
                        <Slider 
                          value={[editingArtwork?.[fieldName] || 0]} 
                          max={50} 
                          step={1} 
                          onValueChange={([val]) => editingArtwork && updateArtworkField(editingArtwork.id, fieldName, val)} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-1"><Info className="w-3 h-3" /> Omschrijving</Label>
                <Textarea 
                  key={editingArtwork?.id + '-desc'}
                  defaultValue={editingArtwork?.description || ''} 
                  onBlur={(e) => editingArtwork && updateArtworkField(editingArtwork.id, 'description', e.target.value)} 
                  className="h-28 text-[10px] bg-muted/20 border-border/30 resize-none rounded-xl p-3 leading-relaxed"
                  placeholder="Beschrijf het werk..."
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
