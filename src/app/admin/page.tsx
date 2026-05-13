
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Trash2, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
  const [bulkJson, setBulkJson] = useState('');
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string, series: string}[]>([]);
  // We halen :5001 weg voor de Web Station link
  const [baseUrl, setBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/');
  const [defaultSeries, setDefaultSeries] = useState('Collectie 2024');

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('gofile.me');
  };

  const handleTestUrl = () => {
    if (!testUrl) return;
    setTestResult(null);
    const img = new globalThis.Image();
    img.onload = () => setTestResult('success');
    img.onerror = () => setTestResult('error');
    img.src = testUrl;
  };

  const handleAddBulk = async () => {
    if (!firestore || !bulkJson) return;
    
    setLoading(true);
    try {
      const artworksData = JSON.parse(bulkJson);
      const artworkCol = collection(firestore, 'artworks');
      
      let count = 0;
      for (const art of artworksData) {
        const data = { ...art, createdAt: serverTimestamp() };
        addDoc(artworkCol, data).catch(async () => {
             const permissionError = new FirestorePermissionError({
               path: artworkCol.path,
               operation: 'create',
               requestResourceData: data
             });
             errorEmitter.emit('permission-error', permissionError);
          });
        count++;
      }
      
      toast({ title: "Bulk Import Gestart", description: `${count} schilderijen worden toegevoegd.` });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "Controleer de tekst in het vak." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit werk wilt verwijderen?")) return;
    deleteDoc(doc(firestore, 'artworks', id))
      .then(() => toast({ title: "Verwijderd" }))
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: `artworks/${id}`,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      let relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      let detectedSeries = defaultSeries;
      if (pathParts.length > 1) {
        detectedSeries = pathParts[pathParts.length - 2] || defaultSeries;
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        name: relativePath,
        cleanName: cleanName,
        series: detectedSeries
      };
    });
    
    setRawFiles(scanned);
    toast({ title: "Scan voltooid", description: `${scanned.length} bestanden gevonden.` });
  };

  const generateBulkJson = () => {
    if (rawFiles.length === 0) return;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const generated = rawFiles.map((file) => ({
      title: file.cleanName,
      series: file.series,
      year: new Date().getFullYear().toString(),
      medium: "Olieverf op doek",
      imageUrl: `${cleanBaseUrl}${file.name}`,
      description: `Een origineel werk van Thijs Sterk uit de serie ${file.series}.`,
      imageHint: "painting art"
    }));
    setBulkJson(JSON.stringify(generated, null, 2));
    toast({ title: "Lijst klaar", description: "Ga naar Stap 3 om op te slaan." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-headline font-light">Beheer <span className="italic">Portfolio</span></h1>
            <p className="text-muted-foreground mt-2">{loadingArtworks ? "Laden..." : `${artworks?.length || 0} schilderijen in database`}</p>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Database Verversen
          </Button>
        </header>

        <Alert className="mb-8 bg-accent/10 border-accent/30">
          <HelpCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-bold text-lg mb-2">Hoe maak ik de juiste link?</AlertTitle>
          <AlertDescription className="text-sm">
            <p className="mb-4">Voor Web Station moet je de <strong>:5001</strong> weghalen uit je link. Die poort is alleen voor File Station.</p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="url-logic" className="border-accent/20">
                <AccordionTrigger className="hover:no-underline font-semibold">Uitleg over de URL prefix</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-destructive/10 rounded border border-destructive/20">
                      <p className="font-bold text-destructive mb-1 text-xs">FOUT (voor File Station):</p>
                      <code className="text-[10px] break-all">https://...quickconnect.to<strong>:5001</strong>/portfolio/foto.jpg</code>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded border border-green-500/20">
                      <p className="font-bold text-green-700 mb-1 text-xs">GOED (voor de Website):</p>
                      <code className="text-[10px] break-all">https://...quickconnect.to/portfolio/foto.jpg</code>
                    </div>
                  </div>
                  <p className="text-xs italic">De website kan alleen de "GOED" versie laden omdat Web Station die bestanden publiek toegankelijk maakt.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="synology" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="synology">Stap 1: Test Link</TabsTrigger>
            <TabsTrigger value="helper">Stap 2: Scan Map</TabsTrigger>
            <TabsTrigger value="bulk">Stap 3: Bulk Import</TabsTrigger>
            <TabsTrigger value="overview">Database</TabsTrigger>
          </TabsList>

          <TabsContent value="synology">
            <Card>
              <CardHeader>
                <CardTitle>Test je Link</CardTitle>
                <CardDescription>Plak hier een link ZONDER :5001 om te kijken of hij werkt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/test.jpg" 
                    value={testUrl} 
                    onChange={e => setTestUrl(e.target.value)}
                  />
                  <Button onClick={handleTestUrl} className="bg-accent text-white">Test Foto</Button>
                </div>
                {testResult === 'success' && (
                  <div className="p-4 bg-green-500/10 text-green-700 rounded-lg flex items-center gap-3 border border-green-200">
                    <CheckCircle2 className="w-6 h-6" /> 
                    <div>
                      <p className="font-bold">Perfect! Deze link werkt.</p>
                      <p className="text-xs">Kopieer alles wat vóór de bestandsnaam staat naar "Stap 2" hiernaast.</p>
                    </div>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold">Laden mislukt.</p>
                      <p className="text-xs">Zorg dat de poort :5001 weg is en de foto in de map 'web/portfolio' staat op je NAS.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle>Mappen Scannen</CardTitle>
                <CardDescription>Selecteer de map op je computer. We plakken de juiste URL er automatisch voor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-10 border-2 border-dashed rounded-2xl text-center bg-muted/20 border-accent/20">
                  <Input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner" 
                    onChange={handleFileScan} 
                    accept="image/*" 
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent bg-background" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-5 w-5" /> Selecteer Map op Computer
                    </label>
                  </Button>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-6 p-6 border rounded-xl bg-accent/5">
                    <div className="space-y-2">
                      <Label className="text-accent font-bold">Wat moet er precies voor? (De Basis URL)</Label>
                      <Input 
                        value={baseUrl} 
                        onChange={e => setBaseUrl(e.target.value)} 
                        placeholder="https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/" 
                      />
                      <p className="text-[10px] text-muted-foreground">Tip: Gebruik de link die werkte in Stap 1, maar haal de bestandsnaam aan het einde weg.</p>
                    </div>

                    <div className="bg-background rounded-lg p-4 border text-[10px] space-y-2">
                      <p className="font-bold text-muted-foreground uppercase">Voorbeeld resultaat:</p>
                      <ul className="space-y-1 font-mono text-accent truncate">
                        {rawFiles.slice(0, 2).map((f, i) => (
                          <li key={i}>{baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}{f.name}</li>
                        ))}
                      </ul>
                    </div>

                    <Button onClick={generateBulkJson} className="w-full bg-accent text-white h-12 shadow-lg">Stap 2: Genereer Lijst</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import</CardTitle>
                <CardDescription>Sla alle 178+ werken in één keer op in de database.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[200px] font-mono text-[10px] bg-muted/10" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder="De lijst verschijnt hier automatisch..."
                />
                <Button onClick={handleAddBulk} className="w-full h-14 bg-primary text-white shadow-xl text-lg font-bold" disabled={loading || !bulkJson}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2" />}
                  Alles Definitief Opslaan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Huidige Database</CardTitle>
                <CardDescription>Overzicht van alle werken die nu live staan.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent" /></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border rounded-lg overflow-hidden group bg-muted/20">
                        <Image src={art.imageUrl} alt="" fill className="object-cover" unoptimized={isExternalStorage(art.imageUrl)} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                          <p className="text-[10px] text-white mb-2 truncate w-full">{art.title}</p>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(art.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
