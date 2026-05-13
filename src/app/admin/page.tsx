
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, AlertTriangle, CheckCircle2, Trash2, Database, Globe, Wifi, ShieldAlert, Lock, ExternalLink, Search, Info, Settings } from 'lucide-react';
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
  const [scannedArtworks, setScannedArtworks] = useState<any[]>([]);
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

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      let adjustedPath = relativePath;
      if (!includeRootFolder && pathParts.length > 1) {
        adjustedPath = pathParts.slice(1).join('/');
      }
      
      let detectedSeries = 'Onbekende Serie';
      if (pathParts.length > 1) {
        detectedSeries = pathParts[pathParts.length - 2] || detectedSeries;
        detectedSeries = detectedSeries.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const encodedPath = adjustedPath.split('/').map(part => encodeURIComponent(part)).join('/');
      const fullUrl = `${nasBaseUrl}${encodedPath}`;

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
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    toast({ title: "Map gescand", description: "Controleer de links in de preview." });
  };

  const handleSaveAll = async () => {
    if (!firestore || scannedArtworks.length === 0) return;
    
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const total = scannedArtworks.length;

    for (let i = 0; i < total; i++) {
      const data = { 
        ...scannedArtworks[i], 
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
      toast({ title: "Importeren voltooid", description: "Alle werken zijn toegevoegd." });
      setScannedArtworks([]);
      setLoading(false);
      setActiveTab('db');
    }, 2000);
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
        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-light">Portfolio <span className="italic">Beheer</span></h1>
              <p className="text-muted-foreground text-xs">{artworks?.length || 0} schilderijen online</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAll} 
            disabled={loading} 
            className="rounded-full h-10 px-6 font-bold shadow-lg hover:scale-105 transition-all"
          >
            <Trash2 className="w-4 h-4 mr-2" /> LEEG DATABASE
          </Button>
        </header>

        <Card className="mb-8 border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> Stap 1: NAS Verbinding Testen
            </CardTitle>
            <CardDescription>
              Zorg dat de website bij de foto&apos;s op de NAS kan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div 
                onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${nasBaseUrl === LOCAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase">Thuis Wi-Fi (Snelst)</span>
                  <Wifi className="w-4 h-4" />
                </div>
                <code className="text-[10px] block truncate text-muted-foreground">{LOCAL_NAS_URL}</code>
              </div>
              <div 
                onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${nasBaseUrl === EXTERNAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase">Overal (Extern)</span>
                  <Globe className="w-4 h-4" />
                </div>
                <code className="text-[10px] block truncate text-muted-foreground">{EXTERNAL_NAS_URL}</code>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-2xl space-y-4 border">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-bold uppercase mb-2 block">Test een bestand (bijv. 1.jpg):</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={testFileName} 
                      onChange={(e) => setTestFileName(e.target.value)}
                      placeholder="foto.jpg"
                      className="bg-white h-10"
                    />
                    <Button variant="outline" onClick={testConnection} disabled={testResult === 'testing'} className="h-10">
                      {testResult === 'testing' ? <Loader2 className="animate-spin h-4 w-4" /> : "Test"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-end">
                   <Button variant="secondary" onClick={() => window.open(`${nasBaseUrl}${testFileName}`, '_blank')} className="w-full h-10">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Bestand Direct
                  </Button>
                </div>
              </div>
              
              {testResult === 'success' && (
                <div className="flex items-center text-green-600 text-sm gap-2 font-bold bg-green-50 p-4 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-5 h-5"/> Verbinding geslaagd! Foto is bereikbaar.
                </div>
              )}
              
              {(testResult === 'forbidden' || testResult === 'error') && (
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                  <Settings className="h-4 w-4" />
                  <AlertTitle className="font-bold">Hulp bij 403 / 404 Fout</AlertTitle>
                  <AlertDescription className="text-xs space-y-3 mt-2">
                    <p className="font-bold text-foreground">Krijg je 403 Forbidden bij de knop &quot;Open Bestand Direct&quot;?</p>
                    <p>Dit betekent dat de browser de NAS wel vindt, maar de NAS de toegang blokkeert. Volg deze stappen op je NAS:</p>
                    <ol className="list-decimal ml-4 space-y-2">
                      <li>
                        <b>Machtigingen (File Station):</b><br/>
                        Rechtermuis op map <b>web/portfolio</b> → <b>Eigenschappen</b> → <b>Machtigingen</b>.<br/>
                        Voeg de groep <b>http</b> toe met &quot;Lezen&quot;.<br/>
                        <span className="font-bold text-accent underline italic">Vink &quot;Toepassen op submappen en bestanden&quot; aan!</span>
                      </li>
                      <li>
                        <b>Browser Blokkeert?</b><br/>
                        Als je een rood scherm ziet na het klikken op de knop, typ dan <b>thisisunsafe</b> blindelings op je toetsenbord om de verbinding te forceren.
                      </li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl">2. Opslaan ({scannedArtworks.length})</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl">3. Database</TabsTrigger>
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
                <h2 className="text-xl font-headline mb-4">Portfolio Map Kiezen</h2>
                <div className="flex items-center space-x-2 mb-6 p-3 bg-muted/20 rounded-xl">
                  <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                  <Label htmlFor="root-folder" className="text-[10px] font-medium cursor-pointer uppercase">Mapnaam in link opnemen</Label>
                </div>
                <Button size="lg" className="rounded-full h-12 px-10 shadow-xl" asChild>
                  <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                </Button>
              </Card>

              <Card className="border-none shadow-lg rounded-3xl bg-white p-6 flex flex-col">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider">
                  <Search className="w-4 h-4" /> Link Preview
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-2 custom-scrollbar">
                  {scannedArtworks.length > 0 ? (
                    scannedArtworks.slice(0, 10).map((art, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded-lg border text-[9px] font-mono break-all">
                        <span className="text-primary font-bold">[{art.title}]</span><br/>
                        <span className="text-accent">{art.imageUrl}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">Scan een map om linkjes te zien...</div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loading ? (
                <div className="py-8 space-y-4">
                  <div className="flex justify-between text-xl font-headline italic">
                    <span>Importeren...</span>
                    <span>{currentUploadItem} / {scannedArtworks.length}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-6 rounded-full" />
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-headline italic">Klaar voor import</h3>
                  <p className="text-muted-foreground text-sm">Je gaat <b>{scannedArtworks.length}</b> schilderijen toevoegen aan de database.</p>
                  <Button onClick={handleSaveAll} className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl" disabled={scannedArtworks.length === 0}>
                    Start Importeren
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-6">
              {loadingArtworks ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent h-10 w-10" /></div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {artworks?.map((art: any) => (
                    <div key={art.id} className="relative aspect-square border rounded-xl overflow-hidden group bg-muted/30">
                      <Image 
                        src={art.imageUrl} 
                        alt="" 
                        fill 
                        className="object-cover" 
                        unoptimized={true} 
                        onError={(e) => {
                          (e.target as any).src = 'https://placehold.co/400x400/d5dc96/2013025?text=403/404';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <Button variant="destructive" size="sm" className="rounded-full h-6 w-full text-[8px]" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>X</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
