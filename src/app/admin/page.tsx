
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, AlertTriangle, CheckCircle2, Trash2, Database, Globe, Wifi, ShieldAlert, Lock, ExternalLink, Search, Info, Settings, ArrowRight, Copy, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState('scan');
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | 'forbidden' | null>(null);
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [testFileName, setTestFileName] = useState('1.jpg');
  const [includeRootFolder, setIncludeRootFolder] = useState(false);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const generateImageUrl = (relativePath: string) => {
    const pathParts = relativePath.split('/');
    let adjustedPath = relativePath;
    
    if (!includeRootFolder && pathParts.length > 1) {
      adjustedPath = pathParts.slice(1).join('/');
    }
    
    const encodedPath = adjustedPath.split('/').map(part => encodeURIComponent(part)).join('/');
    return `${nasBaseUrl}${encodedPath}`;
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      let detectedSeries = 'Onbekende Serie';
      if (pathParts.length > 1) {
        detectedSeries = pathParts[pathParts.length - 2] || detectedSeries;
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        title: cleanName,
        series: detectedSeries,
        year: new Date().getFullYear().toString(),
        medium: "Olieverf op doek",
        relativePath: relativePath,
        fileName: file.name,
        description: `Een origineel werk van Thijs Sterk uit de serie ${detectedSeries}.`,
        imageHint: "painting art"
      };
    });
    
    setScannedFiles(scanned);
    toast({ title: "Map gescand", description: `${scanned.length} bestanden gevonden.` });
  };

  const finalArtworks = useMemo(() => {
    return scannedFiles.map(file => ({
      ...file,
      imageUrl: generateImageUrl(file.relativePath)
    }));
  }, [scannedFiles, nasBaseUrl, includeRootFolder]);

  const handleSaveAll = async () => {
    if (!firestore || finalArtworks.length === 0) return;
    
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const total = finalArtworks.length;

    for (let i = 0; i < total; i++) {
      const artwork = finalArtworks[i];
      const data = { 
        title: artwork.title,
        series: artwork.series,
        year: artwork.year,
        medium: artwork.medium,
        imageUrl: artwork.imageUrl,
        description: artwork.description,
        imageHint: artwork.imageHint,
        createdAt: serverTimestamp(),
      };
      
      setCurrentUploadItem(i + 1);
      setUploadProgress(((i + 1) / total) * 100);

      setDoc(doc(artworkCol), data).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    }
    
    setTimeout(() => {
      toast({ title: "Importeren voltooid", description: "Alle werken zijn toegevoegd aan de database." });
      setScannedFiles([]);
      setLoading(false);
      setActiveTab('db');
    }, 1500);
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("Weet je zeker dat je de database wilt legen?")) return;

    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Database geleegd" });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout bij legen" });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    setTestResult('testing');
    const fullUrl = `${nasBaseUrl}${testFileName}?t=${Date.now()}`;
    
    const img = new window.Image();
    img.onload = () => setTestResult('success');
    img.onerror = () => setTestResult('forbidden');
    img.src = fullUrl;

    setTimeout(() => {
      if (testResult === 'testing') setTestResult('error');
    }, 5000);
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-headline">Portfolio Beheer</h1>
              <p className="text-muted-foreground text-xs">{artworks?.length || 0} schilderijen online</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleDeleteAll} disabled={loading} className="rounded-full">
            <Trash2 className="w-4 h-4 mr-2" /> DATABASE LEGEN
          </Button>
        </header>

        <Card className="mb-8 border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> Stap 1: NAS Link Debugger
            </CardTitle>
            <CardDescription>
              Test hier of één specifiek bestand op je NAS bereikbaar is.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${nasBaseUrl === LOCAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border'}`}
              >
                <span className="font-bold text-xs uppercase block mb-1">Thuis Wi-Fi</span>
                <code className="text-[10px] block truncate">{LOCAL_NAS_URL}</code>
              </button>
              <button 
                onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${nasBaseUrl === EXTERNAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border'}`}
              >
                <span className="font-bold text-xs uppercase block mb-1">Overal (Extern)</span>
                <code className="text-[10px] block truncate">{EXTERNAL_NAS_URL}</code>
              </button>
            </div>

            <div className="bg-muted/30 p-5 rounded-2xl space-y-4 border">
              <div className="flex gap-2">
                <Input 
                  value={testFileName} 
                  onChange={(e) => setTestFileName(e.target.value)}
                  placeholder="bijv: 1.jpg"
                  className="bg-white"
                />
                <Button onClick={testConnection} disabled={testResult === 'testing'}>
                  {testResult === 'testing' ? <Loader2 className="animate-spin h-4 w-4" /> : "Test Link"}
                </Button>
              </div>
              
              {testResult === 'success' && (
                <div className="flex items-center text-green-700 text-sm gap-2 font-bold bg-green-50 p-3 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-5 h-5"/> Verbinding gelukt! De foto is bereikbaar.
                </div>
              )}
              
              {(testResult === 'forbidden' || testResult === 'error') && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fout bij verbinding (403 of 404)</AlertTitle>
                  <AlertDescription className="text-xs space-y-2">
                    <p>Als je 403 ziet, blokkeert de NAS de toegang. Controleer:</p>
                    <ul className="list-disc ml-5">
                      <li>File Station: Machtigingen voor groep <b>http</b> op "Lezen".</li>
                      <li>Vinkje: <b>"Toepassen op deze map, submappen en bestanden"</b>.</li>
                      <li>Hoofdletters: Heet het bestand echt <b>{testFileName}</b>?</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import">2. Opslaan ({scannedFiles.length})</TabsTrigger>
            <TabsTrigger value="db">3. Database</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg rounded-3xl p-8 text-center bg-white flex flex-col items-center justify-center min-h-[300px]">
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  id="file-scanner" 
                  onChange={handleFileScan} 
                  accept="image/*" 
                  {...({ webkitdirectory: "", directory: "" } as any)} 
                />
                <FolderOpen className="w-12 h-12 text-accent mb-4" />
                <h2 className="text-xl font-headline mb-4">Selecteer Portfolio Map</h2>
                
                <div className="bg-muted/30 p-4 rounded-2xl mb-6 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="root-folder" className="text-[10px] font-bold uppercase">Mapnaam in link</Label>
                    <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                  </div>
                  <p className="text-[9px] text-muted-foreground text-left italic">
                    {includeRootFolder ? "Bevat de mapnaam (bijv. .../Schilderijen/1.jpg)" : "Direct in de map (bijv. .../1.jpg)"}
                  </p>
                </div>

                <Button size="lg" className="rounded-full w-full" asChild>
                  <label htmlFor="file-scanner" className="cursor-pointer">Map Scannen</label>
                </Button>
              </Card>

              <Card className="border-none shadow-lg rounded-3xl bg-white p-6 flex flex-col">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest">Link Preview</h3>
                <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 text-[9px] font-mono pr-2">
                  {finalArtworks.length > 0 ? (
                    finalArtworks.slice(0, 10).map((art, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded-lg border break-all">
                        <span className="text-primary">{art.title}</span>: {art.imageUrl}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground italic">Scan een map om linkjes te zien...</div>
                  )}
                  {finalArtworks.length > 10 && <div className="text-center pt-2">... en {finalArtworks.length - 10} meer ...</div>}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loading ? (
                <div className="py-8 space-y-4 text-center">
                  <h3 className="text-2xl font-headline italic">Bezig met importeren...</h3>
                  <p className="text-muted-foreground text-xs">{currentUploadItem} / {finalArtworks.length}</p>
                  <Progress value={uploadProgress} className="h-4" />
                </div>
              ) : (
                <div className="space-y-6 text-center py-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-headline">Klaar om op te slaan</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Je gaat <b>{finalArtworks.length}</b> schilderijen toevoegen aan de database.
                  </p>
                  <Button onClick={handleSaveAll} className="w-full max-w-md h-12 font-bold" disabled={finalArtworks.length === 0}>
                    Start Importeren
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-6">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {artworks?.map((art: any) => (
                  <div key={art.id} className="relative aspect-square border rounded-xl overflow-hidden group bg-muted/30">
                    <Image 
                      src={art.imageUrl} 
                      alt="" 
                      fill 
                      className="object-cover" 
                      unoptimized={true} 
                      onError={(e) => {
                        (e.target as any).src = 'https://placehold.co/400x400/d5dc96/2013025?text=Fout';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
