
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  Scissors,
  Settings,
  ExternalLink,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Tag,
  AlertCircle,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STANDARD_TAGS = [
  "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
  "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
  "Bloemen", "Dieren", "Water", "Portretten"
];

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [editingArtwork, setEditingArtwork] = useState<any | null>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  
  // NAS Helper state
  const [nasBaseUrl, setNasBaseUrl] = useState('http://192.168.178.15/');
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

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks } = useCollection(artworksQuery);

  const navigateEditing = useCallback((direction: 'next' | 'prev') => {
    if (!editingArtwork || !artworks) return;
    const currentIndex = artworks.findIndex(art => art.id === editingArtwork.id);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % artworks.length 
      : (currentIndex - 1 + artworks.length) % artworks.length;
    setEditingArtwork(artworks[nextIndex]);
  }, [editingArtwork, artworks]);

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

    setNasFileCount(artworksToImport.length);
    setBulkJson(JSON.stringify(artworksToImport, null, 2));
    setActiveTab('bulk');
  };

  const handleAddManualArtwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newArtwork.title || !newArtwork.imageUrl) return;

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    addDoc(artworkCol, { ...newArtwork, createdAt: serverTimestamp() })
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
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto">
            <TabsTrigger value="archive" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Archief</TabsTrigger>
            <TabsTrigger value="new" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Nieuw Werk</TabsTrigger>
            <TabsTrigger value="nas" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">NAS Folder Helper</TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {artworks?.map((art: any) => (
                <Card 
                  key={art.id} 
                  className="overflow-hidden bg-card border-border rounded-xl group cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => setEditingArtwork(art)}
                >
                  <div className="relative aspect-square bg-muted/20 overflow-hidden">
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ 
                        clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`, 
                        filter: `brightness(${art.brightness || 1})` 
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+niet+gevonden'; }}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-headline text-sm font-light truncate">{art.title}</h4>
                    <p className="text-[8px] text-accent font-bold uppercase tracking-widest">{art.series}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="nas">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-headline font-light">NAS Folder Helper</h2>
                <p className="text-muted-foreground text-sm">Bereid je bulk-import voor door je NAS map te scannen.</p>
              </div>

              <div className="grid gap-4">
                <Accordion type="single" collapsible className="w-full bg-accent/5 rounded-2xl border border-accent/10 px-6">
                  <AccordionItem value="hidden-web-folder" className="border-none">
                    <AccordionTrigger className="text-[11px] uppercase font-bold tracking-widest text-accent hover:no-underline">
                      <AlertCircle className="w-4 h-4 mr-2" /> Map 'web' bestaat maar is onzichtbaar?
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>Als de map <strong>web</strong> bestaat maar niet verschijnt in File Station, moet je jouw gebruikersnaam expliciet rechten geven:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Ga naar <strong>Configuratiescherm</strong> &gt; <strong>Gedeelde map</strong>.</li>
                          <li>Selecteer de map <code>web</code> en klik op <strong>Bewerken</strong>.</li>
                          <li>Ga naar het tabblad <strong>Machtigingen</strong>.</li>
                          <li>Zoek je eigen gebruikersnaam (bijv. 'admin') en zet het vinkje bij <strong>Lezen/Schrijven</strong> aan.</li>
                          <li>Klik op Opslaan. De map verschijnt nu direct in File Station.</li>
                        </ol>
                        <div className="flex items-start gap-2 bg-accent/10 p-3 rounded-lg border border-accent/20 mt-4">
                          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <p className="text-[11px] text-accent font-medium">
                            <strong>Over de groep 'http':</strong> Je hoeft deze groep niet aan te maken. Het is een systeemgroep die Synology automatisch beheert. Zoek hem op in de lijst bij stap 4 en zorg dat hij minimaal "Lezen" rechten heeft.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Accordion type="single" collapsible className="w-full bg-primary/5 rounded-2xl border border-primary/10 px-6">
                  <AccordionItem value="missing-web-folder" className="border-none">
                    <AccordionTrigger className="text-[11px] uppercase font-bold tracking-widest text-primary hover:no-underline">
                      <HelpCircle className="w-4 h-4 mr-2" /> Map 'web' ontbreekt volledig?
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>Als de map helemaal niet bestaat, kun je deze handmatig aanmaken:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Ga naar <strong>Configuratiescherm</strong> &gt; <strong>Gedeelde map</strong> &gt; <strong>Maken</strong>.</li>
                          <li>Noem de map exact <code>web</code>.</li>
                          <li>Geef de (reeds bestaande) groep <strong>http</strong> minimaal <strong>Lezen</strong> rechten.</li>
                          <li>Zorg in <strong>Web Station</strong> dat er een back-end server (Apache 2.4 of Nginx) is geselecteerd.</li>
                        </ol>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">1. Basis URL van je NAS</Label>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="rounded-xl font-mono text-xs" />
                    <p className="text-[9px] text-muted-foreground italic">Bijv: http://192.168.178.15/ of je QuickConnect adres.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-border/20">
                    <Label className="text-[10px] uppercase font-bold mb-4 block">2. Selecteer de map</Label>
                    <Button onClick={handleScanFolder} className="w-full h-20 rounded-2xl font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-lg shadow-lg group">
                      <FolderOpen className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" />
                      Map Scannen
                    </Button>
                  </div>
                </div>

                {previewUrl && (
                  <div className="space-y-4 pt-6 border-t border-border/20">
                    <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                      <Label className="text-[9px] uppercase font-bold">Voorbeeld Link:</Label>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <code className="text-[10px] text-primary truncate flex-1">{previewUrl}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                          <a href={previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic">Klik op het icoontje. Als de foto opent, klopt je Basis URL.</p>
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

      {/* Master Editor Dialog */}
      <Dialog open={!!editingArtwork} onOpenChange={() => setEditingArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <DialogTitle className="sr-only">Master Editor - {editingArtwork?.title}</DialogTitle>
          <DialogDescription className="sr-only">Bewerk de details, uitsnede en helderheid van dit kunstwerk.</DialogDescription>
          
          <div className="relative flex-1 flex items-center justify-center overflow-hidden group bg-black/5">
            {editingArtwork && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={editingArtwork.imageUrl} 
                  alt={editingArtwork.title} 
                  className="max-w-full max-h-full object-contain p-4 md:p-12 transition-all duration-300" 
                  style={{
                    clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`,
                    filter: `brightness(${editingArtwork.brightness || 1})`
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Beeld+niet+gevonden'; }}
                />
              </div>
            )}
            
            {/* Navigation Arrows */}
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

          {/* Master Bottom Bar */}
          <div className="w-full bg-background/95 backdrop-blur-md border-t border-border/10 p-4 md:px-8 md:py-6 shadow-2xl">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Info Column */}
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

              {/* Tags Column */}
              <div className="md:col-span-3 space-y-4">
                <Label className="text-[9px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Thema's / Tags
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

              {/* Sliders Column */}
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

              {/* Description Column */}
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
            
            {/* Keyboard hint */}
            <div className="text-center mt-4 opacity-20 text-[8px] uppercase tracking-[0.3em] font-bold">
              Gebruik de pijltjestoetsen om te bladeren door het archief
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
