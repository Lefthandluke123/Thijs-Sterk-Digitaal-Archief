
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
  AlertCircle
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
    if (!confirm("Collectie volledig legen?")) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'artworks'));
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Collectie geleegd" });
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
      <div className="flex min-h-screen bg-background/30 w-full overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-border/10">
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-5 h-5 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">T</div>
              <span className="font-headline text-[10px] font-bold tracking-widest whitespace-nowrap group-data-[collapsible=icon]:hidden">Studio Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[8px] uppercase tracking-[0.2em] opacity-30 group-data-[collapsible=icon]:hidden">Collectie</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'scan'} onClick={() => setActiveTab('scan')} tooltip="Scannen">
                    <Scan className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] tracking-wider uppercase font-medium">Scannen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'import'} onClick={() => setActiveTab('import')} tooltip="Importeren">
                    <CloudUpload className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] tracking-wider uppercase font-medium">Import</span>
                    {scannedFiles.length > 0 && <span className="ml-auto text-[8px] bg-accent/20 px-1 rounded text-accent group-data-[collapsible=icon]:hidden">{scannedFiles.length}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === 'db'} onClick={() => setActiveTab('db')} tooltip="Archief">
                    <Archive className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] tracking-wider uppercase font-medium">Archief</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="text-[8px] uppercase tracking-[0.2em] opacity-30 group-data-[collapsible=icon]:hidden">Beheer</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showSettings} onClick={() => setShowSettings(!showSettings)} tooltip="NAS Instellingen">
                    <Settings className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] tracking-wider uppercase font-medium">Instellingen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleDeleteAll} className="text-destructive/60 hover:text-destructive" tooltip="Database Legen">
                    <Trash2 className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-[10px] tracking-wider uppercase font-medium">Database Legen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background/50">
          <header className="h-14 border-b border-border/5 flex items-center justify-between px-6 bg-background/20 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 opacity-30 hover:opacity-100" />
              <div className="h-3 w-[1px] bg-border/20" />
              <h1 className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-40">
                {activeTab === 'scan' ? 'Local Scan' : activeTab === 'import' ? 'Data Migration' : 'Studio Archive'}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-16">
            <div className="max-w-6xl mx-auto">
              {showSettings && (
                <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Card className="border border-border/10 bg-secondary/5 rounded-3xl overflow-hidden shadow-none">
                    <CardHeader className="py-6 px-8 border-b border-border/5">
                      <CardTitle className="text-[9px] uppercase tracking-[0.2em] font-bold flex items-center gap-3 opacity-40">
                        <Wifi className="w-3.5 h-3.5" /> Network Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[8px] uppercase tracking-widest opacity-40">NAS Interface</Label>
                          <div className="flex gap-2 p-1 bg-background/40 rounded-full border border-border/5">
                            <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "secondary" : "ghost"} size="sm" onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="flex-1 text-[9px] h-8 rounded-full">Lokaal</Button>
                            <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "secondary" : "ghost"} size="sm" onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="flex-1 text-[9px] h-8 rounded-full">Extern</Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[8px] uppercase tracking-widest opacity-40">Connection Tester</Label>
                          <div className="flex gap-2">
                            <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="bg-background/40 text-[10px] h-9 border-none rounded-xl" />
                            <Button onClick={testConnection} size="sm" className="h-9 text-[9px] px-8 rounded-xl">
                              {testResult === 'testing' ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "Test"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "text-[9px] flex items-center gap-3 p-4 rounded-2xl border animate-in zoom-in-95 duration-200",
                          testResult === 'success' ? "bg-green-500/5 border-green-500/10 text-green-600/70" : "bg-destructive/5 border-destructive/10 text-destructive/70"
                        )}>
                          {testResult === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                          <span className="tracking-wide uppercase font-medium">{testResult === 'success' ? "Handshake succesvol. NAS is bereikbaar." : "Verbinding mislukt. Controleer IP of forceer SSL."}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'scan' && (
                <div className="grid lg:grid-cols-12 gap-16">
                  <div className="lg:col-span-7">
                    <div className="group border border-dashed border-border/20 rounded-[3rem] p-24 text-center bg-white/5 hover:bg-white/10 transition-all duration-500 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                      <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                      <FolderOpen className="w-12 h-12 text-primary/20 mb-8 transition-transform group-hover:scale-110 duration-500" />
                      <div className="space-y-8 w-full max-w-[280px] relative z-10">
                        <div className="flex items-center justify-between px-4">
                          <Label htmlFor="root-folder" className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Pad behouden</Label>
                          <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} className="scale-75" />
                        </div>
                        <Button variant="outline" className="rounded-full w-full border-border/10 text-[9px] uppercase tracking-widest h-14 shadow-none hover:bg-background/80" asChild>
                          <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white/5 rounded-[3rem] p-12 border border-border/5">
                    <h3 className="text-[9px] uppercase tracking-[0.2em] font-bold mb-8 opacity-30 flex items-center gap-3">
                      <Monitor className="w-3.5 h-3.5" /> Live Path Logic
                    </h3>
                    <div className="space-y-5 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar text-[9px] font-mono leading-relaxed opacity-40">
                      {finalArtworks.length > 0 ? (
                        finalArtworks.slice(0, 10).map((art, i) => (
                          <div key={i} className="pb-4 border-b border-border/5 group">
                            <span className="text-accent/60 font-bold block mb-1.5 transition-colors group-hover:text-accent">{art.title}</span>
                            <span className="break-all leading-normal">{art.imageUrl}</span>
                          </div>
                        ))
                      ) : (
                        <div className="italic py-20 text-center text-[10px] tracking-wide">Selecteer een lokale bronmap om de pad-generatie te valideren...</div>
                      )}
                      {finalArtworks.length > 10 && <div className="text-center pt-6 opacity-30 italic">+{finalArtworks.length - 10} more entries...</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="max-w-2xl mx-auto py-20">
                  <div className="bg-white/5 rounded-[4rem] p-24 text-center border border-border/10 shadow-none">
                    {loading ? (
                      <div className="space-y-12">
                        <div className="space-y-3">
                          <h3 className="font-headline text-4xl italic font-light tracking-tight">Archiving...</h3>
                          <p className="text-[9px] uppercase tracking-[0.3em] opacity-40">Writing metadata to firestore</p>
                        </div>
                        <div className="max-w-[240px] mx-auto space-y-4">
                          <Progress value={uploadProgress} className="h-1 bg-muted/10" />
                          <p className="text-[9px] font-mono opacity-40 tracking-widest">{currentUploadItem} / {finalArtworks.length}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div className="space-y-4">
                          <h3 className="font-headline text-5xl font-light tracking-tight">Klaar voor overdracht</h3>
                          <p className="text-muted-foreground text-[13px] max-w-[320px] mx-auto leading-relaxed font-light italic">
                            {finalArtworks.length} geselecteerde werken worden nu opgenomen in het online archief.
                          </p>
                        </div>
                        <Button onClick={handleSaveAll} className="rounded-full px-16 h-16 text-[10px] uppercase tracking-widest font-bold shadow-none" disabled={finalArtworks.length === 0}>
                          Start Sync
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'db' && (
                <div className="space-y-10 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between border-b border-border/5 pb-6">
                    <h3 className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-30">Database Archive</h3>
                    <div className="flex gap-4">
                      <Button variant="ghost" size="sm" onClick={() => window.open(nasBaseUrl, '_blank')} className="text-[9px] uppercase tracking-widest gap-2 opacity-50 hover:opacity-100">
                        <Wifi className="w-3 h-3" /> Herstel Verbinding
                      </Button>
                    </div>
                  </div>
                  
                  {dbLoading ? (
                    <div className="flex justify-center py-32">
                      <Loader2 className="w-6 h-6 animate-spin text-primary/10" />
                    </div>
                  ) : artworks && artworks.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                      {artworks.map((art: any) => (
                        <div key={art.id} className="relative aspect-square rounded-2xl overflow-hidden group bg-secondary/5 border border-border/5">
                          <Image 
                            src={art.imageUrl} 
                            alt={art.title} 
                            fill 
                            className="object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 scale-[1.05] group-hover:scale-100" 
                            unoptimized={true} 
                          />
                          <div className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center">
                            <span className="text-[8px] font-bold uppercase truncate w-full mb-2 opacity-60 tracking-tighter">{art.title}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-transparent" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="absolute top-1 right-1 pointer-events-none opacity-0 group-hover:opacity-0 group-data-[error=true]:opacity-100">
                            <AlertCircle className="w-3 h-3 text-destructive" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-40 text-center opacity-20 italic font-light tracking-widest text-sm">Het archief is momenteel leeg.</div>
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
