
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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

  // De eigenlijke URL generator die rekening houdt met alle instellingen
  const generateImageUrl = (relativePath: string, fileName: string) => {
    const pathParts = relativePath.split('/');
    let adjustedPath = relativePath;
    
    // Als we de root folder niet willen (bijv. 'MijnSchilderijen/serie1/foto.jpg' wordt 'serie1/foto.jpg')
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
        // Neem de map boven de foto als de serie-naam
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
      imageUrl: generateImageUrl(file.relativePath, file.fileName)
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
    if (!confirm("Weet je zeker dat je de database wilt legen? Dit verwijdert alle schilderijen van de website.")) return;

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

  const copyTestUrl = () => {
    const fullUrl = `${nasBaseUrl}${testFileName}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "URL Gekopieerd", description: "Plak dit in een nieuw tabblad om te testen." });
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-border/50">
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
              <Wifi className="w-5 h-5 text-primary" /> Stap 1: NAS Verbinding Debugger
            </CardTitle>
            <CardDescription>
              Test hier of de website bij een specifiek bestand op je NAS kan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${nasBaseUrl === LOCAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase">Thuis Wi-Fi (Snelst)</span>
                  <Wifi className="w-4 h-4" />
                </div>
                <code className="text-[10px] block truncate text-muted-foreground">{LOCAL_NAS_URL}</code>
              </button>
              <button 
                onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${nasBaseUrl === EXTERNAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase">Overal (Extern)</span>
                  <Globe className="w-4 h-4" />
                </div>
                <code className="text-[10px] block truncate text-muted-foreground">{EXTERNAL_NAS_URL}</code>
              </button>
            </div>

            <div className="bg-muted/30 p-5 rounded-2xl space-y-5 border">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase block">Bestand op de NAS:</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={testFileName} 
                      onChange={(e) => setTestFileName(e.target.value)}
                      placeholder="bijv: 1.jpg"
                      className="bg-white h-11"
                    />
                    <Button variant="outline" onClick={testConnection} disabled={testResult === 'testing'} className="h-11 px-6">
                      {testResult === 'testing' ? <Loader2 className="animate-spin h-4 w-4" /> : "Test Link"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col justify-end space-y-2">
                   <Button variant="secondary" onClick={() => window.open(`${nasBaseUrl}${testFileName}`, '_blank')} className="w-full h-11">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open bestand in nieuw tabblad
                  </Button>
                   <Button variant="ghost" onClick={copyTestUrl} className="w-full h-8 text-[10px] uppercase font-bold text-muted-foreground">
                    <Copy className="mr-2 h-3 w-3" /> Kopieer volledige URL
                  </Button>
                </div>
              </div>
              
              {testResult === 'success' && (
                <div className="flex items-center text-green-700 text-sm gap-3 font-bold bg-green-50 p-4 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-6 h-6 text-green-600"/> 
                  <span>VERBINDING GELUKT! De foto is bereikbaar. Je kunt nu importeren.</span>
                </div>
              )}
              
              {(testResult === 'forbidden' || testResult === 'error') && (
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 p-6">
                  <AlertCircle className="h-6 w-6" />
                  <AlertTitle className="font-bold text-lg mb-4">Verbinding Mislukt (403 of 404)</AlertTitle>
                  <AlertDescription className="text-sm space-y-4">
                    <div className="bg-white/50 p-4 rounded-lg border border-destructive/10">
                      <p className="font-bold mb-2">Waarom werkt 'thisisunsafe' niet?</p>
                      <p className="text-xs leading-relaxed">
                        Als je na het klikken op 'Open bestand' een <b>403 Forbidden</b> ziet, dan is 'thisisunsafe' niet nodig. De browser heeft de NAS al gevonden. De NAS weigert alleen de toegang tot de foto.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold">Checklist voor Synology Rechten:</p>
                      <ul className="list-disc ml-5 space-y-2 text-xs">
                        <li><b>File Station:</b> Rechtsklik map <b>portfolio</b> → Eigenschappen → Machtigingen.</li>
                        <li>Voeg groep <b>http</b> toe met "Lezen" rechten.</li>
                        <li><b>HEEL BELANGRIJK:</b> Vink aan: <i>"Toepassen op deze map, submappen en bestanden"</i>. Zonder dit vinkje werken de foto's zelf niet.</li>
                        <li>Controleer of de foto echt <b>{testFileName}</b> heet (let op hoofdletters!).</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl">2. Opslaan ({scannedFiles.length})</TabsTrigger>
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
                <h2 className="text-xl font-headline mb-4">Kies Portfolio Map</h2>
                
                <div className="bg-muted/30 p-4 rounded-2xl mb-6 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="root-folder" className="text-[10px] font-bold uppercase cursor-pointer">Mapnaam in link opnemen</Label>
                    <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                  </div>
                  <p className="text-[9px] text-muted-foreground text-left italic">
                    {includeRootFolder 
                      ? "De link bevat de geselecteerde mapnaam (bijv. .../Schilderijen/1.jpg)" 
                      : "De link start direct in de geselecteerde map (bijv. .../1.jpg)"}
                  </p>
                </div>

                <Button size="lg" className="rounded-full h-12 px-10 shadow-xl w-full" asChild>
                  <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren & Scannen</label>
                </Button>
              </Card>

              <Card className="border-none shadow-lg rounded-3xl bg-white p-6 flex flex-col overflow-hidden">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider">
                  <Search className="w-4 h-4" /> Link Preview ({finalArtworks.length})
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-2 custom-scrollbar">
                  {finalArtworks.length > 0 ? (
                    finalArtworks.slice(0, 20).map((art, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded-lg border text-[9px] font-mono break-all hover:bg-muted/40 transition-colors">
                        <span className="text-primary font-bold">[{art.title}]</span><br/>
                        <span className="text-accent">{art.imageUrl}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-xs gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      Scan een map om de links te controleren...
                    </div>
                  )}
                  {finalArtworks.length > 20 && <div className="text-[10px] text-center text-muted-foreground pt-2">En nog {finalArtworks.length - 20} andere bestanden...</div>}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loading ? (
                <div className="py-8 space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-2xl font-headline italic">Importeren...</h3>
                      <p className="text-muted-foreground text-xs uppercase tracking-widest">{finalArtworks[currentUploadItem-1]?.title}</p>
                    </div>
                    <span className="font-headline text-2xl">{currentUploadItem} / {finalArtworks.length}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-4 rounded-full" />
                </div>
              ) : (
                <div className="space-y-6 text-center py-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-headline italic">Klaar om op te slaan</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Je gaat <b>{finalArtworks.length}</b> schilderijen toevoegen aan de database met het gekozen pad.
                  </p>
                  <Button onClick={handleSaveAll} className="w-full max-w-md h-16 text-xl font-bold rounded-2xl shadow-xl" disabled={finalArtworks.length === 0}>
                    Start Importeren
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold uppercase tracking-widest text-sm">Huidige Database</h3>
                <span className="text-xs text-muted-foreground">{artworks?.length || 0} items</span>
              </div>
              {loadingArtworks ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent h-10 w-10" /></div>
              ) : artworks && artworks.length > 0 ? (
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
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="rounded-full h-8 w-8" 
                          onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground italic text-sm border-2 border-dashed rounded-2xl">
                  De database is momenteel leeg.
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

