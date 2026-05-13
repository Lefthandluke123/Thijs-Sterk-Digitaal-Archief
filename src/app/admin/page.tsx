
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FolderOpen, 
  Trash2, 
  CheckCircle2, 
  Settings, 
  Archive, 
  Scan, 
  AlertCircle,
  Database,
  ExternalLink
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
    <div className="min-h-screen bg-background flex flex-col pt-14">
      {/* Navigatiebalk bovenin */}
      <header className="h-16 border-b border-border/10 flex items-center justify-between px-8 bg-background sticky top-14 z-40">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-xl group-hover:scale-105 transition-transform">T</div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hidden md:block">Studio Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Button 
              variant={activeTab === 'scan' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-6 h-10 rounded-full", activeTab === 'scan' && "font-bold")}
              onClick={() => setActiveTab('scan')}
            >
              <Scan className="w-4 h-4" /> Importeer
            </Button>
            <Button 
              variant={activeTab === 'db' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-6 h-10 rounded-full", activeTab === 'db' && "font-bold")}
              onClick={() => setActiveTab('db')}
            >
              <Archive className="w-4 h-4" /> Collectie
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
              className={cn("gap-2 px-6 h-10 rounded-full", activeTab === 'settings' && "font-bold")}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4" /> NAS Setup
            </Button>
          </nav>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleDeleteAll} 
          className="text-destructive h-10 w-10 hover:bg-destructive/10 rounded-full"
          title="Database Wissen"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-16 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'scan' && (
            <div className="space-y-12">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-[2.5rem] p-24 bg-muted/5 hover:bg-muted/10 transition-colors">
                <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                <FolderOpen className="w-20 h-20 text-primary/10 mb-8" />
                <Button size="lg" className="px-16 h-14 rounded-full font-bold text-lg" asChild>
                  <label htmlFor="file-scanner" className="cursor-pointer">Selecteer Lokale Map</label>
                </Button>
                <p className="mt-8 text-sm text-muted-foreground font-medium uppercase tracking-widest text-center">
                  Kies de map op je computer die overeenkomt met je NAS structuur.
                </p>
              </div>

              <div className="flex items-center justify-between p-8 bg-muted/10 rounded-3xl border border-border/10">
                <div className="space-y-1">
                  <Label htmlFor="root-folder" className="text-xl font-bold">Inclusief hoofdmap</Label>
                  <p className="text-sm text-muted-foreground">Zet aan als de mapnaam zelf onderdeel moet zijn van de URL.</p>
                </div>
                <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
              </div>

              {scannedFiles.length > 0 && (
                <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-10 pb-4">
                    <CardTitle className="flex items-center gap-4 text-3xl font-light">
                      <CheckCircle2 className="w-8 h-8 text-primary" /> 
                      Klaar voor Import
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 pt-4 space-y-10">
                    <p className="text-2xl text-foreground/80"><strong className="text-primary font-bold">{scannedFiles.length}</strong> kunstwerken gedetecteerd.</p>
                    {loading ? (
                      <div className="space-y-6">
                        <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
                          <span>Verwerken...</span>
                          <span>{currentUploadItem} / {finalArtworks.length}</span>
                        </div>
                        <Progress value={uploadProgress} className="h-6 rounded-full" />
                      </div>
                    ) : (
                      <Button onClick={handleSaveAll} className="w-full h-20 text-2xl font-bold rounded-2xl shadow-xl hover:scale-[1.01] transition-transform">
                        Start Importeren
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'db' && (
            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-border/10 pb-8">
                <div>
                  <h2 className="text-4xl font-headline font-light tracking-tight">Mijn Collectie</h2>
                  <p className="text-muted-foreground mt-2 uppercase tracking-widest text-[11px] font-bold">{artworks?.length || 0} Werken in Archief</p>
                </div>
                <Button variant="outline" className="gap-2 rounded-full h-12 px-8 border-border/30" onClick={() => window.open(nasBaseUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4" /> Herstel Verbinding
                </Button>
              </div>

              {dbLoading ? (
                <div className="flex justify-center py-40">
                  <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
                </div>
              ) : artworks && artworks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {artworks.map((art: any) => (
                    <div key={art.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/20 shadow-sm hover:shadow-2xl transition-all duration-500">
                      <Image 
                        src={art.imageUrl} 
                        alt={art.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                        unoptimized={true} 
                      />
                      <div className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-xs font-bold w-full mb-6 uppercase tracking-wider line-clamp-2">{art.title}</span>
                        <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-border/20 py-48 rounded-[3rem] text-center bg-muted/5">
                  <Database className="w-24 h-24 mx-auto text-muted-foreground/10 mb-8" />
                  <p className="text-2xl font-light text-muted-foreground">Geen kunstwerken gevonden in de database.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-12">
              <Card className="border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/50">
                <CardHeader className="bg-muted/10 border-b border-border/10 p-12">
                  <CardTitle className="text-4xl font-headline font-light">NAS Configuratie</CardTitle>
                  <CardDescription className="text-lg">Stel in hoe de website verbinding maakt met je Synology NAS.</CardDescription>
                </CardHeader>
                <CardContent className="p-12 space-y-16">
                  <div className="space-y-8">
                    <Label className="text-xl font-bold uppercase tracking-widest text-primary">Verbindingsmethode</Label>
                    <div className="grid grid-cols-2 gap-6">
                      <Button 
                        variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} 
                        className="h-20 font-bold text-lg rounded-2xl border-2"
                        onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                      >Thuis Netwerk</Button>
                      <Button 
                        variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} 
                        className="h-20 font-bold text-lg rounded-2xl border-2"
                        onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                      >QuickConnect</Button>
                    </div>
                    <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-16 text-sm bg-background border-border/20 rounded-xl px-6" />
                  </div>

                  <div className="space-y-8 p-12 bg-primary/5 rounded-[2rem] border border-primary/10">
                    <Label className="text-xl font-bold uppercase tracking-widest text-primary">Status Tester</Label>
                    <div className="flex gap-4">
                      <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="h-16 text-lg rounded-xl px-6" />
                      <Button onClick={testConnection} className="h-16 px-12 font-bold text-lg rounded-xl" disabled={testResult === 'testing'}>
                        {testResult === 'testing' ? <Loader2 className="animate-spin h-7 w-7" /> : "Test Verbinding"}
                      </Button>
                    </div>
                    
                    {testResult && (
                      <div className={cn(
                        "mt-10 p-8 rounded-2xl flex items-center gap-6 font-bold text-xl shadow-xl border-2",
                        testResult === 'success' ? "bg-green-500/10 text-green-700 border-green-200" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {testResult === 'success' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                        <div className="flex flex-col">
                          <span>{testResult === 'success' ? "NAS Bereikbaar!" : "Verbinding Mislukt"}</span>
                          <span className="text-sm font-medium opacity-70">{testResult === 'success' ? "Je afbeeldingen laden nu correct." : "Controleer of je NAS aan staat en poorten open staan."}</span>
                        </div>
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
