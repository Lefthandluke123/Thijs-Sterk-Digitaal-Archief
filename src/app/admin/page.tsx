
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  ChevronLeft,
  ChevronRight
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

const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadItem, setCurrentUploadItem] = useState(0);
  const [activeTab, setActiveTab] = useState<'scan' | 'import' | 'db'>('scan');
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [testFileName, setTestFileName] = useState('1.jpg');
  const [includeRootFolder, setIncludeRootFolder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
        toast({ title: "Import afgerond", description: "De collectie is succesvol bijgewerkt." });
        setScannedFiles([]);
        setLoading(false);
        setActiveTab('db');
      }, 1500);
    } catch (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Fout bij importeren" });
    }
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    if (!confirm("Weet je zeker dat je de gehele database wilt legen? Dit kan niet ongedaan worden gemaakt.")) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Database geleegd" });
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
      <div className="flex min-h-screen bg-background w-full overflow-hidden font-body">
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="h-16 flex items-center px-6 border-b border-border/10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-primary flex-shrink-0 flex items-center justify-center text-xs text-white font-headline font-bold">T</div>
              <span className="font-headline font-bold text-sm tracking-tight group-data-[collapsible=icon]:hidden">Studio Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-6 text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 group-data-[collapsible=icon]:hidden">Collectie Beheer</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'scan'} onClick={() => setActiveTab('scan')} tooltip="Bestanden Scannen" className="px-6 h-10">
                    <Scan className="w-4 h-4" />
                    <span className="text-sm font-medium">Scannen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'import'} onClick={() => setActiveTab('import')} tooltip="Importeren naar Database" className="px-6 h-10">
                    <CloudUpload className="w-4 h-4" />
                    <span className="text-sm font-medium">Import</span>
                    {scannedFiles.length > 0 && <span className="ml-auto text-[10px] bg-accent/10 px-2 py-0.5 rounded-full text-accent font-bold group-data-[collapsible=icon]:hidden">{scannedFiles.length}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'db'} onClick={() => setActiveTab('db')} tooltip="Database Archief" className="px-6 h-10">
                    <Archive className="w-4 h-4" />
                    <span className="text-sm font-medium">Archief</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-8 border-t border-border/10 pt-4">
              <SidebarGroupLabel className="px-6 text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 group-data-[collapsible=icon]:hidden">Configuratie</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showSettings} onClick={() => setShowSettings(!showSettings)} tooltip="NAS Instellingen" className="px-6 h-10">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium">Instellingen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleDeleteAll} className="px-6 h-10 text-destructive/70 hover:text-destructive hover:bg-destructive/5" tooltip="Database Volledig Wissen">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Database Wissen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden">
          <header className="h-16 border-b border-border/10 flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground" />
              <div className="h-4 w-[1px] bg-border/20" />
              <h1 className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {activeTab === 'scan' ? 'Bestandsscanner' : activeTab === 'import' ? 'Data Overdracht' : 'Collectie Archief'}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16">
            <div className="max-w-5xl mx-auto">
              {showSettings && (
                <div className="mb-12">
                  <Card className="border-border/40 shadow-sm rounded-2xl">
                    <CardHeader className="border-b border-border/10 bg-muted/5">
                      <CardTitle className="text-sm font-bold flex items-center gap-3 opacity-70 uppercase tracking-widest">
                        <Wifi className="w-4 h-4" /> Netwerk Instellingen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-10">
                      <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">NAS Adres Selectie</Label>
                          <div className="flex gap-2 p-1.5 bg-muted/20 rounded-xl border border-border/10">
                            <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "secondary" : "ghost"} size="sm" onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="flex-1 text-xs h-9 rounded-lg">Lokaal IP</Button>
                            <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "secondary" : "ghost"} size="sm" onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="flex-1 text-xs h-9 rounded-lg">QuickConnect</Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verbindingstest</Label>
                          <div className="flex gap-2">
                            <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="bg-muted/5 text-sm h-10 border-border/20 rounded-xl" />
                            <Button onClick={testConnection} className="h-10 text-xs px-6 rounded-xl">
                              {testResult === 'testing' ? <Loader2 className="animate-spin h-4 w-4" /> : "Test Link"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "text-sm flex items-center gap-4 p-5 rounded-xl border transition-all",
                          testResult === 'success' ? "bg-green-500/5 border-green-500/20 text-green-700" : "bg-destructive/5 border-destructive/20 text-destructive"
                        )}>
                          {testResult === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                          <span className="font-medium">{testResult === 'success' ? "Verbinding geslaagd. De NAS is bereikbaar via dit adres." : "Verbinding mislukt. Controleer of de NAS aan staat en SSL is geforceerd."}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'scan' && (
                <div className="grid lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-7">
                    <div className="group border-2 border-dashed border-border/30 rounded-[2.5rem] p-16 text-center bg-muted/5 hover:bg-muted/10 transition-all duration-300 flex flex-col items-center justify-center min-h-[450px]">
                      <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                      <FolderOpen className="w-16 h-16 text-primary/10 mb-8 transition-transform group-hover:scale-105 duration-300" />
                      <div className="space-y-10 w-full max-w-xs">
                        <div className="flex items-center justify-between px-2">
                          <Label htmlFor="root-folder" className="text-sm font-medium text-muted-foreground">Volledig pad behouden</Label>
                          <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                        </div>
                        <Button className="rounded-full w-full h-14 text-sm font-bold uppercase tracking-widest shadow-lg" asChild>
                          <label htmlFor="file-scanner" className="cursor-pointer">Selecteer Lokale Map</label>
                        </Button>
                        <p className="text-xs text-muted-foreground/60 leading-relaxed px-4">
                          Selecteer de map op je computer die overeenkomt met de map op je NAS voor automatische link-generatie.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-muted/5 rounded-[2.5rem] p-10 border border-border/10 h-fit">
                    <div className="flex items-center gap-3 mb-8">
                      <Monitor className="w-4 h-4 text-accent" />
                      <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Paden Preview</h3>
                    </div>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                      {finalArtworks.length > 0 ? (
                        finalArtworks.slice(0, 15).map((art, i) => (
                          <div key={i} className="pb-4 border-b border-border/5">
                            <span className="text-xs font-bold block mb-1 text-foreground/80">{art.title}</span>
                            <span className="text-[10px] font-mono break-all text-muted-foreground leading-relaxed">{art.imageUrl}</span>
                          </div>
                        ))
                      ) : (
                        <div className="italic py-20 text-center text-sm text-muted-foreground/40">Selecteer een map om de gegenereerde links hier te valideren.</div>
                      )}
                      {finalArtworks.length > 15 && <div className="text-center pt-6 text-[10px] text-muted-foreground font-bold tracking-widest">EN {finalArtworks.length - 15} MEER...</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="max-w-2xl mx-auto py-12">
                  <div className="bg-muted/5 rounded-[3rem] p-20 text-center border border-border/20 shadow-xl">
                    {loading ? (
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <h3 className="font-headline text-4xl font-light italic tracking-tight">Data Synchronisatie</h3>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Metadata naar Firestore schrijven...</p>
                        </div>
                        <div className="max-w-[300px] mx-auto space-y-6">
                          <Progress value={uploadProgress} className="h-1.5" />
                          <p className="text-sm font-bold font-mono tracking-widest text-primary">{currentUploadItem} <span className="text-muted-foreground">/</span> {finalArtworks.length}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <h3 className="font-headline text-5xl font-light tracking-tight">Klaar voor Import</h3>
                          <p className="text-muted-foreground text-sm max-w-[350px] mx-auto leading-relaxed">
                            Er zijn <strong>{finalArtworks.length}</strong> werken gedetecteerd die klaar staan om in het online archief te worden opgenomen.
                          </p>
                        </div>
                        <div className="flex flex-col gap-4">
                          <Button onClick={handleSaveAll} className="rounded-full px-12 h-16 text-xs uppercase tracking-[0.2em] font-bold shadow-xl transition-all hover:scale-[1.02]" disabled={finalArtworks.length === 0}>
                            Start Synchronisatie
                          </Button>
                          <Button variant="ghost" onClick={() => setActiveTab('scan')} className="text-xs text-muted-foreground">Terug naar selectie</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'db' && (
                <div className="space-y-12">
                  <div className="flex items-center justify-between border-b border-border/10 pb-8">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Actueel Archief</h3>
                      <p className="text-sm text-muted-foreground/60">{artworks?.length || 0} werken geregistreerd</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(nasBaseUrl, '_blank')} className="text-[10px] font-bold uppercase tracking-widest gap-3 rounded-full h-10 px-6 border-border/40 hover:bg-muted/30">
                      <Wifi className="w-4 h-4 text-accent" /> Herstel Verbinding
                    </Button>
                  </div>
                  
                  {dbLoading ? (
                    <div className="flex justify-center py-40">
                      <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
                    </div>
                  ) : artworks && artworks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                      {artworks.map((art: any) => (
                        <div key={art.id} className="relative aspect-square rounded-2xl overflow-hidden group bg-muted/20 border border-border/10 shadow-sm">
                          <Image 
                            src={art.imageUrl} 
                            alt={art.title} 
                            fill 
                            className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 scale-[1.02] group-hover:scale-100" 
                            unoptimized={true} 
                          />
                          <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-tight truncate w-full mb-3 text-foreground/80">{art.title}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-40 text-center text-muted-foreground/40 italic font-light tracking-widest text-lg">Het digitale archief is momenteel leeg.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
