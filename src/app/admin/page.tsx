
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, HardDrive, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";

// JOUW VASTE ADRES
const FIXED_NAS_BASE_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedArtworks, setScannedArtworks] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState('scan');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('direct.quickconnect.to');
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      // Bepaal de serie op basis van de mapnaam
      let detectedSeries = 'Collectie 2024';
      if (pathParts.length > 1) {
        detectedSeries = pathParts[pathParts.length - 2] || detectedSeries;
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      // Maak een nette titel van de bestandsnaam
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // URL Encoding is cruciaal voor spaties in bestandsnamen!
      // We encoderen alleen het gedeelte NA het vaste adres
      const encodedPath = relativePath.split('/').map(part => encodeURIComponent(part)).join('/');
      const fullUrl = `${FIXED_NAS_BASE_URL}${encodedPath}`;

      return {
        title: cleanName,
        series: detectedSeries,
        year: new Date().getFullYear().toString(),
        medium: "Olieverf op doek",
        imageUrl: fullUrl,
        description: `Een origineel werk van Thijs Sterk uit de serie ${detectedSeries}.`,
        imageHint: "painting art"
      };
    });
    
    setScannedArtworks(scanned);
    toast({ title: "Map gescand", description: `${scanned.length} schilderijen gevonden.` });
    setActiveTab('import');
  };

  const handleSaveAll = async () => {
    if (!firestore || scannedArtworks.length === 0) return;
    
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const total = scannedArtworks.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const data = { 
        ...scannedArtworks[i], 
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
        console.error("Fout bij opslaan", i, err);
      }
    }
    
    setTimeout(() => {
      toast({ title: "Gelukt!", description: `${successCount} schilderijen zijn toegevoegd aan je database.` });
      setScannedArtworks([]);
      setLoading(false);
      setUploadProgress(0);
      setCurrentUploadItem(0);
      setActiveTab('db');
    }, 1500);
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

  const testConnection = () => {
    setTestResult(null);
    const img = new window.Image();
    img.onload = () => setTestResult('success');
    img.onerror = () => setTestResult('error');
    // We testen even met een dummy plaatje op jouw NAS om te zien of het domein bereikbaar is
    img.src = `${FIXED_NAS_BASE_URL}favicon.ico?t=${Date.now()}`;
    
    setTimeout(() => {
      if (!testResult) setTestResult('error');
    }, 5000);
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
              <p className="text-muted-foreground">{artworks?.length || 0} schilderijen online</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full gap-2 border-accent text-accent h-12 px-6" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Ververs Pagina
          </Button>
        </header>

        <Alert className="mb-12 bg-primary/5 border-primary/20 p-6 rounded-3xl">
          <Info className="h-6 w-6 text-primary" />
          <AlertTitle className="text-primary font-bold text-lg mb-2">Automatische Koppeling & Fixes</AlertTitle>
          <AlertDescription className="text-muted-foreground space-y-4">
            <p>Ik heb URL-encoding toegevoegd. Dit betekent dat spaties in je bestandsnamen nu automatisch worden omgezet naar %20, zodat de website ze wel kan vinden.</p>
            <div className="flex items-center gap-4 mt-4">
               <Button variant="outline" size="sm" onClick={testConnection}>Test Verbinding met NAS</Button>
               {testResult === 'success' && <div className="flex items-center text-green-600 text-sm gap-1"><CheckCircle2 className="w-4 h-4"/> Verbinding OK</div>}
               {testResult === 'error' && <div className="flex items-center text-destructive text-sm gap-1"><AlertTriangle className="w-4 h-4"/> NAS niet bereikbaar</div>}
            </div>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white">2. Opslaan</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white">3. Database</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 1: Kies je map</CardTitle>
                <CardDescription>Selecteer de map op je computer met de foto's. De app fixt de linkjes automatisch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="p-16 border-2 border-dashed rounded-3xl text-center bg-muted/20 border-accent/20 transition-colors hover:bg-muted/30">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner" 
                    onChange={handleFileScan} 
                    accept="image/*" 
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent h-16 px-10 text-lg" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-3 h-7 w-7" /> Selecteer Map met Foto's
                    </label>
                  </Button>
                  <p className="mt-6 text-muted-foreground text-sm">Let op: Scan de map "Schilderijen" op je computer die overeenkomt met de map op je NAS.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 2: Alles opslaan</CardTitle>
                <CardDescription>We hebben {scannedArtworks.length} schilderijen gevonden. Linkjes zijn gefixt voor internetgebruik.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {scannedArtworks.length > 0 && !loading && (
                   <div className="max-h-60 overflow-y-auto border rounded-xl p-4 bg-muted/10 space-y-2">
                     {scannedArtworks.slice(0, 3).map((art, i) => (
                       <div key={i} className="text-[10px] flex flex-col gap-1 border-b pb-2 last:border-0">
                         <span className="font-bold text-xs">{art.title}</span>
                         <code className="text-muted-foreground break-all bg-white/50 p-1 rounded">{art.imageUrl}</code>
                       </div>
                     ))}
                     {scannedArtworks.length > 3 && <div className="text-center text-xs text-muted-foreground pt-2">...en nog {scannedArtworks.length - 3} meer</div>}
                   </div>
                )}

                {loading && (
                  <div className="space-y-4 p-8 bg-accent/5 rounded-2xl border">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Bezig met importeren...</span>
                      <span>{currentUploadItem} van {scannedArtworks.length}</span>
                    </div>
                    <Progress value={uploadProgress} className="h-4" />
                  </div>
                )}

                <Button 
                  onClick={handleSaveAll} 
                  className="w-full h-20 bg-primary text-white text-xl font-bold rounded-3xl shadow-xl hover:scale-[1.02] transition-transform" 
                  disabled={loading || scannedArtworks.length === 0}
                >
                  {loading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <PlusCircle className="mr-3 h-8 w-8" />}
                  Nu {scannedArtworks.length} Schilderijen Online Zetten
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Database ({artworks?.length || 0})</CardTitle>
                <CardDescription>Klik op een werk om te zien of de link op dit netwerk werkt.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent h-12 w-12" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border rounded-xl overflow-hidden group bg-muted/30">
                        <Image 
                          src={art.imageUrl} 
                          alt="" 
                          fill 
                          className="object-cover" 
                          unoptimized={isExternalStorage(art.imageUrl)} 
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/400x400/d5dc96/2013025?text=Link+fout';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2 text-white text-center">
                          <p className="text-[10px] font-bold">{art.title}</p>
                          <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => handleDelete(art.id)}>Verwijder</Button>
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
