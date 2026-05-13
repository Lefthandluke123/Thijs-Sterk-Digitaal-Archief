
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Database, FileJson, Loader2, Wand2, Trash2, FolderOpen, Image as ImageIcon, Info, Link as LinkIcon, AlertTriangle, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  
  const [singleArtwork, setSingleArtwork] = useState({
    title: '',
    series: '',
    year: new Date().getFullYear().toString(),
    medium: 'Olieverf op doek',
    description: '',
    imageUrl: '',
    imageHint: 'abstract painting'
  });

  const [bulkJson, setBulkJson] = useState('');
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string}[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [defaultSeries, setDefaultSeries] = useState('Nieuwe Collectie');

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('gofile.me') || url.includes('quickconnect.to');
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    try {
      await addDoc(collection(firestore, 'artworks'), {
        ...singleArtwork,
        createdAt: serverTimestamp()
      });
      toast({ title: "Succes", description: "Schilderij toegevoegd." });
      setSingleArtwork({ 
        title: '', 
        series: singleArtwork.series,
        year: new Date().getFullYear().toString(), 
        medium: 'Olieverf op doek', 
        description: '', 
        imageUrl: '', 
        imageHint: 'abstract painting' 
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout", description: "Kon niet opslaan." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulk = async () => {
    if (!firestore || !bulkJson) return;
    
    setLoading(true);
    try {
      const artworksData = JSON.parse(bulkJson);
      const artworkCol = collection(firestore, 'artworks');
      
      // We doen dit in kleine batches om de browser niet te bevriezen
      for (const art of artworksData) {
        addDoc(artworkCol, { ...art, createdAt: serverTimestamp() });
      }
      
      toast({ title: "Bulk Succes", description: `${artworksData.length} schilderijen worden toegevoegd aan de database.` });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "Controleer of de JSON code correct is." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit kunstwerk wilt verwijderen?")) return;
    try {
      await deleteDoc(doc(firestore, 'artworks', id));
      toast({ title: "Verwijderd" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij verwijderen" });
    }
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        name: file.name,
        cleanName: cleanName
      };
    });
    
    setRawFiles(prev => [...prev, ...scanned]);
    toast({ title: `${scanned.length} bestanden gescand` });
  };

  const generateBulkJson = () => {
    if (rawFiles.length === 0) return;
    
    const generated = rawFiles.map((file) => ({
      title: file.cleanName,
      series: defaultSeries,
      year: new Date().getFullYear().toString(),
      medium: "Olieverf op doek",
      imageUrl: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${file.name}` : `https://picsum.photos/seed/${file.name}/800/800`,
      description: `Een prachtig werk getiteld ${file.cleanName}.`,
      imageHint: "painting art"
    }));
    
    setBulkJson(JSON.stringify(generated, null, 2));
    toast({ title: "JSON Gegenereerd", description: "Ga naar het tabblad 'Bulk Import' om het op te slaan." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-light mb-2">Portfolio <span className="italic">Beheer</span></h1>
          <p className="text-muted-foreground">Beheer de database van Thijs Sterk.</p>
        </header>

        <div className="grid gap-6 mb-12">
          <Alert className="bg-accent/10 border-accent/20 border-l-4 border-l-accent">
            <Zap className="h-5 w-5 text-accent" />
            <div className="ml-2">
              <AlertTitle className="text-lg font-headline font-semibold text-accent">Bulk Tip: Snel 400 werken toevoegen</AlertTitle>
              <AlertDescription className="mt-2 space-y-3 text-sm leading-relaxed">
                <p>Je hoeft niet alles één voor één te doen. Gebruik de <strong>Scanner</strong> om je bestandsnamen op te halen, vul je <strong>Basis URL</strong> van je Synology in, en de app genereert de lijst voor je.</p>
                <div className="bg-background/50 p-4 rounded-lg border border-border">
                  <p className="font-bold mb-1">Hoe krijg je de Basis URL van Synology?</p>
                  <p className="text-muted-foreground">Als je via Web Station of een gedeelde map werkt, is de link vaak: <code>https://jouwnas.direct.quickconnect.to/portfolio/</code>. De app plakt de bestandsnaam er dan zelf achteraan.</p>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database</TabsTrigger>
            <TabsTrigger value="single">Nieuw Item</TabsTrigger>
            <TabsTrigger value="helper">Scanner & Generator</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle className="font-light">Huidige Collectie ({artworks?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : artworks && artworks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b text-sm text-muted-foreground">
                          <th className="pb-3">Beeld</th>
                          <th className="pb-3">Titel</th>
                          <th className="pb-3">Serie</th>
                          <th className="pb-3 text-right">Acties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {artworks.map((art: any) => (
                          <tr key={art.id} className="hover:bg-muted/30">
                            <td className="py-3">
                              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                                <Image 
                                  src={art.imageUrl} 
                                  alt="" 
                                  fill 
                                  className="object-cover"
                                  unoptimized={isExternalStorage(art.imageUrl)}
                                />
                              </div>
                            </td>
                            <td className="py-3 font-medium">{art.title}</td>
                            <td className="py-3 text-muted-foreground text-xs">{art.series}</td>
                            <td className="py-3 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(art.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="text-center py-12 text-muted-foreground">Nog geen werken in de database.</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card>
              <CardHeader><CardTitle className="font-light">Enkel item toevoegen</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titel</Label><Input value={singleArtwork.title} onChange={e => setSingleArtwork({...singleArtwork, title: e.target.value})} required placeholder="Bijv. Stilleven in Blauw" /></div>
                    <div className="space-y-2"><Label>Serie</Label><Input value={singleArtwork.series} onChange={e => setSingleArtwork({...singleArtwork, series: e.target.value})} required placeholder="Bijv. Abstract 2024" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Directe Afbeelding URL</Label>
                    <Input placeholder="https://jouwnas.nl/foto.jpg" value={singleArtwork.imageUrl} onChange={e => setSingleArtwork({...singleArtwork, imageUrl: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschrijving</Label>
                    <Textarea value={singleArtwork.description} onChange={e => setSingleArtwork({...singleArtwork, description: e.target.value})} placeholder="Vertel iets over het werk..." />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>Opslaan in Database</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Mappen Scanner & Link Generator</CardTitle>
                <CardDescription>Scan je lokale bestanden om titels te genereren en voeg je Synology URL toe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-8 border-2 border-dashed rounded-2xl text-center bg-muted/20">
                  <Input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" />
                  <Button variant="outline" className="rounded-full px-8" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Selecteer foto's van je computer
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">Geen zorgen, de foto's worden niet geüpload, we lezen alleen de namen.</p>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Basis URL (Synology/Hosting)</Label>
                        <Input 
                          placeholder="https://jouwnas.nl/mijn-map/" 
                          value={baseUrl} 
                          onChange={e => setBaseUrl(e.target.value)} 
                        />
                        <p className="text-[10px] text-muted-foreground">De bestandsnaam wordt hier automatisch achter geplakt.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Standaard Serie Naam</Label>
                        <Input 
                          value={defaultSeries} 
                          onChange={e => setDefaultSeries(e.target.value)} 
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-muted/10">
                      <p className="text-xs font-bold mb-2">Gevonden bestanden ({rawFiles.length}):</p>
                      <ul className="text-[10px] space-y-1">
                        {rawFiles.slice(0, 10).map((f, i) => (
                          <li key={i} className="flex justify-between border-b pb-1">
                            <span>{f.name}</span>
                            <span className="italic text-accent">Wordt: {f.cleanName}</span>
                          </li>
                        ))}
                        {rawFiles.length > 10 && <li className="text-muted-foreground">...en nog {rawFiles.length - 10} meer.</li>}
                      </ul>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={generateBulkJson} className="flex-1 h-12 rounded-full">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Genereer JSON Lijst
                      </Button>
                      <Button onClick={() => setRawFiles([])} variant="ghost" className="h-12 rounded-full">Lijst wissen</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Bulk Import</CardTitle>
                <CardDescription>Plak hier de JSON code of gebruik de Generator tab om deze te vullen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[300px] font-mono text-[10px] leading-tight" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder='[ { "title": "Naam", "imageUrl": "..." }, ... ]'
                />
                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-12 rounded-full bg-accent hover:bg-accent/90" 
                  disabled={loading || !bulkJson}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Alles naar Database Sturen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
