"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
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
  ChevronLeft,
  ChevronRight,
  Monitor
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
  SidebarFooter,
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background/30 w-full overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-border/20">
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/10">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">T</div>
              <span className="font-headline text-xs font-bold tracking-tight whitespace-nowrap group-data-[collapsible=icon]:hidden">Studio Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest opacity-40 group-data-[collapsible=icon]:hidden">Navigatie</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeTab === 'scan'} 
                    onClick={() => setActiveTab('scan')}
                    tooltip="Scannen"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Scannen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeTab === 'import'} 
                    onClick={() => setActiveTab('import')}
                    tooltip={`Importeren (${scannedFiles.length})`}
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Importeren</span>
                    {scannedFiles.length > 0 && <span className="ml-auto text-[9px] bg-accent px-1.5 rounded-full text-white group-data-[collapsible=icon]:hidden">{scannedFiles.length}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeTab === 'db'} 
                    onClick={() => setActiveTab('db')}
                    tooltip="Archief"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Archief</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest opacity-40 group-data-[collapsible=icon]:hidden">Systeem</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={showSettings} 
                    onClick={() => setShowSettings(!showSettings)}
                    tooltip="NAS Instellingen"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Instellingen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={handleDeleteAll} 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    tooltip="Database Legen"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Legen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/10 flex items-center justify-between px-6 bg-background/40 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 opacity-40 hover:opacity-100" />
              <div className="h-4 w-[1px] bg-border/20" />
              <h1 className="text-xs uppercase tracking-[0.2em] font-medium opacity-60">
                {activeTab === 'scan' ? 'Bestanden Scannen' : activeTab === 'import' ? 'Data Importeren' : 'Collectie Archief'}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
              {showSettings && (
                <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Card className="border-none bg-secondary/10 rounded-2xl overflow-hidden shadow-none">
                    <CardHeader className="py-4">
                      <CardTitle className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 opacity-60">
                        <Wifi className="w-3 h-3" /> Verbinding Configuratie
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase tracking-tighter opacity-40">NAS Basis URL</Label>
                          <div className="flex gap-2">
                            <Button 
                              variant={nasBaseUrl === LOCAL_NAS_URL ? "secondary" : "ghost"} 
                              size="sm" 
                              onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                              className="flex-1 text-[9px] h-8"
                            >Lokaal</Button>
                            <Button 
                              variant={nasBaseUrl === EXTERNAL_NAS_URL ? "secondary" : "ghost"} 
                              size="sm" 
                              onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                              className="flex-1 text-[9px] h-8"
                            >Extern</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase tracking-tighter opacity-40">Test Bestand</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={testFileName} 
                              onChange={(e) => setTestFileName(e.target.value)}
                              placeholder="Testbestand (bijv. 1.jpg)"
                              className="bg-background/50 text-[10px] h-8 border-none"
                            />
                            <Button onClick={testConnection} size="sm" className="h-8 text-[9px] px-6">
                              {testResult === 'testing' ? <Loader2 className="animate-spin h-3 w-3" /> : "Test"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "text-[10px] flex items-center gap-2 p-2 rounded-lg border",
                          testResult === 'success' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-destructive/10 border-destructive/20 text-destructive"
                        )}>
                          {testResult === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                          {testResult === 'success' ? "Verbinding met NAS is succesvol." : "NAS onbereikbaar. Controleer IP en rechten."}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'scan' && (
                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="group border border-dashed border-border/40 rounded-[2.5rem] p-16 text-center bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
                      <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FolderOpen className="w-10 h-10 text-primary/30 mb-6" />
                      <div className="space-y-6 w-full max-w-[240px] relative z-10">
                        <div className="flex items-center justify-between px-2">
                          <Label htmlFor="root-folder" className="text-[9px] uppercase tracking-widest opacity-60">Mapnaam behouden</Label>
                          <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} className="scale-75" />
                        </div>
                        <Button variant="outline" className="rounded-full w-full border-border/40 text-[10px] uppercase tracking-widest h-12 shadow-sm" asChild>
                          <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-[2.5rem] p-10 border border-border/20">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold mb-6 opacity-30 flex items-center gap-2">
                      <Monitor className="w-3 h-3" /> Live Link Preview
                    </h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar text-[9px] font-mono leading-relaxed opacity-60">
                      {finalArtworks.length > 0 ? (
                        finalArtworks.slice(0, 8).map((art, i) => (
                          <div key={i} className="pb-3 border-b border-border/5">
                            <span className="text-accent/80 font-bold block mb-1">{art.title}</span>
                            <span className="break-all opacity-60">{art.imageUrl}</span>
                          </div>
                        ))
                      ) : (
                        <div className="italic py-12 text-center">Selecteer een lokale map om de link-generatie te controleren...</div>
                      )}
                      {finalArtworks.length > 8 && <div className="text-center pt-4 opacity-40 italic">+{finalArtworks.length - 8} meer items...</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="max-w-2xl mx-auto py-12">
                  <div className="bg-white/5 rounded-[3rem] p-16 text-center border border-border/20 shadow-sm">
                    {loading ? (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h3 className="font-headline text-3xl italic font-light">Processing...</h3>
                          <p className="text-[10px] uppercase tracking-widest opacity-40">Metadata wordt naar Firestore geschreven</p>
                        </div>
                        <div className="max-w-xs mx-auto space-y-3">
                          <Progress value={uploadProgress} className="h-1 bg-muted/20" />
                          <p className="text-[10px] font-mono opacity-60">{currentUploadItem} / {finalArtworks.length}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <h3 className="font-headline text-4xl font-light">Klaar voor import</h3>
                          <p className="text-muted-foreground text-sm max-w-xs mx-auto italic font-light">
                            {finalArtworks.length} geselecteerde werken zullen worden toegevoegd aan je online archief.
                          </p>
                        </div>
                        <Button onClick={handleSaveAll} className="rounded-full px-12 h-14 text-[11px] uppercase tracking-widest font-bold shadow-xl" disabled={finalArtworks.length === 0}>
                          Start Archivering
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'db' && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 animate-in fade-in duration-500">
                  {artworks?.map((art: any) => (
                    <div key={art.id} className="relative aspect-square rounded-xl overflow-hidden group bg-muted/10 border border-border/20">
                      <Image src={art.imageUrl} alt="" fill className="object-cover opacity-40 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:scale-100" unoptimized={true} />
                      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-transparent" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!artworks || artworks.length === 0) && (
                    <div className="col-span-full py-32 text-center opacity-20 italic">Geen items in archief</div>
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