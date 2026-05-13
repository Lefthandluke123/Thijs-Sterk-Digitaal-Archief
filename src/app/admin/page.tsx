
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
  Database,
  Menu
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from '@/lib/utils';

const LOCAL_NAS_URL = 'https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/';
const EXTERNAL_NAS_URL = 'https://doggyfew.quickconnect.to/portfolio/';

// Subcomponent om useSidebar hook te kunnen gebruiken
function AdminInnerContent() {
  const { toggleSidebar, state } = useSidebar();
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
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar collapsible="icon" className="border-r border-border/20">
        <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/10">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shrink-0">T</div>
        </SidebarHeader>
        <SidebarContent className="pt-4">
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'scan'} 
                  onClick={() => setActiveTab('scan')} 
                  tooltip="Nieuwe Import"
                  className="h-12"
                >
                  <Scan className="w-5 h-5" />
                  <span className="ml-3 font-medium">Nieuwe Import</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'db'} 
                  onClick={() => setActiveTab('db')} 
                  tooltip="Mijn Collectie"
                  className="h-12"
                >
                  <Archive className="w-5 h-5" />
                  <span className="ml-3 font-medium">Mijn Collectie</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === 'settings'} 
                  onClick={() => setActiveTab('settings')} 
                  tooltip="NAS Instellingen"
                  className="h-12"
                >
                  <Settings className="w-5 h-5" />
                  <span className="ml-3 font-medium">Instellingen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
          <SidebarGroup className="mt-auto pb-6">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleDeleteAll} 
                  className="text-destructive h-12 hover:bg-destructive/5" 
                  tooltip="Database Wissen"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="ml-3 font-medium">Wissen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0 bg-background transition-all duration-300">
        <header className="h-16 border-b border-border/10 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className="h-10 w-10 hover:bg-secondary flex items-center justify-center"
              title="Menu in/uitklappen"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">
              {activeTab === 'scan' ? 'Nieuwe Import' : activeTab === 'db' ? 'Collectie Overzicht' : 'Instellingen'}
            </h1>
          </div>
          {activeTab === 'db' && (
            <Button variant="outline" size="sm" onClick={() => window.open(nasBaseUrl, '_blank')} className="gap-2 font-bold">
              <Wifi className="w-4 h-4 text-accent" /> Herstel NAS
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto space-y-10">
            
            {activeTab === 'scan' && (
              <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-xl">1. Map Scannen</CardTitle>
                      <CardDescription>Kies de map op je computer die overeenkomt met de map op je NAS.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl p-16 bg-muted/5 hover:bg-muted/10 transition-colors">
                        <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                        <FolderOpen className="w-14 h-14 text-primary/30 mb-6" />
                        <Button size="lg" className="px-10 font-bold text-base" asChild>
                          <label htmlFor="file-scanner" className="cursor-pointer">Selecteer Map</label>
                        </Button>
                        <p className="mt-6 text-sm text-muted-foreground font-medium">Kies de map 'portfolio' of een submap.</p>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-muted/20 rounded-xl border border-border/10">
                        <div className="space-y-1">
                          <Label htmlFor="root-folder" className="text-base font-bold">Mapnaam in link opnemen</Label>
                          <p className="text-sm text-muted-foreground">Vink dit aan als je de map 'portfolio' zelf hebt geselecteerd.</p>
                        </div>
                        <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                      </div>
                    </CardContent>
                  </Card>

                  {scannedFiles.length > 0 && (
                    <Card className="border-primary/20 shadow-md bg-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <CheckCircle2 className="w-6 h-6 text-primary" /> 
                          2. Import Starten
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-5 bg-background rounded-xl border border-primary/10">
                          <p className="text-lg">Er staan <strong className="text-primary">{scannedFiles.length}</strong> schilderijen klaar voor import.</p>
                        </div>
                        
                        {loading ? (
                          <div className="space-y-4">
                            <div className="flex justify-between text-sm font-bold">
                              <span>Bezig met verwerken...</span>
                              <span>{currentUploadItem} / {finalArtworks.length}</span>
                            </div>
                            <Progress value={uploadProgress} className="h-3" />
                          </div>
                        ) : (
                          <Button onClick={handleSaveAll} className="w-full h-16 text-xl font-bold shadow-lg" disabled={loading}>
                            Toevoegen aan Website
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-8">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-accent" /> Link Controle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {finalArtworks.length > 0 ? (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {finalArtworks.slice(0, 15).map((art, i) => (
                            <div key={i} className="p-4 bg-muted/10 rounded-lg border border-border/10">
                              <p className="font-bold text-sm mb-1">{art.title}</p>
                              <p className="font-mono text-[10px] text-muted-foreground break-all">{art.imageUrl}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-16 text-center text-muted-foreground italic text-sm">
                          Scan eerst een map om de links te controleren.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'db' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Mijn Collectie</h2>
                    <p className="text-muted-foreground font-medium">{artworks?.length || 0} kunstwerken in de database.</p>
                  </div>
                </div>

                {dbLoading ? (
                  <div className="flex justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                ) : artworks && artworks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {artworks.map((art: any) => (
                      <div key={art.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/40 shadow-sm hover:shadow-md transition-all">
                        <Image 
                          src={art.imageUrl} 
                          alt={art.title} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                          unoptimized={true} 
                        />
                        <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-sm font-bold w-full mb-3 line-clamp-2">{art.title}</span>
                          <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border/40 py-32 rounded-3xl text-center">
                    <Database className="w-16 h-16 mx-auto text-muted-foreground/20 mb-6" />
                    <p className="text-xl font-bold text-muted-foreground">Nog geen kunstwerken in de lijst.</p>
                    <Button variant="link" onClick={() => setActiveTab('scan')} className="mt-4 text-lg">Start met importeren</Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">NAS Configuratie</CardTitle>
                    <CardDescription>Controleer of de website verbinding kan maken met je schilderijen.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    <div className="space-y-5">
                      <Label className="text-lg font-bold">Selecteer Verbindingsmethode</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} 
                          className="h-14 font-bold text-base"
                          onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}
                        >Thuis Netwerk (IP)</Button>
                        <Button 
                          variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} 
                          className="h-14 font-bold text-base"
                          onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}
                        >QuickConnect</Button>
                      </div>
                      <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-14 text-sm" />
                    </div>

                    <div className="space-y-5 p-8 bg-muted/10 rounded-2xl border border-border/10">
                      <Label className="text-lg font-bold">Directe Bestandstest</Label>
                      <p className="text-sm text-muted-foreground mb-4">Typ de naam van een foto (bijv. 1.jpg) om de verbinding te controleren.</p>
                      <div className="flex gap-4">
                        <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="h-14" />
                        <Button onClick={testConnection} className="h-14 px-10 font-bold" disabled={testResult === 'testing'}>
                          {testResult === 'testing' ? <Loader2 className="animate-spin h-6 w-6" /> : "Testen"}
                        </Button>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "mt-6 p-5 rounded-xl flex items-center gap-4 font-bold text-base shadow-sm",
                          testResult === 'success' ? "bg-green-500/10 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}>
                          {testResult === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                          <span>
                            {testResult === 'success' 
                              ? "Verbinding geslaagd! De foto is zichtbaar." 
                              : "Verbinding mislukt. Controleer je NAS-rechten (http groep)."}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SidebarProvider 
      defaultOpen={true}
      style={{
        "--sidebar-width": "12.5rem",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <AdminInnerContent />
    </SidebarProvider>
  );
}
