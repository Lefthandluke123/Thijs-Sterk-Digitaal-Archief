
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, HardDrive, Info, AlertTriangle, CheckCircle2, Trash2, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";

// JOUW VASTE ADRES (WEB STATION)
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

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      // FIX: Sla de allereerste mapnaam over (die jij op je computer selecteert)
      // zodat we niet .../portfolio/Schilderijen/foto.jpg krijgen maar gewoon .../portfolio/foto.jpg
      const adjustedPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : relativePath;
      
      // Bepaal de serie op basis van de ECHTE submapnaam op je NAS
      let detectedSeries = 'Collectie 2024';
      if (pathParts.length > 2) {
        detectedSeries = pathParts[pathParts.length - 2] || detectedSeries;
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      // Maak een nette titel van de bestandsnaam
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // URL Encoding: spaties worden %20, browsers hebben dit nodig
      const encodedPath = adjustedPath.split('/').map(part => encodeURIComponent(part)).join('/');
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
    toast({ title: "Map gescand", description: `${scanned.length} bestanden gevonden.` });
    setActiveTab('import');
  };

  const handleSaveAll = async () => {
    if (!firestore || scannedArtworks.length === 0) return;
    
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const total = scannedArtworks.length;
    let successCount = 0;

    // We voegen ze één voor één toe om de voortgangsbalk te laten werken
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
      toast({ title: "Importeren voltooid", description: `${successCount} werken toegevoegd.` });
      setScannedArtworks([]);
      setLoading(false);
      setUploadProgress(0);
      setCurrentUploadItem(0);
      setActiveTab('db');
    }, 2000);
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("Weet je zeker dat je ALLE werken uit de database wilt verwijderen? Dit is nodig om de 'Link Fouten' op te lossen.")) return;

    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      toast({ title: "Database geleegd", description: "Je kunt nu opnieuw scannen met de verbeterde linkjes." });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout bij het legen", description: "Probeer het nog eens." });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    setTestResult(null);
    const img = new window.Image();
    img.onload = () => setTestResult('success');
    img.onerror = () => setTestResult('error');
    // We testen even met een favicon of iets kleins dat op je NAS staat
    img.src = `${FIXED_NAS_BASE_URL}favicon.ico?t=${Date.now()}`;
    
    setTimeout(() => {
      if (!testResult) setTestResult('error');
    }, 5000);
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* HEADER MET DE RODE VERWIJDERKNOP */}
        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-headline font-light">Database <span className="italic">Beheer</span></h1>
              <p className="text-muted-foreground">{artworks?.length || 0} schilderijen online</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="destructive" 
              onClick={handleDeleteAll} 
              disabled={loading}
              className="rounded-full h-12 px-6 font-bold shadow-lg shadow-red-200"
            >
              <Trash2 className="w-5 h-5 mr-2" /> Leeg Hele Database
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full h-12 px-6">
              <RefreshCw className="w-5 h-5 mr-2" /> Ververs Pagina
            </Button>
          </div>
        </header>

        <Alert className="mb-12 bg-primary/5 border-primary/20 p-6 rounded-3xl">
          <Info className="h-6 w-6 text-primary" />
          <AlertTitle className="text-primary font-bold text-lg mb-2">FIX: Geen "Link Fouten" meer</AlertTitle>
          <AlertDescription className="text-muted-foreground space-y-4">
            <p>De nieuwe scanner slaat automatisch de mapnaam over die je op je computer selecteert. Hierdoor worden de linkjes naar je NAS nu 100% correct opgebouwd zonder dubbele mappen. Ook worden spaties nu automatisch vervangen door code (URL encoding).</p>
            <div className="flex items-center gap-4 mt-4">
               <Button variant="outline" size="sm" onClick={testConnection}>Test Verbinding met NAS</Button>
               {testResult === 'success' && <div className="flex items-center text-green-600 text-sm gap-1 font-bold"><CheckCircle2 className="w-4 h-4"/> Verbinding OK!</div>}
               {testResult === 'error' && <div className="flex items-center text-destructive text-sm gap-1 font-bold"><AlertTriangle className="w-4 h-4"/> NAS niet bereikbaar</div>}
            </div>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white">2. Werken Opslaan</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white">3. Database Check</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 1: Map op je computer kiezen</CardTitle>
                <CardDescription>Selecteer de map waar al je 178+ foto's in staan.</CardDescription>
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
                  <Button variant="outline" size="lg" className="rounded-full border-accent text-accent h-20 px-12 text-xl shadow-md" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-3 h-8 w-8" /> Kies Map met Schilderijen
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Stap 2: Alles online zetten</CardTitle>
                <CardDescription>We hebben {scannedArtworks.length} schilderijen gevonden in de map.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {scannedArtworks.length > 0 && !loading && (
                   <div className="max-h-60 overflow-y-auto border rounded-2xl p-6 bg-muted/10 space-y-3">
                     <p className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">Preview van de linkjes (automatisch gefixt):</p>
                     {scannedArtworks.slice(0, 4).map((art, i) => (
                       <div key={i} className="text-[10px] flex flex-col gap-1 border-b pb-3 last:border-0 border-border/50">
                         <span className="font-bold text-sm text-foreground">{art.title}</span>
                         <code className="text-muted-foreground break-all bg-white/50 p-2 rounded-lg text-[10px] border border-border/30">{art.imageUrl}</code>
                       </div>
                     ))}
                     {scannedArtworks.length > 4 && <div className="text-center text-xs text-muted-foreground pt-2 font-medium">...en nog {scannedArtworks.length - 4} andere bestanden</div>}
                   </div>
                )}

                {loading && (
                  <div className="space-y-4 p-10 bg-accent/5 rounded-3xl border border-accent/20">
                    <div className="flex justify-between text-lg font-bold text-accent">
                      <span>Importeren...</span>
                      <span>{currentUploadItem} / {scannedArtworks.length}</span>
                    </div>
                    <Progress value={uploadProgress} className="h-6" />
                  </div>
                )}

                <Button 
                  onClick={handleSaveAll} 
                  className="w-full h-24 bg-primary text-white text-2xl font-bold rounded-3xl shadow-2xl hover:scale-[1.02] transition-transform" 
                  disabled={loading || scannedArtworks.length === 0}
                >
                  {loading ? <Loader2 className="animate-spin mr-3 h-10 w-10" /> : <PlusCircle className="mr-3 h-10 w-10" />}
                  Nu {scannedArtworks.length} Schilderijen Toevoegen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle>Database Overzicht ({artworks?.length || 0})</CardTitle>
                <CardDescription>Hieronder zie je of de plaatjes nu wel laden.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent h-12 w-12" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {artworks?.map((art: any) => (
                      <div key={art.id} className="relative aspect-square border rounded-2xl overflow-hidden group bg-muted/30 shadow-sm">
                        <Image 
                          src={art.imageUrl} 
                          alt="" 
                          fill 
                          className="object-cover" 
                          unoptimized={true} 
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/400x400/d5dc96/2013025?text=Link+Fout';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-white text-center">
                          <p className="text-[10px] font-bold mb-2">{art.title}</p>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-7 text-[10px] rounded-full" 
                            onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}
                          >
                            Verwijder
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
