
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
  Image as ImageIcon,
  FolderOpen,
  Maximize2,
  Tag,
  Info,
  UserPlus,
  Globe,
  CloudUpload,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Cloud,
  HardDrive,
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  const [editingArtwork, setEditingArtwork] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // NAS Helper state
  const [nasBaseUrl, setNasBaseUrl] = useState('http://192.168.178.15/fotos/');
  
  // Handmatig toevoegen state
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Firebase Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

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

  const navigateEditing = useCallback((direction: 'next' | 'prev') => {
    if (!editingArtwork || !filteredArtworks) return;
    const currentIndex = filteredArtworks.findIndex(art => art.id === editingArtwork.id);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setEditingArtwork(filteredArtworks[nextIndex]);
  }, [editingArtwork, filteredArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingArtwork) return;
      if (e.key === 'ArrowRight') navigateEditing('next');
      if (e.key === 'ArrowLeft') navigateEditing('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingArtwork, navigateEditing]);

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
          brightness: 1
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
    let completedCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      setUploadStatus(`Uploaden: ${file.name} (${i + 1}/${totalFiles})`);
      
      const storageRef = ref(storage, `artworks/${Date.now()}_${file.name}`);

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
          createdAt: serverTimestamp()
        };

        await addDoc(collection(firestore, 'artworks'), newArtwork);
        completedCount++;
        setUploadProgress((completedCount / totalFiles) * 100);
      } catch (error: any) {
        console.error(error);
        toast({ 
          variant: "destructive", 
          title: "Upload Mislukt", 
          description: `Kon ${file.name} niet uploaden. Is Firebase Storage actief?` 
        });
      }
    }

    toast({ 
      title: "Batch Voltooid", 
      description: `${completedCount} van de ${totalFiles} foto's zijn toegevoegd aan het archief.` 
    });
    
    setIsUploading(false);
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTab('archive');
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
        createdAt: serverTimestamp()
      };

      await addDoc(collection(firestore, 'artworks'), newArtwork);
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
        addDoc(artworkCol, {
          ...item,
          createdAt: serverTimestamp(),
          cropTop: item.cropTop || 0,
          cropBottom: item.cropBottom || 0,
          cropLeft: item.cropLeft || 0,
          cropRight: item.cropRight || 0,
          brightness: item.brightness || 1,
          tags: item.tags || []
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
    if (!firestore) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value });
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
    deleteDoc(doc(firestore, 'artworks', artId));
    if (editingArtwork?.id === artId) setEditingArtwork(null);
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
                    className="overflow-hidden bg-card border-border rounded-2xl group cursor-pointer transition-all hover:ring-2 hover:ring-accent/40"
                    onClick={() => setEditingArtwork(art)}
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
                  <p className="text-muted-foreground text-xs leading-relaxed">Selecteer een of meerdere bestanden om direct in de Firebase Cloud te plaatsen.</p>
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
                    {!isUploading && (
                      <p className="text-[9px] uppercase font-bold text-muted-foreground opacity-50 tracking-tighter">Meerdere selecteren is mogelijk</p>
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-headline font-light">Handmatige Link</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">Heb je de foto al ergens anders staan? Plak de directe URL hieronder.</p>
                </div>

                <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-sm space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold tracking-widest">Titel van het werk</Label>
                      <Input placeholder="Bijv. Licht over Schoorl" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="rounded-xl h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-bold tracking-widest">Directe URL naar afbeelding</Label>
                      <Input placeholder="https://..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="rounded-xl h-10 font-mono text-[10px]" />
                    </div>
                    <Button 
                      disabled={!manualUrl || loading} 
                      onClick={handleManualAdd}
                      className="w-full h-12 rounded-xl font-bold uppercase tracking-widest bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <><LinkIcon className="mr-2 w-4 h-4" /> Toevoegen aan Lijst</>}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            <div className="mt-16 bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl flex gap-4 max-w-2xl mx-auto">
              <Info className="w-6 h-6 text-blue-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase font-bold text-blue-600">Tip voor Firebase Storage</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Zorg dat 'Storage' is ingeschakeld in de Firebase Console. Ga naar <strong>Storage</strong> &gt; <strong>Get Started</strong> &gt; <strong>Production Mode</strong>. Zodra geactiveerd, worden uploads automatisch gelinkt aan je archief.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-headline font-light">NAS Folder Helper</h2>
                <p className="text-muted-foreground text-sm">Beheer je foto&apos;s vanaf je eigen Synology server.</p>
              </div>

              <div className="grid gap-4">
                <Accordion type="single" collapsible className="w-full bg-blue-500/5 rounded-2xl border border-blue-500/10 px-6">
                  <AccordionItem value="webstation" className="border-none">
                    <AccordionTrigger className="text-[11px] uppercase font-bold tracking-widest text-blue-500 hover:no-underline">
                      <Globe className="w-4 h-4 mr-2" /> Stap: Web Station instellen (DSM 7+)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p className="font-bold text-blue-600">Activeer je map als website:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Open <strong>Web Station</strong> op je NAS.</li>
                          <li>Ga naar <strong>Webservice</strong> (niet Webportaal).</li>
                          <li>Klik op <strong>Maken</strong> &gt; <strong>Statische website</strong>.</li>
                          <li>Selecteer jouw map als <strong>Document-root</strong>.</li>
                        </ol>
                        <p className="mt-4 italic">Na deze stap zijn je foto&apos;s via hun URL bereikbaar voor de app.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="permissions" className="border-none border-t border-border/10">
                    <AccordionTrigger className="text-[11px] uppercase font-bold tracking-widest text-blue-500 hover:no-underline">
                      <UserPlus className="w-4 h-4 mr-2" /> Map 'web' bestaat maar is onzichtbaar?
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p className="font-bold text-blue-600">Rechten herstellen:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Ga naar <strong>Configuratiescherm</strong> &gt; <strong>Gedeelde map</strong>.</li>
                          <li>Selecteer de map <strong>web</strong> en klik op <strong>Bewerken</strong>.</li>
                          <li>Ga naar het tabblad <strong>Machtigingen</strong>.</li>
                          <li>Zoek je eigen gebruikersnaam en vink <strong>Lezen/Schrijven</strong> aan.</li>
                        </ol>
                        <p className="mt-4 text-xs">Nu verschijnt de map direct in File Station.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                    <Textarea placeholder='Scan eerst een map in de NAS tab...' value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
                  </div>
                  <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl">
                    {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Importeer nu in Archief</>}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Master Editor Dialog */}
      <Dialog open={!!editingArtwork} onOpenChange={() => setEditingArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Master Editor - {editingArtwork?.title}</DialogTitle>
          <DialogDescription className="sr-only">Pas details, uitsnede en helderheid aan van dit kunstwerk.</DialogDescription>
          
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
               <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(editingArtwork.id)} className="rounded-full h-10 w-10 opacity-50 hover:opacity-100">
                <Trash2 className="w-5 h-5" />
              </Button>
              <DialogClose className="p-2 bg-background/20 backdrop-blur-md rounded-full hover:bg-background/40 transition-colors">
                <X className="w-6 h-6" />
              </DialogClose>
            </div>
          </div>

          <div className="w-full bg-background/95 backdrop-blur-md border-t border-border/10 p-4 md:px-8 md:py-6 shadow-2xl">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50">Titel</Label>
                  <Input 
                    value={editingArtwork?.title || ''} 
                    onChange={(e) => updateArtworkField(editingArtwork.id, 'title', e.target.value)} 
                    className="h-8 text-sm font-headline bg-transparent border-none focus-visible:ring-0 p-0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50">Serie</Label>
                    <Input 
                      value={editingArtwork?.series || ''} 
                      onChange={(e) => updateArtworkField(editingArtwork.id, 'series', e.target.value)} 
                      className="h-8 text-[10px] bg-transparent border-none focus-visible:ring-0 p-0 text-accent font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50">Jaar</Label>
                    <Input 
                      value={editingArtwork?.year || ''} 
                      onChange={(e) => updateArtworkField(editingArtwork.id, 'year', e.target.value)} 
                      className="h-8 text-[10px] bg-transparent border-none focus-visible:ring-0 p-0"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 space-y-4">
                <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Thema&apos;s / Tags
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                  {STANDARD_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleArtworkTag(editingArtwork, tag)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter transition-all border",
                        editingArtwork?.tags?.includes(tag) 
                          ? "bg-accent text-white border-accent" 
                          : "bg-background/50 text-muted-foreground border-border/40 hover:border-accent/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-4">
                <div className="space-y-3">
                  <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex justify-between">
                    Helderheid <span>{editingArtwork?.brightness?.toFixed(2) || '1.00'}</span>
                  </Label>
                  <Slider 
                    value={[editingArtwork?.brightness || 1]} 
                    max={2} 
                    step={0.01} 
                    onValueChange={([val]) => updateArtworkField(editingArtwork.id, 'brightness', val)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {['Top', 'Bottom', 'Left', 'Right'].map(side => (
                    <div key={side} className="space-y-2">
                      <Label className="text-[8px] uppercase font-bold opacity-40">Crop {side} ({editingArtwork?.[`crop${side}`] || 0}%)</Label>
                      <Slider 
                        value={[editingArtwork?.[`crop${side}`] || 0]} 
                        max={50} 
                        step={1} 
                        onValueChange={([val]) => updateArtworkField(editingArtwork.id, `crop${side}`, val)} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50">Omschrijving</Label>
                <Textarea 
                  value={editingArtwork?.description || ''} 
                  onChange={(e) => updateArtworkField(editingArtwork.id, 'description', e.target.value)} 
                  className="h-24 text-[10px] bg-background/20 border-border/40 resize-none rounded-xl"
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
