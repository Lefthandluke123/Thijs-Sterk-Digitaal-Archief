
"use client";

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
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
  RefreshCw,
  Scissors,
  AlertCircle,
  Settings
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const directoryInputRef = useRef<HTMLInputElement>(null);
  
  // NAS Helper state
  const [nasBaseUrl, setNasBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to:5001/web/');
  const [nasFileNames, setNasFileNames] = useState('');

  const [newArtwork, setNewArtwork] = useState({
    title: "",
    series: "Onbekend",
    year: "",
    medium: "Olieverf op doek",
    description: "",
    imageUrl: "",
    imageHint: "painting",
    tags: [] as string[],
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    brightness: 1,
  });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks } = useCollection(artworksQuery);

  const handleScanFolder = () => {
    if (directoryInputRef.current) {
      directoryInputRef.current.click();
    }
  };

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles: string[] = [];
    const imageExtensions = /\.(jpe?g|png|webp|avif)$/i;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (imageExtensions.test(file.name)) {
        imageFiles.push(file.name);
      }
    }

    if (imageFiles.length === 0) {
      toast({ 
        variant: "destructive", 
        title: "Geen foto's", 
        description: "Geen geschikte afbeeldingen gevonden in de geselecteerde map." 
      });
      return;
    }

    setNasFileNames(imageFiles.join('\n'));
    
    const baseUrlClean = nasBaseUrl.endsWith('/') ? nasBaseUrl : nasBaseUrl + '/';
    const generated = imageFiles.map(file => {
      const title = file.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      return {
        title: title || "Zonder titel",
        series: "Import " + new Date().toLocaleDateString(),
        imageUrl: baseUrlClean + file,
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
      };
    });
    
    setBulkJson(JSON.stringify(generated, null, 2));
    setActiveTab('bulk');
    toast({ 
      title: "Map gelezen", 
      description: `${imageFiles.length} afbeeldingen gevonden en klaargezet voor import.` 
    });
    
    if (directoryInputRef.current) {
      directoryInputRef.current.value = '';
    }
  };

  const handleAddManualArtwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newArtwork.title || !newArtwork.imageUrl) {
      toast({ variant: "destructive", title: "Invoer onvolledig", description: "Titel en Afbeelding URL zijn verplicht." });
      return;
    }

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const data = {
      ...newArtwork,
      createdAt: serverTimestamp(),
    };

    addDoc(artworkCol, data)
      .then(() => {
        toast({ title: "Toegevoegd", description: `${newArtwork.title} staat nu in het archief.` });
        setNewArtwork({ 
          title: "", series: "Onbekend", year: "", medium: "Olieverf op doek", 
          description: "", imageUrl: "", imageHint: "painting", 
          tags: [], cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1 
        });
        setActiveTab('archive');
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleBulkUpload = () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const data = JSON.parse(bulkJson);
      const artworksArray = Array.isArray(data) ? data : [data];
      const artworkCol = collection(firestore, 'artworks');
      
      let count = 0;
      artworksArray.forEach((item: any) => {
        const docData = {
          ...item,
          createdAt: serverTimestamp(),
          cropTop: item.cropTop || 0,
          cropBottom: item.cropBottom || 0,
          cropLeft: item.cropLeft || 0,
          cropRight: item.cropRight || 0,
          brightness: item.brightness || 1,
          tags: item.tags || []
        };
        
        addDoc(artworkCol, docData)
          .catch(async (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: artworkCol.path,
              operation: 'create',
              requestResourceData: docData
            }));
          });
        count++;
      });
      
      toast({ title: "Import Gestart", description: `${count} werken worden toegevoegd aan het archief.` });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "De ingevoerde tekst is geen geldige JSON." });
    } finally {
      setLoading(false);
    }
  };

  const updateArtworkValue = (id: string, field: string, value: any) => {
    if (!firestore) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: artRef.path,
        operation: 'update',
        requestResourceData: { [field]: value }
      }));
    });
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit werk wilt verwijderen?")) return;
    const artRef = doc(firestore, 'artworks', artId);
    deleteDoc(artRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: artRef.path,
        operation: 'delete'
      }));
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input 
        type="file" 
        ref={directoryInputRef} 
        style={{ display: 'none' }} 
        onChange={handleDirectoryChange}
        {...({ webkitdirectory: "", directory: "" } as any)} 
      />

      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent" />
          <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> Terug naar de site
          </Link>
          <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
            <Link href="/">Bekijk Site</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto overflow-x-auto no-scrollbar max-w-full">
            <TabsTrigger value="archive" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Archief</TabsTrigger>
            <TabsTrigger value="new" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Nieuw Werk</TabsTrigger>
            <TabsTrigger value="nas" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">NAS Folder Helper</TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="archive">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {artworks?.map((art: any) => (
                <Card key={art.id} className="overflow-hidden bg-card border-border rounded-2xl group flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted/20 overflow-hidden">
                    <Image 
                      src={art.imageUrl} 
                      alt={art.title} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                      unoptimized 
                      style={{
                        clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                        filter: `brightness(${art.brightness || 1})`
                      }}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline text-xl font-light mb-1">{art.title}</h4>
                      <p className="text-[9px] text-accent font-bold uppercase tracking-widest mb-4">{art.series} &bull; {art.year || 'Onbekend'}</p>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase font-bold flex justify-between">
                          Helderheid <span>{art.brightness?.toFixed(2) || '1.00'}</span>
                        </Label>
                        <Slider 
                          defaultValue={[art.brightness || 1]} 
                          max={2} 
                          step={0.01} 
                          onValueCommit={([val]) => updateArtworkValue(art.id, 'brightness', val)} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Top</Label>
                          <Slider defaultValue={[art.cropTop || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropTop', val)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Bottom</Label>
                          <Slider defaultValue={[art.cropBottom || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropBottom', val)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Left</Label>
                          <Slider defaultValue={[art.cropLeft || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropLeft', val)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Right</Label>
                          <Slider defaultValue={[art.cropRight || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropRight', val)} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-headline font-light mb-8">Nieuw Werk</h2>
                <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                  <form onSubmit={handleAddManualArtwork} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Titel</Label>
                      <Input value={newArtwork.title} onChange={(e) => setNewArtwork(prev => ({ ...prev, title: e.target.value }))} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Serie</Label>
                      <Input value={newArtwork.series} onChange={(e) => setNewArtwork(prev => ({ ...prev, series: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Jaar</Label>
                        <Input value={newArtwork.year} onChange={(e) => setNewArtwork(prev => ({ ...prev, year: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Medium</Label>
                        <Input value={newArtwork.medium} onChange={(e) => setNewArtwork(prev => ({ ...prev, medium: e.target.value }))} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Afbeelding URL</Label>
                      <Input value={newArtwork.imageUrl} onChange={(e) => setNewArtwork(prev => ({ ...prev, imageUrl: e.target.value }))} required className="rounded-xl" placeholder="https://..." />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 w-4 h-4" /> Opslaan</>}
                    </Button>
                  </form>
                </Card>
              </div>

              <div className="space-y-6">
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                  <Scissors className="w-3 h-3" /> Live Preview & Cropper
                </h2>
                <div className="sticky top-32 space-y-8">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/20 border-2 border-dashed border-border flex items-center justify-center">
                    {newArtwork.imageUrl ? (
                      <Image 
                        src={newArtwork.imageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-cover" 
                        unoptimized
                        style={{
                          clipPath: `inset(${newArtwork.cropTop}% ${newArtwork.cropRight}% ${newArtwork.cropBottom}% ${newArtwork.cropLeft}%)`,
                          filter: `brightness(${newArtwork.brightness})`
                        }}
                      />
                    ) : (
                      <div className="text-center p-8 opacity-20">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-center text-[10px] uppercase font-bold">Voer een URL in</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 bg-card/30 p-6 rounded-2xl border border-border/40">
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold flex justify-between">Helderheid <span>{newArtwork.brightness.toFixed(2)}</span></Label>
                      <Slider value={[newArtwork.brightness]} max={2} step={0.01} onValueChange={([v]) => setNewArtwork(p => ({ ...p, brightness: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Top ({newArtwork.cropTop}%)</Label>
                        <Slider value={[newArtwork.cropTop]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropTop: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Bottom ({newArtwork.cropBottom}%)</Label>
                        <Slider value={[newArtwork.cropBottom]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropBottom: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Left ({newArtwork.cropLeft}%)</Label>
                        <Slider value={[newArtwork.cropLeft]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropLeft: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Right ({newArtwork.cropRight}%)</Label>
                        <Slider value={[newArtwork.cropRight]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropRight: v }))} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-headline font-light">NAS Folder Helper</h2>
                <p className="text-muted-foreground text-sm">Selecteer de map op je NAS waar je foto's staan om ze direct te indexeren.</p>
              </div>
              
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">1. Basis URL van je NAS</Label>
                    <Input 
                      value={nasBaseUrl}
                      onChange={(e) => setNasBaseUrl(e.target.value)}
                      className="rounded-xl font-mono text-xs"
                    />
                    <p className="text-[9px] text-muted-foreground italic">Dit adres wordt voor elke bestandsnaam geplakt om werkende links te maken.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-border/20">
                    <Label className="text-[10px] uppercase font-bold mb-4 block">2. Selecteer de map</Label>
                    <Button 
                      onClick={handleScanFolder} 
                      className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg group"
                    >
                      <FolderOpen className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" />
                      Selecteer Map op NAS
                    </Button>
                  </div>
                </div>

                {nasFileNames && (
                  <div className="space-y-4 pt-6 border-t border-border/20">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase font-bold">Gevonden bestanden</Label>
                      <Button variant="ghost" size="sm" onClick={() => setNasFileNames('')} className="h-6 text-[8px] uppercase">Wis</Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-black/5 p-4 rounded-xl border border-border/20">
                      <pre className="text-[9px] font-mono text-muted-foreground">{nasFileNames}</pre>
                    </div>
                    <Button onClick={() => setActiveTab('bulk')} className="w-full rounded-xl bg-primary/20 text-primary border border-primary/20 uppercase text-[10px] font-bold tracking-widest">
                      Genereer Bulk Data
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-headline font-light">Bulk Overzicht</h2>
                <p className="text-muted-foreground text-sm">Controleer de data en start de import. Dit proces is nu razendsnel.</p>
              </div>
              
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase font-bold">JSON Data</Label>
                      <Button variant="ghost" size="sm" onClick={() => setBulkJson('')} className="h-6 text-[8px] uppercase tracking-widest">
                        <RefreshCw className="w-3 h-3 mr-1" /> Wis
                      </Button>
                    </div>
                    <Textarea 
                      placeholder='Gebruik de NAS Folder Helper of plak hier je eigen JSON...' 
                      value={bulkJson} 
                      onChange={(e) => setBulkJson(e.target.value)}
                      className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5"
                    />
                  </div>
                  <Button 
                    onClick={handleBulkUpload} 
                    disabled={loading || !bulkJson} 
                    className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Start Snelle Import</>}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
