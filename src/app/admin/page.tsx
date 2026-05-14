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
  Settings,
  Link as LinkIcon,
  ExternalLink,
  Info,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const directoryInputRef = useRef<HTMLInputElement>(null);
  
  // NAS Helper state
  const [nasBaseUrl, setNasBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to/');
  const [nasFileCount, setNasFileCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');

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

    const artworksToImport: any[] = [];
    const imageExtensions = /\.(jpe?g|png|webp|avif)$/i;
    
    let baseUrlClean = nasBaseUrl.trim();
    if (!baseUrlClean.endsWith('/')) {
      baseUrlClean += '/';
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (imageExtensions.test(file.name)) {
        const relativePath = file.webkitRelativePath || file.name;
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const finalUrl = baseUrlClean + relativePath;

        if (artworksToImport.length === 0) {
          setPreviewUrl(finalUrl);
        }

        artworksToImport.push({
          title: fileNameOnly || "Zonder titel",
          series: "Import " + new Date().toLocaleDateString(),
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

    if (artworksToImport.length === 0) {
      toast({ 
        variant: "destructive", 
        title: "Geen foto's", 
        description: "Geen geschikte afbeeldingen gevonden." 
      });
      return;
    }

    setNasFileCount(artworksToImport.length);
    setBulkJson(JSON.stringify(artworksToImport, null, 2));
    setActiveTab('bulk');
    
    if (directoryInputRef.current) {
      directoryInputRef.current.value = '';
    }
  };

  const handleAddManualArtwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newArtwork.title || !newArtwork.imageUrl) return;

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const data = { ...newArtwork, createdAt: serverTimestamp() };

    addDoc(artworkCol, data)
      .then(() => {
        toast({ title: "Toegevoegd" });
        setNewArtwork({ 
          title: "", series: "Onbekend", year: "", medium: "Olieverf op doek", 
          description: "", imageUrl: "", imageHint: "painting", 
          tags: [], cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1 
        });
        setActiveTab('archive');
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
      
      toast({ title: "Import Gestart" });
      setBulkJson('');
      setActiveTab('archive');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout" });
    } finally {
      setLoading(false);
    }
  };

  const updateArtworkValue = (id: string, field: string, value: any) => {
    if (!firestore) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value });
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Verwijderen?")) return;
    deleteDoc(doc(firestore, 'artworks', artId));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <input type="file" ref={directoryInputRef} style={{ display: 'none' }} onChange={handleDirectoryChange} {...({ webkitdirectory: "", directory: "" } as any)} />

      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent" />
          <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        </div>
        <Link href="/" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Terug naar de site
        </Link>
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
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, filter: `brightness(${art.brightness || 1})` }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Check+Link'; }}
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
                        <Label className="text-[9px] uppercase font-bold flex justify-between">Helderheid <span>{art.brightness?.toFixed(2) || '1.00'}</span></Label>
                        <Slider defaultValue={[art.brightness || 1]} max={2} step={0.01} onValueCommit={([val]) => updateArtworkValue(art.id, 'brightness', val)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {['Top', 'Bottom', 'Left', 'Right'].map(side => (
                          <div key={side} className="space-y-1">
                            <Label className="text-[8px] uppercase font-bold">Crop {side}</Label>
                            <Slider defaultValue={[art[`crop${side}`] || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, `crop${side}`, val)} />
                          </div>
                        ))}
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
                      <img src={newArtwork.imageUrl} alt="Preview" className="w-full h-full object-cover" 
                        style={{ clipPath: `inset(${newArtwork.cropTop}% ${newArtwork.cropRight}% ${newArtwork.cropBottom}% ${newArtwork.cropLeft}%)`, filter: `brightness(${newArtwork.brightness})` }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+niet+gevonden'; }}
                      />
                    ) : (
                      <div className="text-center p-8 opacity-20"><ImageIcon className="w-12 h-12 mx-auto mb-2" /><p className="text-[10px] uppercase font-bold">Voer URL in</p></div>
                    )}
                  </div>
                  <div className="space-y-6 bg-card/30 p-6 rounded-2xl border border-border/40">
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold flex justify-between">Helderheid <span>{newArtwork.brightness.toFixed(2)}</span></Label>
                      <Slider value={[newArtwork.brightness]} max={2} step={0.01} onValueChange={([v]) => setNewArtwork(p => ({ ...p, brightness: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {['Top', 'Bottom', 'Left', 'Right'].map(side => (
                        <div key={side} className="space-y-3">
                          <Label className="text-[10px] uppercase font-bold">Crop {side} ({newArtwork[`crop${side}`]}%)</Label>
                          <Slider value={[newArtwork[`crop${side}`]]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, [`crop${side}`]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-headline font-light">NAS Folder Helper</h2>
                <p className="text-muted-foreground text-sm">Beheer je afbeeldingen direct vanaf je Synology NAS.</p>
              </div>

              <Accordion type="single" collapsible className="w-full bg-accent/5 rounded-2xl border border-accent/10 px-6">
                <AccordionItem value="missing-web-folder" className="border-none">
                  <AccordionTrigger className="text-[11px] uppercase font-bold tracking-widest text-accent hover:no-underline">
                    <HelpCircle className="w-4 h-4 mr-2" /> Map 'web' ontbreekt in File Station?
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-6">
                    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <p>Als de map <strong>web</strong> niet zichtbaar is, volg dan deze stappen in DSM:</p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>Ga naar <strong>Configuratiescherm</strong> &gt; <strong>Gedeelde map</strong>.</li>
                        <li>Klik op <strong>Maken</strong> &gt; <strong>Maken</strong> en noem de map exact <code>web</code>.</li>
                        <li>Ga bij de machtigingen naar de groep <strong>http</strong> en geef deze <strong>Lezen</strong> rechten.</li>
                        <li>Installeer <strong>Web Station</strong> via het Package Center als dat nog niet is gebeurd.</li>
                        <li>Controleer in de Web Station app of de <strong>Default Service</strong> is ingesteld op Apache of Nginx.</li>
                      </ol>
                      <p className="italic bg-background/50 p-3 rounded-lg border border-border/20">
                        Zodra de map 'web' bestaat, kun je daar je map met foto's in plaatsen. Die verschijnt dan weer in File Station.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">1. Basis URL van je NAS</Label>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                    <p className="text-[9px] text-muted-foreground italic">Gebruik je QuickConnect adres. Vergeet de afsluitende / niet.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-border/20">
                    <Label className="text-[10px] uppercase font-bold mb-4 block">2. Selecteer de map op je NAS</Label>
                    <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg group">
                      <FolderOpen className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" />
                      Map Selecteren
                    </Button>
                    <p className="text-[9px] text-muted-foreground mt-2 text-center">Koppel je NAS als lokale schijf om de map direct te kunnen aanwijzen.</p>
                  </div>
                </div>

                {previewUrl && (
                  <div className="space-y-4 pt-6 border-t border-border/20">
                    <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                      <Label className="text-[9px] uppercase font-bold">Test Link (werkt dit?):</Label>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <code className="text-[10px] text-primary truncate flex-1">{previewUrl}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild title="Test link">
                          <a href={previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic">Klik op het icoontje. Als de foto opent, zijn je NAS-instellingen correct.</p>
                    </div>
                    <Button onClick={() => setActiveTab('bulk')} className="w-full rounded-xl bg-primary/20 text-primary border border-primary/20 uppercase text-[10px] font-bold tracking-widest h-12">
                      Ga naar Bulk Import ({nasFileCount} bestanden)
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Gegenereerde JSON Data</Label>
                    <Textarea placeholder='Selecteer eerst een map...' value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} className="min-h-[400px] font-mono text-[10px] rounded-2xl bg-black/5" />
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
    </div>
  );
}
