
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
import { PlusCircle, Loader2, Wand2, Trash2, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
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
  const [baseUrl, setBaseUrl] = useState('https://doggyfew.direct.quickconnect.to:5001/portfolio/');
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

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const data = { ...singleArtwork, createdAt: serverTimestamp() };

    addDoc(artworkCol, data)
      .then(() => {
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
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
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
      
      toast({ title: "Bulk Import Gestart", description: "De schilderijen worden toegevoegd." });
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
      
      if (pathParts.length > 1) {
        relativePath = pathParts.slice(1).join('/');
      }

      let detectedSeries = defaultSeries;
      if (pathParts.length > 2) {
        detectedSeries = pathParts[pathParts.length - 2].replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
      description: `Een origineel werk van Thijs Sterk.`,
      imageHint: "painting art"
    }));
    setBulkJson(JSON.stringify(generated, null, 2));
    toast({ title: "JSON Klaar", description: "Ga naar Bulk Import." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-headline font-light">Beheer <span className="italic">Portfolio</span></h1>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Verversen
          </Button>
        </header>

        <Alert className="mb-8 bg-accent/10 border-accent/30">
          <AlertCircle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent font-bold">Belangrijk: De Synology Link</AlertTitle>
          <AlertDescription className="text-sm">
            Om foto's van je NAS te tonen, moet de link <strong>direct</strong> naar de afbeelding verwijzen.<br />
            <strong>Juist:</strong> <code>https://.../foto.jpg</code><br />
            <strong>Onjuist:</strong> <code>https://gofile.me/shared/abc</code> (dit is een pagina, geen foto)
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database ({artworks?.length || 0})</TabsTrigger>
            <TabsTrigger value="synology">Stap 1: Test Link</TabsTrigger>
            <TabsTrigger value="helper">Stap 2: Scan Mappen</TabsTrigger>
            <TabsTrigger value="bulk">Stap 3: Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6">
                {loadingArtworks ? <Loader2 className="animate-spin mx-auto" /> : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border rounded-lg overflow-hidden group">
                        <Image src={art.imageUrl} alt="" fill className="object-cover" unoptimized={isExternalStorage(art.imageUrl)} />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(art.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="synology">
            <Card>
              <CardHeader>
                <CardTitle>Test je Synology Link</CardTitle>
                <CardDescription>Plak hier één directe link naar een foto op je NAS om te kijken of hij werkt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://doggyfew.direct.quickconnect.to:5001/portfolio/test.jpg" 
                    value={testUrl} 
                    onChange={e => setTestUrl(e.target.value)}
                  />
                  <Button onClick={handleTestUrl} className="bg-accent">Test</Button>
                </div>
                {testResult === 'success' && (
                  <div className="p-4 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> De link werkt! Je kunt deze Basis URL gebruiken.
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Deze link werkt niet. Zorg dat de map op je NAS 'openbaar' is of gebruik de 'Web Station' map.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle>Mappen Scannen</CardTitle>
                <CardDescription>Selecteer de map op je computer met de 400 foto's.</CardDescription>
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
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-5 w-5" /> Selecteer Map
                    </label>
                  </Button>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Basis URL (Jouw NAS adres tot aan de foto's)</Label>
                      <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
                    </div>
                    <Button onClick={generateBulkJson} className="w-full bg-accent text-white">Genereer Lijst</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Textarea 
                  className="min-h-[300px] font-mono text-[10px]" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                />
                <Button onClick={handleAddBulk} className="w-full h-14 bg-primary text-white" disabled={loading || !bulkJson}>
                  {loading ? <Loader2 className="animate-spin" /> : "Alles Definitief Opslaan"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
