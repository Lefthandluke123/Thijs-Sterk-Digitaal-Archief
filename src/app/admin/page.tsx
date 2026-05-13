
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, FolderOpen, Trash2, Database, Wifi, CheckCircle2, Settings, ChevronRight, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [showSettings, setShowSettings] = useState(false);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks } = useCollection(artworksQuery);

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
      let detectedSeries = 'Serie';
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
      toast({ title: "Bijgewerkt", description: "De collectie is geactualiseerd." });
      setScannedFiles([]);
      setLoading(false);
      setActiveTab('db');
    }, 1000);
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("Collectie legen?")) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Collectie geleegd" });
    } catch (err) {
      toast({ variant: "destructive", title: "Fout" });
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
    <main className="min-h-screen bg-background/30 pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-light tracking-tight">Collectie Beheer</h1>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
              {artworks?.length || 0} gearchiveerde werken
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="rounded-full">
              <Settings className="w-4 h-4 opacity-50" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteAll} disabled={loading} className="rounded-full text-[9px] uppercase tracking-widest px-4 border-muted">
              Legen
            </Button>
          </div>
        </header>

        <Collapsible open={showSettings} onOpenChange={setShowSettings} className="mb-8">
          <CollapsibleContent>
            <Card className="border-none shadow-none bg-secondary/20 rounded-2xl overflow-hidden mb-8">
              <CardHeader className="py-4">
                <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                  <Wifi className="w-3 h-3" /> Verbinding Instellingen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    variant={nasBaseUrl === LOCAL_NAS_URL ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                    className="flex-1 text-[9px]"
                  >Lokaal</Button>
                  <Button 
                    variant={nasBaseUrl === EXTERNAL_NAS_URL ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                    className="flex-1 text-[9px]"
                  >Extern</Button>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={testFileName} 
                    onChange={(e) => setTestFileName(e.target.value)}
                    placeholder="Testbestand (bijv. 1.jpg)"
                    className="bg-background/50 text-[10px] h-8"
                  />
                  <Button onClick={testConnection} size="sm" className="h-8 text-[9px]">
                    {testResult === 'testing' ? <Loader2 className="animate-spin h-3 w-3" /> : "Test"}
                  </Button>
                </div>
                {testResult === 'success' && <div className="text-[10px] text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> Verbinding geslaagd</div>}
                {testResult === 'error' && <div className="text-[10px] text-destructive flex items-center gap-1 font-medium"><Info className="w-3 h-3" /> Controleer de NAS rechten</div>}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-border/40 w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger value="scan" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent text-[10px] uppercase tracking-widest pb-3 px-6 h-auto">1. Scannen</TabsTrigger>
            <TabsTrigger value="import" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent text-[10px] uppercase tracking-widest pb-3 px-6 h-auto">2. Importeren ({scannedFiles.length})</TabsTrigger>
            <TabsTrigger value="db" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent text-[10px] uppercase tracking-widest pb-3 px-6 h-auto">3. Archief</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2">
                <div className="border border-dashed border-muted-foreground/30 rounded-3xl p-10 text-center bg-white/5 flex flex-col items-center justify-center min-h-[240px]">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-8 h-8 text-muted-foreground/40 mb-4" />
                  <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2">
                      <Label htmlFor="root-folder" className="text-[9px] uppercase tracking-widest opacity-60">Mapnaam behouden</Label>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                    <Button variant="outline" className="rounded-full w-full border-muted-foreground/20 text-[10px] uppercase tracking-widest h-10" asChild>
                      <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="bg-white/5 rounded-3xl p-6 border border-border/30 h-full">
                  <h3 className="text-[9px] uppercase tracking-widest font-bold mb-4 opacity-40">Preview Links</h3>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 text-[9px] font-mono text-muted-foreground">
                    {finalArtworks.length > 0 ? (
                      finalArtworks.slice(0, 5).map((art, i) => (
                        <div key={i} className="pb-1 border-b border-border/10 truncate">
                          <span className="text-accent">{art.title}</span> &rarr; {art.imageUrl}
                        </div>
                      ))
                    ) : (
                      <div className="italic">Kies een map om de links te controleren...</div>
                    )}
                    {finalArtworks.length > 5 && <div className="text-center pt-2">+{finalArtworks.length - 5} meer</div>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-none bg-white/5 rounded-3xl p-12 text-center">
              {loading ? (
                <div className="space-y-6">
                  <h3 className="font-headline text-xl italic">Wordt verwerkt...</h3>
                  <div className="max-w-xs mx-auto space-y-2">
                    <Progress value={uploadProgress} className="h-1 bg-muted/20" />
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{currentUploadItem} / {finalArtworks.length}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="font-headline text-2xl">Bijna klaar</h3>
                  <p className="text-muted-foreground text-xs max-w-xs mx-auto italic">
                    {finalArtworks.length} werken worden toegevoegd aan je online portfolio.
                  </p>
                  <Button onClick={handleSaveAll} className="rounded-full px-12 h-12 text-[10px] uppercase tracking-widest font-bold" disabled={finalArtworks.length === 0}>
                    Toevoegen aan Archief
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="db">
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {artworks?.map((art: any) => (
                <div key={art.id} className="relative aspect-square rounded-lg overflow-hidden group bg-muted/10 border border-border/30">
                  <Image src={art.imageUrl} alt="" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" unoptimized={true} />
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                      <Trash2 className="h-3.3 w-3.3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
