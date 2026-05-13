
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Trash2, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, HardDrive, ArrowRight, ListChecks, Link as LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
  const [bulkJson, setBulkJson] = useState('');
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string, series: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  
  // Jouw vaste adres (zonder poort 5001)
  const [baseUrl, setBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/');
  const [defaultSeries, setDefaultSeries] = useState('Collectie 2024');

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('gofile.me') || url.includes('direct.quickconnect.to');
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
    let artworksData = [];
    try {
      artworksData = JSON.parse(bulkJson);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "De lijst is niet geldig. Controleer de opmaak." });
      setLoading(false);
      return;
    }

    const artworkCol = collection(firestore, 'artworks');
    const total = artworksData.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const art = artworksData[i];
      const data = { 
        ...art, 
        createdAt: serverTimestamp(),
      };
      
      setCurrentUploadItem(i + 1);
      setUploadProgress(((i + 1) / total) * 100);

      try {
        addDoc(artworkCol, data).catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: artworkCol.path,
            operation: 'create',
            requestResourceData: data
          });
          errorEmitter.emit('permission-error', permissionError);
        });
        successCount++;
      } catch (err) {
        console.error("Fout bij item", i, err);
      }
    }
    
    setTimeout(() => {
      toast({ title: "Import Voltooid", description: `${successCount} schilderijen zijn toegevoegd aan je galerie.` });
      setBulkJson('');
      setLoading(false);
      setUploadProgress(0);
      setCurrentUploadItem(0);
    }, 1000);
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
      const relativePath = (file as any).webkitRelativePath || file.name;
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
    toast({ title: "Map gescand", description: `${scanned.length} schilderijen gevonden.` });
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
    toast({ title: "Lijst Klaar", description: "Ga naar Stap 3 om alles op te slaan." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white">
              <HardDrive className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-headline font-light">Portfolio <span className="italic">Beheer</span></h1>
              <p className="text-muted-foreground">{artworks?.length || 0} schilderijen in de database</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent h-12 px-6" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Ververs Pagina
          </Button>
        </header>

        <Alert className="mb-12 bg-primary/5 border-primary/20 p-6 rounded-3xl">
          <LinkIcon className="h-6 w-6 text-primary" />
          <AlertTitle className="text-primary font-bold text-lg mb-2">Het "Eerste Deel" van de Link</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <p className="mb-4">Ja, het eerste deel (je <b>Basis URL</b>) blijft voor al je foto's hetzelfde. De scanner plakt daar simpelweg de bestandsnaam achteraan.</p>
            <div className="bg-background/50 p-4 rounded-xl border font-mono text-xs">
              <span className="text-primary font-bold">{baseUrl}</span>
              <span className="text-accent italic">bestandsnaam.jpg</span>
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="test" className="rounded-xl data-[state=active]:bg-white">1. Test Link</TabsTrigger>
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white">2. Scan Map</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white">3. Opslaan</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white">4. Database</TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 1: Test je Basis URL</CardTitle>
                <CardDescription>Plak hier een complete link naar één foto om te zien of je NAS goed staat ingesteld.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input 
                    placeholder="Plak hier je .jpg link van je NAS..." 
                    value={testUrl} 
                    onChange={e => setTestUrl(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  <Button onClick={handleTestUrl} className="bg-accent text-white h-12 px-8 rounded-xl">Test Foto</Button>
                </div>
                {testResult === 'success' && (
                  <div className="p-4 bg-green-500/10 text-green-700 rounded-2xl flex items-center gap-3 border border-green-200">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-medium">Perfect! Deze link werkt. Je kunt nu naar Stap 2.</p>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-3 border border-destructive/20">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">De foto laadt niet. Controleer of de poort :5001 is weggehaald.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scan">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 2: Map Scannen</CardTitle>
                <CardDescription>Selecteer de map op je computer. De bestandsnamen worden automatisch gekoppeld aan je Basis URL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-accent font-bold">Jouw Vaste Basis URL (Eerste deel)</Label>
                  <Input 
                    value={baseUrl} 
                    onChange={e => setBaseUrl(e.target.value)} 
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground italic">Dit deel blijft voor al je 178+ foto's gelijk.</p>
                </div>

                <div className="p-12 border-2 border-dashed rounded-3xl text-center bg-muted/20 border-accent/20">
                  <Input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner" 
                    onChange={handleFileScan} 
                    accept="image/*" 
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent h-14 px-8" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-3 h-6 w-6" /> Selecteer de map met foto's
                    </label>
                  </Button>
                  <p className="mt-4 text-muted-foreground text-sm">We scannen alleen de namen, de foto's blijven op je computer.</p>
                </div>

                {rawFiles.length > 0 && (
                  <div className="bg-accent/5 rounded-2xl p-6 border space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent">{rawFiles.length} foto's gevonden</span>
                      <Button onClick={generateBulkJson} className="bg-accent text-white rounded-xl">Maak Lijst <ArrowRight className="ml-2 w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 3: Alles Opslaan</CardTitle>
                <CardDescription>Klik op de knop om alle {rawFiles.length} schilderijen in de database te zetten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading && (
                  <div className="space-y-4 p-6 bg-accent/5 rounded-2xl border">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Importeren...</span>
                      <span>{currentUploadItem} van {rawFiles.length}</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                  </div>
                )}

                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-20 bg-primary text-white text-xl font-bold rounded-3xl shadow-xl" 
                  disabled={loading || !bulkJson}
                >
                  {loading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <PlusCircle className="mr-3 h-8 w-8" />}
                  Nu {rawFiles.length} Werken Definitief Opslaan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Database Beheer ({artworks?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent h-12 w-12" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border rounded-xl overflow-hidden group">
                        <Image src={art.imageUrl} alt="" fill className="object-cover" unoptimized={isExternalStorage(art.imageUrl)} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(art.id)}>Verwijder</Button>
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
