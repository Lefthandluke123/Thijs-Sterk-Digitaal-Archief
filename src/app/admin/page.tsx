
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
import { PlusCircle, Loader2, Trash2, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, HardDrive, ArrowRight, ListChecks } from 'lucide-react';
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
  
  // Standaard URL ingesteld op jouw NAS adres, ZONDER :5001
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
        series: art.series || defaultSeries,
        year: art.year || new Date().getFullYear().toString()
      };
      
      setCurrentUploadItem(i + 1);
      setUploadProgress(((i + 1) / total) * 100);

      try {
        // We wachten hier bewust niet met 'await' om de UI niet te blokkeren voor de volgende,
        // maar we houden wel de teller bij voor de voortgangsbalk.
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
      toast({ title: "Import Gestart", description: `${successCount} schilderijen worden toegevoegd aan de database.` });
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
      // Gebruik webkitRelativePath om de mapnaam te achterhalen
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      let detectedSeries = defaultSeries;
      if (pathParts.length > 1) {
        // De mapnaam direct boven het bestand wordt de serie
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
    toast({ title: "Lijst Gegenereerd", description: "De lijst voor Stap 3 is klaar." });
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
              <p className="text-muted-foreground">{artworks?.length || 0} schilderijen live op de site</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent h-12 px-6" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Database Verversen
          </Button>
        </header>

        <Alert className="mb-12 bg-primary/5 border-primary/20 p-6 rounded-3xl">
          <HelpCircle className="h-6 w-6 text-primary" />
          <AlertTitle className="text-primary font-bold text-lg mb-2">Hoe importeer je een heleboel foto's?</AlertTitle>
          <AlertDescription className="text-muted-foreground space-y-4">
            <p>Het geheim voor een snelle import van honderden foto's vanaf je NAS is <strong>Web Station</strong>.</p>
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="bg-background/50 p-4 rounded-xl border">
                <p className="font-bold mb-2">Op je Synology:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Installeer 'Web Station' in Package Center.</li>
                  <li>Zet je foto's in de map <code>/web/portfolio/</code>.</li>
                  <li>Gebruik de link <b>ZONDER</b> :5001.</li>
                </ul>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border">
                <p className="font-bold mb-2">Hier in dit scherm:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><b>Stap 1:</b> Test of je link werkt.</li>
                  <li><b>Stap 2:</b> Selecteer de map op je computer (voor de namen).</li>
                  <li><b>Stap 3:</b> Klik op 'Alles Opslaan'.</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="test" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">1. Test Link</TabsTrigger>
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">2. Scan Map</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">3. Bulk Import</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">4. Database</TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-accent/5 pb-8">
                <CardTitle>Stap 1: Werkt je NAS link?</CardTitle>
                <CardDescription>Plak hier een link naar een foto op je NAS (bijv. vanuit de 'web' map op je Synology).</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input 
                    placeholder="https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/test.jpg" 
                    value={testUrl} 
                    onChange={e => setTestUrl(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  <Button onClick={handleTestUrl} className="bg-accent text-white h-12 px-8 rounded-xl shadow-lg">Test Foto</Button>
                </div>
                {testResult === 'success' && (
                  <div className="p-6 bg-green-500/10 text-green-700 rounded-2xl flex items-center gap-4 border border-green-200">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Gelukt! De link werkt.</p>
                      <p>De website kan nu rechtstreeks bij je foto's. Ga naar stap 2.</p>
                    </div>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="p-6 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-4 border border-destructive/20">
                    <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center text-white text-2xl font-bold">!</div>
                    <div>
                      <p className="font-bold text-lg">Foto laadt niet.</p>
                      <p>Zorg dat de poort :5001 weg is en de foto in de map 'web' staat.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scan">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-accent/5 pb-8">
                <CardTitle>Stap 2: Mappen & Bestanden Scannen</CardTitle>
                <CardDescription>Selecteer de map op je computer. De mapnamen worden automatisch de 'Series'.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="p-12 border-2 border-dashed rounded-3xl text-center bg-muted/20 border-accent/20 transition-colors hover:bg-muted/30">
                  <Input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner" 
                    onChange={handleFileScan} 
                    accept="image/*" 
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent bg-background h-14 px-8" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-3 h-6 w-6" /> Kies de map met schilderijen
                    </label>
                  </Button>
                  <p className="mt-4 text-muted-foreground text-sm italic">Geen zorgen: de foto's zelf worden niet geupload, we scannen alleen de namen.</p>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-6 p-8 border rounded-3xl bg-accent/5">
                    <div className="space-y-3">
                      <Label className="text-accent font-bold text-lg">Basis URL (Kopieer dit uit Stap 1)</Label>
                      <Input 
                        value={baseUrl} 
                        onChange={e => setBaseUrl(e.target.value)} 
                        className="h-12 rounded-xl"
                        placeholder="https://...quickconnect.to/portfolio/" 
                      />
                      <p className="text-xs text-muted-foreground italic">Zorg dat dit eindigt op een / en <b>GEEN</b> :5001 bevat.</p>
                    </div>

                    <div className="bg-background rounded-2xl p-6 border space-y-4">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <ListChecks className="w-5 h-5" />
                        <span>Live Voorbeeld van Links:</span>
                      </div>
                      <ul className="space-y-2 font-mono text-[10px] text-accent/70 overflow-hidden">
                        {rawFiles.slice(0, 3).map((f, i) => (
                          <li key={i} className="truncate">
                            <span className="text-muted-foreground">{i + 1}.</span> {baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}{f.name}
                          </li>
                        ))}
                        {rawFiles.length > 3 && <li className="text-muted-foreground">... en nog {rawFiles.length - 3} anderen.</li>}
                      </ul>
                    </div>

                    <Button onClick={generateBulkJson} className="w-full bg-accent text-white h-14 rounded-2xl shadow-xl text-lg font-bold">
                      Maak Lijst voor Import <ArrowRight className="ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8">
                <CardTitle>Stap 3: Alles in één keer opslaan</CardTitle>
                <CardDescription>Controleer de lijst hieronder en klik op de knop om alle {rawFiles.length} werken in de database te zetten.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <Textarea 
                  className="min-h-[300px] font-mono text-[11px] bg-muted/10 rounded-2xl p-6" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder="De lijst wordt hier automatisch gevuld na Stap 2..."
                />

                {loading && (
                  <div className="space-y-4 p-6 bg-accent/5 rounded-2xl border">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Bezig met importeren...</span>
                      <span>{currentUploadItem} van {rawFiles.length}</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                  </div>
                )}

                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-20 bg-primary text-white shadow-2xl text-xl font-bold rounded-3xl transition-transform hover:scale-[1.01]" 
                  disabled={loading || !bulkJson}
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-3 h-8 w-8" />
                  ) : (
                    <PlusCircle className="mr-3 h-8 w-8" />
                  )}
                  Nu {rawFiles.length} Werken Definitief Opslaan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-accent/5 pb-8">
                <CardTitle>Huidige Collectie ({artworks?.length || 0})</CardTitle>
                <CardDescription>Beheer je bestaande werken in de database.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loadingArtworks ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent h-12 w-12" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border-2 rounded-2xl overflow-hidden group bg-muted/20 hover:border-accent/40 transition-all">
                        <Image 
                          src={art.imageUrl} 
                          alt="" 
                          fill 
                          className="object-cover" 
                          unoptimized={isExternalStorage(art.imageUrl)} 
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                          <p className="text-xs text-white mb-3 font-bold truncate w-full">{art.title}</p>
                          <Button variant="destructive" size="sm" className="rounded-full gap-2" onClick={() => handleDelete(art.id)}>
                            <Trash2 className="w-4 h-4" /> Verwijder
                          </Button>
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
