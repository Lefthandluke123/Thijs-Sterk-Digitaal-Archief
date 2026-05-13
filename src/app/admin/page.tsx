
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FolderOpen, 
  Trash2, 
  Wifi, 
  CheckCircle2, 
  Settings, 
  Archive, 
  Scan, 
  Monitor,
  AlertCircle,
  Database
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState('scan');
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [testFileName, setTestFileName] = useState('1.jpg');
  const [includeRootFolder, setIncludeRootFolder] = useState(false);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: dbLoading } = useCollection(artworksQuery);

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
        description: `Werk uit de serie ${detectedSeries}.`,
        imageHint: "painting art"
      };
    });
    setScannedFiles(scanned);
    toast({ title: "Scan voltooid", description: `${scanned.length} werken gevonden.` });
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
    
    try {
      for (let i = 0; i < finalArtworks.length; i++) {
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
        setUploadProgress(((i + 1) / finalArtworks.length) * 100);
        
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
        toast({ title: "Import voltooid", description: "De database is bijgewerkt." });
        setScannedFiles([]);
        setLoading(false);
        setActiveTab('db');
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Fout bij importeren" });
    }
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("LET OP: Weet je zeker dat je de gehele database wilt legen?")) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Database is nu leeg" });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout bij verwijderen" });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    setTestResult('testing');
    const fullUrl = `${nasBaseUrl}${testFileName}?t=${Date.now()}`;
    const img = new window.Image();
    img.onload = () => setTestResult('success');
    img.onerror = () => setTestResult('error');
    img.src = fullUrl;
    setTimeout(() => { if (testResult === 'testing') setTestResult('error'); }, 5000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Navigation */}
      <header className="h-20 border-b border-border/10 flex items-center justify-between px-8 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-white font-bold text-xl">T</div>
          <nav className="flex items-center gap-1">
            <Button 
              variant={activeTab === 'scan' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-4 h-11", activeTab === 'scan' && "font-bold")}
              onClick={() => setActiveTab('scan')}
            >
              <Scan className="w-4 h-4" /> Import
            </Button>
            <Button 
              variant={activeTab === 'db' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-4 h-11", activeTab === 'db' && "font-bold")}
              onClick={() => setActiveTab('db')}
            >
              <Archive className="w-4 h-4" /> Collectie
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-4 h-11", activeTab === 'settings' && "font-bold")}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4" /> NAS Instellingen
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(nasBaseUrl, '_blank')} 
            className="gap-2 font-bold h-10"
          >
            <Wifi className="w-4 h-4 text-accent" /> Test NAS Link
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDeleteAll} 
            className="text-destructive h-10 w-10 hover:bg-destructive/10"
            title="Database Wissen"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'scan' && (
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">1. Map Scannen</CardTitle>
                    <CardDescription>Selecteer de map op je computer die overeenkomt met de map op je NAS.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-2xl p-20 bg-muted/5 hover:bg-muted/10 transition-colors">
                      <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                      <FolderOpen className="w-16 h-16 text-primary/20 mb-6" />
                      <Button size="lg" className="px-12 font-bold text-lg" asChild>
                        <label htmlFor="file-scanner" className="cursor-pointer">Selecteer Map</label>
                      </Button>
                      <p className="mt-6 text-sm text-muted-foreground font-medium">Kies de hoofdmap van je portfolio.</p>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-border/10">
                      <div className="space-y-1">
                        <Label htmlFor="root-folder" className="text-lg font-bold">Mapnaam in link opnemen</Label>
                        <p className="text-sm text-muted-foreground">Gebruik dit als je de hoofdmap zelf hebt geselecteerd.</p>
                      </div>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </CardContent>
                </Card>

                {scannedFiles.length > 0 && (
                  <Card className="border-primary/20 shadow-lg bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <CheckCircle2 className="w-7 h-7 text-primary" /> 
                        2. Start Import
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="p-6 bg-background rounded-2xl border border-primary/10">
                        <p className="text-xl">Klaar om <strong className="text-primary">{scannedFiles.length}</strong> kunstwerken toe te voegen.</p>
                      </div>
                      
                      {loading ? (
                        <div className="space-y-4">
                          <div className="flex justify-between text-sm font-bold">
                            <span>Verwerken...</span>
                            <span>{currentUploadItem} / {finalArtworks.length}</span>
                          </div>
                          <Progress value={uploadProgress} className="h-4" />
                        </div>
                      ) : (
                        <Button onClick={handleSaveAll} className="w-full h-18 text-2xl font-bold shadow-xl" disabled={loading}>
                          Importeer nu
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-8">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-accent" /> Controle Link-opbouw
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {finalArtworks.length > 0 ? (
                      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar">
                        {finalArtworks.slice(0, 10).map((art, i) => (
                          <div key={i} className="p-4 bg-muted/10 rounded-xl border border-border/10">
                            <p className="font-bold text-sm mb-1">{art.title}</p>
                            <p className="font-mono text-[10px] text-muted-foreground break-all">{art.imageUrl}</p>
                          </div>
                        ))}
                        {finalArtworks.length > 10 && (
                          <p className="text-center text-xs text-muted-foreground italic">En nog {finalArtworks.length - 10} meer...</p>
                        )}
                      </div>
                    ) : (
                      <div className="py-20 text-center text-muted-foreground italic text-sm">
                        Geen map gescand om te controleren.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'db' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Mijn Collectie</h2>
                  <p className="text-muted-foreground text-lg">{artworks?.length || 0} kunstwerken in de database.</p>
                </div>
              </div>

              {dbLoading ? (
                <div className="flex justify-center py-40">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
              ) : artworks && artworks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {artworks.map((art: any) => (
                    <div key={art.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/30 shadow-sm hover:shadow-lg transition-all">
                      <Image 
                        src={art.imageUrl} 
                        alt={art.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                        unoptimized={true} 
                      />
                      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-sm font-bold w-full mb-4 line-clamp-2">{art.title}</span>
                        <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                          <Trash2 className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-border/30 py-40 rounded-3xl text-center bg-muted/5">
                  <Database className="w-20 h-20 mx-auto text-muted-foreground/10 mb-8" />
                  <p className="text-2xl font-bold text-muted-foreground">Geen kunstwerken gevonden.</p>
                  <Button variant="link" onClick={() => setActiveTab('scan')} className="mt-6 text-xl">Klik hier om te importeren</Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto">
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/10 pb-8">
                  <CardTitle className="text-3xl">NAS Configuratie</CardTitle>
                  <CardDescription className="text-lg">Zorg dat de website de afbeeldingen kan laden vanaf je Synology NAS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-12 p-10">
                  <div className="space-y-6">
                    <Label className="text-xl font-bold">Verbindingsmethode</Label>
                    <div className="grid grid-cols-2 gap-6">
                      <Button 
                        variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} 
                        className="h-16 font-bold text-lg rounded-2xl"
                        onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                      >Thuis Netwerk (IP)</Button>
                      <Button 
                        variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} 
                        className="h-16 font-bold text-lg rounded-2xl"
                        onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                      >QuickConnect</Button>
                    </div>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-16 text-sm bg-muted/5 border-border/30" />
                  </div>

                  <div className="space-y-6 p-10 bg-muted/10 rounded-3xl border border-border/10 shadow-inner">
                    <Label className="text-xl font-bold">Directe Bestandstest</Label>
                    <p className="text-muted-foreground mb-6">Typ een bestandsnaam (bijv. 1.jpg) om de directe link te controleren.</p>
                    <div className="flex gap-4">
                      <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="h-16 text-lg" />
                      <Button onClick={testConnection} className="h-16 px-12 font-bold text-lg" disabled={testResult === 'testing'}>
                        {testResult === 'testing' ? <Loader2 className="animate-spin h-7 w-7" /> : "Test Bestand"}
                      </Button>
                    </div>
                    
                    {testResult && (
                      <div className={cn(
                        "mt-8 p-6 rounded-2xl flex items-center gap-5 font-bold text-lg shadow-sm border",
                        testResult === 'success' ? "bg-green-500/10 text-green-700 border-green-200" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {testResult === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        <span>
                          {testResult === 'success' 
                            ? "Succes! Het bestand is bereikbaar." 
                            : "Fout! Controleer de NAS-rechten (http groep) of de SSL waarschuwing."}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
