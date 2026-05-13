
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
  Info, 
  Archive, 
  Scan, 
  CloudUpload,
  Monitor,
  ExternalLink,
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    if (!confirm("LET OP: Weet je zeker dat je de gehele database wilt legen? Dit kan niet ongedaan worden gemaakt.")) return;
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background w-full">
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold">T</div>
              <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">Studio Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Beheer</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'scan'} onClick={() => setActiveTab('scan')} tooltip="Bestanden Scannen">
                    <Scan className="w-5 h-5" />
                    <span className="text-base">Nieuwe Import</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'db'} onClick={() => setActiveTab('db')} tooltip="Database Archief">
                    <Archive className="w-5 h-5" />
                    <span className="text-base">Mijn Collectie</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} tooltip="Instellingen">
                    <Settings className="w-5 h-5" />
                    <span className="text-base">NAS Instellingen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarGroup className="mt-auto pb-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleDeleteAll} className="text-destructive hover:text-destructive hover:bg-destructive/5" tooltip="Database Wissen">
                    <Trash2 className="w-5 h-5" />
                    <span className="text-base">Database Wissen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <header className="h-16 border-b border-border/10 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-6 w-[1px] bg-border/20" />
              <h1 className="text-xl font-bold">
                {activeTab === 'scan' ? 'Bestanden Scannen' : activeTab === 'db' ? 'Collectie Overzicht' : 'Instellingen'}
              </h1>
            </div>
            {activeTab === 'db' && (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => window.open(nasBaseUrl, '_blank')} className="gap-2 font-semibold">
                  <Wifi className="w-4 h-4 text-accent" /> Herstel NAS Verbinding
                </Button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {activeTab === 'scan' && (
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle>Stap 1: Map Selecteren</CardTitle>
                        <CardDescription>Selecteer de map op je computer die overeenkomt met de map op je NAS.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 bg-muted/5">
                          <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                          <FolderOpen className="w-12 h-12 text-primary/40 mb-4" />
                          <Button size="lg" className="px-8 font-bold" asChild>
                            <label htmlFor="file-scanner" className="cursor-pointer">Kies Lokale Map</label>
                          </Button>
                          <p className="mt-4 text-sm text-muted-foreground">Selecteer de map 'portfolio' of een submap daarvan.</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor="root-folder" className="text-base">Mapnaam in link opnemen</Label>
                            <p className="text-sm text-muted-foreground">Zet dit uit als de foto's direct in de hoofdmap van je NAS staan.</p>
                          </div>
                          <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                        </div>
                      </CardContent>
                    </Card>

                    {scannedFiles.length > 0 && (
                      <Card className="border-border shadow-md bg-primary/5">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-primary" /> 
                            Stap 2: Import Bevestigen
                          </CardTitle>
                          <CardDescription>Controleer de gegevens en start de synchronisatie naar de website.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="p-4 bg-background rounded-lg border border-primary/20">
                            <p className="text-lg">Er staan <strong>{scannedFiles.length}</strong> kunstwerken klaar.</p>
                          </div>
                          
                          {loading ? (
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm font-bold">
                                <span>Bezig met importeren...</span>
                                <span>{currentUploadItem} / {finalArtworks.length}</span>
                              </div>
                              <Progress value={uploadProgress} className="h-3" />
                            </div>
                          ) : (
                            <Button onClick={handleSaveAll} className="w-full h-14 text-lg font-bold shadow-lg" disabled={loading}>
                              Start Import naar Website
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Monitor className="w-4 h-4" /> Link Preview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {finalArtworks.length > 0 ? (
                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {finalArtworks.slice(0, 10).map((art, i) => (
                              <div key={i} className="p-3 bg-muted/10 rounded border border-border/10 text-xs">
                                <p className="font-bold text-foreground mb-1">{art.title}</p>
                                <p className="font-mono text-muted-foreground break-all">{art.imageUrl}</p>
                              </div>
                            ))}
                            {finalArtworks.length > 10 && <p className="text-center text-xs font-bold py-2">... en {finalArtworks.length - 10} anderen</p>}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-muted-foreground italic">
                            Scan eerst een map om de links te controleren.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'db' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Mijn Collectie</h2>
                      <p className="text-muted-foreground">{artworks?.length || 0} kunstwerken in de database.</p>
                    </div>
                  </div>

                  {dbLoading ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                  ) : artworks && artworks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {artworks.map((art: any) => (
                        <div key={art.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border shadow-sm">
                          <Image 
                            src={art.imageUrl} 
                            alt={art.title} 
                            fill 
                            className="object-cover" 
                            unoptimized={true} 
                          />
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-center">
                            <span className="text-sm font-bold truncate w-full mb-2">{art.title}</span>
                            <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed border-2 py-20 text-center">
                      <CardContent>
                        <Database className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-xl font-medium text-muted-foreground">Geen kunstwerken gevonden.</p>
                        <Button variant="link" onClick={() => setActiveTab('scan')}>Begin met scannen</Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <Card className="max-w-2xl mx-auto border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>NAS Configuratie</CardTitle>
                    <CardDescription>Stel in waar de afbeeldingen vandaan moeten komen.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-base font-bold">NAS Basis Adres</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} 
                          className="h-12 font-bold"
                          onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                        >Lokaal Adres (IP)</Button>
                        <Button 
                          variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} 
                          className="h-12 font-bold"
                          onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                        >QuickConnect</Button>
                      </div>
                      <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-12" />
                    </div>

                    <div className="space-y-4 p-6 bg-muted/10 rounded-xl border border-border">
                      <Label className="text-base font-bold">Verbindingstest</Label>
                      <div className="flex gap-4">
                        <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="h-12" />
                        <Button onClick={testConnection} className="h-12 px-8 font-bold">
                          {testResult === 'testing' ? <Loader2 className="animate-spin h-5 w-5" /> : "Test Bestand"}
                        </Button>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "mt-4 p-4 rounded-lg flex items-center gap-3 font-medium",
                          testResult === 'success' ? "bg-green-500/10 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}>
                          {testResult === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          <span>
                            {testResult === 'success' 
                              ? "Verbinding geslaagd! De NAS is bereikbaar." 
                              : "Verbinding mislukt. Zorg dat je bent ingelogd op de NAS in een ander tabblad."}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
