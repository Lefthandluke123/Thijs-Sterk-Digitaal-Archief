
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
import { PlusCircle, Loader2, Wand2, Trash2, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
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
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string, series: string}[]>([]);
  const [baseUrl, setBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to:5001/portfolio/');
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
      }
      
      toast({ title: "Bulk Import Gestart", description: `${artworksData.length} schilderijen worden toegevoegd.` });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "Controleer de code." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Verwijderen?")) return;
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
      
      // Map-naam detectie voor Series
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
    toast({ title: `${scanned.length} bestanden gescand` });
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
    toast({ title: "JSON Klaar", description: "Ga naar het tabblad Bulk Import om op te slaan." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-headline font-light">Beheer <span className="italic">Portfolio</span></h1>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Database Verversen
          </Button>
        </header>

        <Alert className="mb-8 bg-accent/10 border-accent/30">
          <Info className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-bold text-lg mb-2">Hoe werkt het met File Station?</AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>Je beheert je bestanden in <strong>File Station</strong>, maar voor de website hebben we een "Directe URL" nodig.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stap A:</strong> Zet je map met foto's op de NAS (bijv. in een map genaamd <code>portfolio</code>).</li>
              <li><strong>Stap B:</strong> Zorg dat deze map "publiek" bereikbaar is. De makkelijkste manier is via de <strong>Web Station</strong> app op je Synology.</li>
              <li><strong>Stap C:</strong> Test hieronder in <em>Stap 1</em> of één foto werkt.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database ({artworks?.length || 0})</TabsTrigger>
            <TabsTrigger value="synology">Stap 1: Test Link</TabsTrigger>
            <TabsTrigger value="helper">Stap 2: Scan & Genereer</TabsTrigger>
            <TabsTrigger value="bulk">Stap 3: Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6">
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
                    {artworks?.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground italic">
                        Nog geen werken in de database. Gebruik de stappen hiernaast om ze toe te voegen.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="synology">
            <Card>
              <CardHeader>
                <CardTitle>Test je Synology Link</CardTitle>
                <CardDescription>Plak hier een directe link naar een foto op je NAS (moet eindigen op .jpg of .png).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://jouwnas.direct.quickconnect.to:5001/portfolio/foto1.jpg" 
                    value={testUrl} 
                    onChange={e => setTestUrl(e.target.value)}
                  />
                  <Button onClick={handleTestUrl} className="bg-accent text-white">Test Foto</Button>
                </div>
                {testResult === 'success' && (
                  <div className="p-4 bg-green-500/10 text-green-700 rounded-lg flex items-center gap-3 border border-green-200">
                    <CheckCircle2 className="w-6 h-6" /> 
                    <div>
                      <p className="font-bold">Gelukt! De link werkt.</p>
                      <p className="text-xs">Je kunt nu verder naar Stap 2 met deze Basis URL.</p>
                    </div>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold">Deze link werkt niet.</p>
                      <p className="text-xs">De website kan de foto niet direct laden. Controleer of de map "openbaar" is of gebruik Web Station.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle>Mappen Scannen & Koppelen</CardTitle>
                <CardDescription>Selecteer de map op je computer met de 400 foto's om de namen in te laden.</CardDescription>
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
                  <p className="mt-4 text-xs text-muted-foreground">Selecteer de hoofdmap waarin al je submappen staan.</p>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-4 p-6 border rounded-xl bg-accent/5">
                    <h4 className="font-bold text-accent">{rawFiles.length} bestanden gevonden</h4>
                    <div className="space-y-2">
                      <Label>Basis URL (Deel van de link die voor elke foto hetzelfde is)</Label>
                      <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://.../portfolio/" />
                    </div>
                    <Button onClick={generateBulkJson} className="w-full bg-accent text-white h-12">Genereer JSON Lijst</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import</CardTitle>
                <CardDescription>Controleer de lijst hieronder en klik op opslaan om alles naar de database te sturen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[300px] font-mono text-[10px] bg-muted/10" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder="De lijst verschijnt hier na stap 2..."
                />
                <Button onClick={handleAddBulk} className="w-full h-14 bg-primary text-white shadow-xl" disabled={loading || !bulkJson}>
                  {loading ? <Loader2 className="animate-spin" /> : "Alles Definitief Opslaan in Database"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
