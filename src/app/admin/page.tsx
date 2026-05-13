"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, FolderOpen, RefreshCw, Info, AlertTriangle, CheckCircle2, Trash2, Database, Globe, Wifi, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// JOUW ADRESSEN
const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedArtworks, setScannedArtworks] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState('scan');
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);

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
      
      const adjustedPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : relativePath;
      
      let detectedSeries = 'Onbekende Serie';
      if (pathParts.length > 2) {
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
    toast({ title: "Map gescand", description: `${scanned.length} bestanden gevonden.` });
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

      setDoc(doc(artworkCol), data).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      successCount++;
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
    if (!confirm("Weet je zeker dat je ALLE werken wilt verwijderen?")) return;

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
    const img = new window.Image();
    
    img.onload = () => setTestResult('success');
    img.onerror = () => {
      setTestResult('error');
      toast({
        variant: "destructive",
        title: "Verbinding mislukt",
        description: "De browser blokkeert de toegang. Volg de instructies hieronder."
      });
    };
    
    img.src = `${nasBaseUrl}favicon.ico?t=${Date.now()}`;
    
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
          <Button variant="destructive" onClick={handleDeleteAll} disabled={loading} className="rounded-full h-12 px-6 font-bold">
            <Trash2 className="w-5 h-5 mr-2" /> Leeg Database
          </Button>
        </header>

        <Card className="mb-12 border-none shadow-lg rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> NAS Verbinding Instellen
            </CardTitle>
            <CardDescription>
              Kies welk adres de website moet gebruiken om de foto&apos;s op te halen.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div 
                onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${nasBaseUrl === LOCAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Lokale Link (WiFi)</span>
                  <Wifi className="w-4 h-4 text-accent" />
                </div>
                <p className="text-xs text-muted-foreground mb-4">Snelste methode als je thuis bent op je eigen netwerk.</p>
                <code className="text-[10px] block p-2 bg-white rounded border truncate">{LOCAL_NAS_URL}</code>
              </div>
              <div 
                onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${nasBaseUrl === EXTERNAL_NAS_URL ? 'border-accent bg-accent/5' : 'border-border bg-transparent hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Externe Link (Altijd)</span>
                  <Globe className="w-4 h-4 text-accent" />
                </div>
                <p className="text-xs text-muted-foreground mb-4">Werkt ook als je niet thuis bent, maar kan iets trager zijn.</p>
                <code className="text-[10px] block p-2 bg-white rounded border truncate">{EXTERNAL_NAS_URL}</code>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
               <Button variant="outline" size="lg" className="rounded-full" onClick={testConnection} disabled={testResult === 'testing'}>
                 {testResult === 'testing' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                 Test Deze Verbinding
               </Button>
               <Button variant="ghost" className="text-xs" onClick={() => window.open(nasBaseUrl, '_blank')}>
                 Open NAS direct in nieuw tabblad
               </Button>
               {testResult === 'success' && <div className="flex items-center text-green-600 text-sm gap-2 font-bold px-4 py-2 bg-green-50 rounded-full"><CheckCircle2 className="w-5 h-5"/> Verbinding geslaagd!</div>}
               {testResult === 'error' && <div className="flex items-center text-destructive text-sm gap-2 font-bold px-4 py-2 bg-red-50 rounded-full"><AlertTriangle className="w-5 h-5"/> Kan NAS niet bereiken</div>}
            </div>

            {testResult === 'error' && (
              <div className="mt-8 space-y-4">
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Browser blokkeert de NAS</AlertTitle>
                  <AlertDescription className="text-xs">
                    Je browser ziet je NAS als &quot;onveilig&quot; omdat het certificaat niet officieel is. Dit moet je één keer handmatig omzeilen.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
                    <ShieldAlert className="w-4 h-4" /> Geen knop &quot;Geavanceerd&quot;? Probeer dit:
                  </h4>
                  <ol className="list-decimal ml-5 text-xs text-amber-800 space-y-3">
                    <li>Klik hierboven op <b>&apos;Open NAS direct in nieuw tabblad&apos;</b>.</li>
                    <li>Je ziet nu een groot rood/grijs scherm met een waarschuwing.</li>
                    <li>
                      <b>De truc:</b> Klik ergens op de achtergrond van die pagina (zodat het venster actief is) en typ op je toetsenbord de volgende letters: 
                      <br/>
                      <code className="bg-white px-2 py-1 rounded border border-amber-300 font-mono text-sm mt-1 inline-block">thisisunsafe</code>
                      <br/>
                      <i>(Je ziet niet wat je typt, maar zodra je de laatste &apos;e&apos; typt, ververst de pagina automatisch.)</i>
                    </li>
                    <li>De pagina opent nu wél. Kom dan terug naar deze pagina en klik opnieuw op <b>&apos;Test Deze Verbinding&apos;</b>.</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-12 h-14 bg-muted/30 p-1 rounded-2xl">
            <TabsTrigger value="scan" className="rounded-xl data-[state=active]:bg-white">1. Map Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl data-[state=active]:bg-white">2. Opslaan ({scannedArtworks.length})</TabsTrigger>
            <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-white">3. Database Check</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
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
                <h2 className="text-2xl font-headline">Selecteer je Portfolio Map</h2>
                <p className="text-muted-foreground text-sm">Selecteer de map op je computer waar al je foto&apos;s in staan. Wij bouwen de linkjes voor je NAS automatisch op.</p>
                <Button size="lg" className="rounded-full h-16 px-12 text-lg shadow-xl" asChild>
                  <label htmlFor="file-scanner" className="cursor-pointer">Map Kiezen</label>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none shadow-lg rounded-3xl bg-white p-8">
              {loading ? (
                <div className="py-12 space-y-6">
                  <div className="flex justify-between text-2xl font-headline italic">
                    <span>Bezig met uploaden naar database...</span>
                    <span>{currentUploadItem} / {scannedArtworks.length}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-8 rounded-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-muted/20 rounded-2xl border space-y-2">
                    <p className="text-xs font-bold text-primary uppercase">Link Preview:</p>
                    <code className="text-[10px] block truncate">{scannedArtworks[0]?.imageUrl}</code>
                  </div>
                  <Button onClick={handleSaveAll} className="w-full h-24 text-2xl font-bold rounded-3xl shadow-2xl" disabled={scannedArtworks.length === 0}>
                    Nu {scannedArtworks.length} Schilderijen Toevoegen
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
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="sm" className="rounded-full h-8" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                          Verwijder
                        </Button>
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