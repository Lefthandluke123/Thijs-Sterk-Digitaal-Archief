"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, AlertTriangle, CheckCircle2, Trash2, Database, Globe, Wifi, ShieldAlert, Lock, ExternalLink, Search, FileWarning, Info } from 'lucide-react';
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
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | 'forbidden' | 'notfound' | null>(null);
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [testFileName, setTestFileName] = useState('test.jpg');
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
      
      // Bepaal het pad op de NAS: sla de eerste map over als de schakelaar uit staat
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
      
      // Encodeer alleen de delen van het pad om spaties op te vangen (%20)
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
      toast({ title: "Importeren voltooid", description: "Alle werken zijn toegevoegd aan de database." });
      setScannedArtworks([]);
      setLoading(false);
      setUploadProgress(0);
      setCurrentUploadItem(0);
      setActiveTab('db');
    }, 2000);
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("Weet je zeker dat je ALLE werken wilt verwijderen uit de database?")) return;

    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Database geleegd" });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout bij het legen" });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    setTestResult('testing');
    const fullUrl = `${nasBaseUrl}${testFileName}?t=${Date.now()}`;
    
    fetch(fullUrl, { mode: 'no-cors' })
      .then(() => {
        const img = new window.Image();
        img.onload = () => setTestResult('success');
        img.onerror = () => setTestResult('forbidden');
        img.src = fullUrl;
      })
      .catch(() => {
        setTestResult('error');
      });

    setTimeout(() => {
      if (testResult === 'testing') setTestResult('error');
    }, 5000);
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-headline font-light">Portfolio <span className="italic">Beheer</span></h1>
              <p className="text-muted-foreground">{artworks?.length || 0} schilderijen in database</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleDeleteAll} disabled={loading} className="rounded-full h-12 px-6 font-bold shadow-lg hover:shadow-xl transition-all">
            <Trash2 className="w-5 h-5 mr-2" /> Leeg Hele Database
          </Button>
        </header>

        <Card className="mb-12 border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> 1. Stap: Controleer de Verbinding
            </CardTitle>
            <CardDescription>
              Stel in hoe we je foto's kunnen vinden op de NAS.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div 
                onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${nasBaseUrl === LOCAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">Lokale Link (Alleen thuis Wi-Fi)</span>
                  <Wifi className="w-4 h-4 text-accent" />
                </div>
                <code className="text-[10px] block p-2 bg-white rounded border truncate">{LOCAL_NAS_URL}</code>
              </div>
              <div 
                onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${nasBaseUrl === EXTERNAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">Externe Link (Werkt overal)</span>
                  <Globe className="w-4 h-4 text-accent" />
                </div>
                <code className="text-[10px] block p-2 bg-white rounded border truncate">{EXTERNAL_NAS_URL}</code>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="font-bold text-xs mb-2 block uppercase tracking-wider">Test een bestand (bijv. foto.jpg):</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={testFileName} 
                      onChange={(e) => setTestFileName(e.target.value)}
                      placeholder="naam-van-foto.jpg"
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={testConnection} disabled={testResult === 'testing'} className="h-10">
                    {testResult === 'testing' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Test Link
                  </Button>
                  <Button variant="secondary" onClick={() => window.open(`${nasBaseUrl}${testFileName}`, '_blank')} className="h-10">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Direct
                  </Button>
                </div>
              </div>
              
              {testResult === 'success' && <div className="flex items-center text-green-600 text-sm gap-2 font-bold bg-green-50 p-4 rounded-xl border border-green-200"><CheckCircle2 className="w-5 h-5"/> Verbinding geslaagd!</div>}
              
              {testResult === 'forbidden' && (
                <Alert variant="destructive" className="rounded-xl bg-destructive/5 border-destructive/20">
                  <Lock className="h-4 w-4" />
                  <AlertTitle className="font-bold">403: Toegang Geweigerd op NAS</AlertTitle>
                  <AlertDescription className="text-xs space-y-2">
                    <p>De NAS is gevonden, maar weigert toegang. Doe dit in File Station:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Rechtermuis op map <b>web/portfolio</b> &rarr; Eigenschappen &rarr; Machtigingen.</li>
                      <li>Voeg groep <b>http</b> toe met "Lezen" rechten.</li>
                      <li><b>CRUCIAAL:</b> Vink aan: "Toepassen op deze map, submappen en bestanden".</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}

              {testResult === 'error' && (
                <Alert className="rounded-xl bg-amber-50 border-amber-200">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="font-bold text-amber-800">Browserblokkade (SSL)</AlertTitle>
                  <AlertDescription className="text-xs text-amber-700 space-y-2">
                    <p>Je browser blokkeert de onbeveiligde verbinding. Doe dit:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Klik op <b>Open Direct</b> hierboven.</li>
                      <li>Als je een waarschuwing ziet, klik op "Geavanceerd" en "Doorgaan".</li>
                      <li>Of typ op dat tabblad simpelweg: <b>thisisunsafe</b></li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white">2. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white">3. Opslaan ({scannedArtworks.length})</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white">4. Database Check</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-none shadow-lg rounded-3xl p-12 text-center bg-white">
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  id="file-scanner" 
                  onChange={handleFileScan} 
                  accept="image/*" 
                  {...({ webkitdirectory: "", directory: "" } as any)} 
                />
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
                    <FolderOpen className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-headline">Kies je Portfolio Map</h2>
                  <div className="flex items-center justify-center space-x-2 py-4 border-t border-b">
                    <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={(val) => setIncludeRootFolder(val)} />
                    <Label htmlFor="root-folder" className="text-xs font-medium cursor-pointer">Mapnaam opnemen in link</Label>
                  </div>
                  <Button size="lg" className="rounded-full h-16 px-12 text-lg shadow-xl hover:scale-105 transition-transform w-full" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Map Kiezen</label>
                  </Button>
                </div>
              </Card>

              <Card className="border-none shadow-lg rounded-3xl bg-white p-8 overflow-hidden flex flex-col">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="w-4 h-4" /> Live Link Preview
                  </CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2 custom-scrollbar">
                  {scannedArtworks.length > 0 ? (
                    scannedArtworks.slice(0, 10).map((art, i) => (
                      <div key={i} className="p-3 bg-muted/20 rounded-xl border text-[9px] font-mono break-all">
                        <span className="text-primary font-bold">[{art.title}]</span><br/>
                        <span className="text-accent">{art.imageUrl}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">Scan een map om de links te zien...</div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loading ? (
                <div className="py-12 space-y-6">
                  <div className="flex justify-between text-2xl font-headline italic">
                    <span>Bezig met uploaden...</span>
                    <span>{currentUploadItem} / {scannedArtworks.length}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-8 rounded-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Bevestigen</AlertTitle>
                    <AlertDescription className="text-xs">Je gaat <b>{scannedArtworks.length}</b> schilderijen toevoegen aan de online galerie.</AlertDescription>
                  </Alert>
                  <Button onClick={handleSaveAll} className="w-full h-24 text-2xl font-bold rounded-3xl shadow-2xl hover:scale-[1.02] transition-transform" disabled={scannedArtworks.length === 0}>
                    Nu {scannedArtworks.length} Werken Toevoegen
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loadingArtworks ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent h-12 w-12" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {artworks?.map((art: any) => (
                    <div key={art.id} className="relative aspect-square border rounded-2xl overflow-hidden group bg-muted/30">
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
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <Button variant="destructive" size="sm" className="rounded-full h-8 w-full" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>Verwijder</Button>
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
