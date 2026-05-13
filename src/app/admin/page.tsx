
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, setDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  Trash2, 
  CheckCircle2, 
  Settings, 
  Archive, 
  Scan, 
  AlertCircle,
  Database,
  ExternalLink,
  Tag as TagIcon,
  Plus,
  X,
  Home,
  RefreshCw,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from "@/components/ui/progress";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
  const [importTags, setImportTags] = useState<string>("2024, Nieuw");

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
        imageHint: "painting art",
        tags: importTags.split(',').map(t => t.trim()).filter(t => t !== "")
      };
    });
    setScannedFiles(scanned);
    toast({ title: "Scan voltooid", description: `${scanned.length} werken gevonden.` });
  };

  const handleSeedDatabase = async () => {
    if (!firestore) return;
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    
    try {
      for (const item of PlaceHolderImages) {
        const data = {
          title: item.title || 'Ongetiteld',
          series: item.series || 'Voorbeeld Serie',
          year: item.year || '2023',
          medium: item.medium || 'Gemengde techniek',
          imageUrl: item.imageUrl,
          description: item.description,
          imageHint: item.imageHint,
          tags: ['Voorbeeld', item.series].filter(Boolean) as string[],
          createdAt: serverTimestamp(),
        };
        await addDoc(artworkCol, data);
      }
      toast({ title: "Database gevuld", description: "Voorbeelddata is toegevoegd aan je collectie." });
      setActiveTab('db');
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij vullen", description: "Kon de voorbeelddata niet toevoegen." });
    } finally {
      setLoading(false);
    }
  };

  const finalArtworks = useMemo(() => {
    return scannedFiles.map(file => ({
      ...file,
      imageUrl: generateImageUrl(file.relativePath),
      tags: importTags.split(',').map(t => t.trim()).filter(t => t !== "")
    }));
  }, [scannedFiles, nasBaseUrl, includeRootFolder, importTags]);

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
          tags: artwork.tags,
          createdAt: serverTimestamp(),
        };
        setCurrentUploadItem(i + 1);
        setUploadProgress(((i + 1) / finalArtworks.length) * 100);
        
        addDoc(artworkCol, data).catch(async (err) => {
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

  const handleUpdateTags = async (artId: string, currentTags: string[]) => {
    if (!firestore) return;
    const newTag = prompt("Voeg een tag toe:");
    if (!newTag) return;
    const updatedTags = [...(currentTags || []), newTag.trim()];
    
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tags bijgewerkt" }));
  };

  const handleRemoveTag = async (artId: string, tagToRemove: string, currentTags: string[]) => {
    if (!firestore) return;
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tag verwijderd" }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigatiebalk */}
      <header className="h-20 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-headline font-bold text-2xl shadow-lg group-hover:scale-105 transition-transform">T</div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none uppercase tracking-widest">Studio Beheer</span>
              <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Thijs Sterk</span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Button variant={activeTab === 'scan' ? 'default' : 'ghost'} onClick={() => setActiveTab('scan')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Scan className="w-4 h-4" /> Importeer
            </Button>
            <Button variant={activeTab === 'db' ? 'default' : 'ghost'} onClick={() => setActiveTab('db')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Archive className="w-4 h-4" /> Collectie
            </Button>
            <Button variant={activeTab === 'settings' ? 'default' : 'ghost'} onClick={() => setActiveTab('settings')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Settings className="w-4 h-4" /> NAS
            </Button>
            <Button variant={activeTab === 'system' ? 'default' : 'ghost'} onClick={() => setActiveTab('system')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Database className="w-4 h-4" /> Systeem
            </Button>
          </nav>
        </div>
        
        <Button variant="outline" asChild className="rounded-full h-11 px-6 border-primary text-primary hover:bg-primary/5">
          <Link href="/" className="gap-2"><Home className="w-4 h-4" /> Naar Website</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-16 max-w-7xl mx-auto w-full">
        {activeTab === 'scan' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="border-2 border-dashed border-border rounded-[2.5rem] p-16 bg-muted/5 flex flex-col items-center justify-center text-center hover:bg-muted/10 transition-colors">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-20 h-20 text-primary/20 mb-8" />
                  <Button size="lg" className="h-16 px-16 rounded-full font-bold text-xl shadow-xl" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Kies Map</label>
                  </Button>
                  <p className="mt-6 text-sm text-muted-foreground font-bold uppercase tracking-[0.2em]">Selecteer een lokale map om te scannen</p>
                </div>

                <div className="bg-card p-10 rounded-[2rem] border border-border shadow-sm space-y-8">
                  <h3 className="font-headline text-2xl flex items-center gap-3"><TagIcon className="w-6 h-6 text-accent" /> Import Instellingen</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="tags" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Standaard Tags</Label>
                      <Input id="tags" placeholder="bijv. Atmosferisch, Geometrisch" value={importTags} onChange={(e) => setImportTags(e.target.value)} className="h-12 text-lg rounded-xl" />
                      <p className="text-xs text-muted-foreground italic">Komma-gescheiden lijst met tags voor alle nieuwe werken.</p>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-border/50">
                      <div className="space-y-1">
                        <Label htmlFor="root-folder" className="text-base font-bold">Inclusief hoofdmap in URL</Label>
                        <p className="text-sm text-muted-foreground">Is de mapnaam onderdeel van het pad op de NAS?</p>
                      </div>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </div>
                </div>
              </div>

              {scannedFiles.length > 0 && (
                <div className="space-y-6">
                  <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-[3rem] overflow-hidden">
                    <CardHeader className="p-10 pb-4">
                      <CardTitle className="flex items-center gap-4 text-4xl font-headline font-light">
                        <CheckCircle2 className="w-10 h-10 text-primary" /> Klaar voor Import
                      </CardTitle>
                      <CardDescription className="text-lg">{scannedFiles.length} kunstwerken gedetecteerd.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-10">
                      {loading ? (
                        <div className="space-y-6 py-10">
                          <div className="flex justify-between items-end">
                            <div className="space-y-1">
                              <span className="text-sm font-bold uppercase tracking-widest text-primary">Bezig met verwerken...</span>
                              <p className="text-2xl font-headline">{finalArtworks[currentUploadItem-1]?.title}</p>
                            </div>
                            <span className="text-xl font-bold font-mono">{currentUploadItem} / {finalArtworks.length}</span>
                          </div>
                          <Progress value={uploadProgress} className="h-6 rounded-full" />
                        </div>
                      ) : (
                        <Button onClick={handleSaveAll} className="w-full h-20 text-2xl font-bold rounded-2xl shadow-2xl hover:scale-[1.02] transition-transform">Start Importeren</Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-10">
              <div className="space-y-2">
                <h2 className="text-5xl font-headline font-light">Mijn Collectie</h2>
                <p className="text-muted-foreground uppercase tracking-[0.3em] font-bold text-xs">{artworks?.length || 0} Geregistreerde werken</p>
              </div>
              <Button variant="outline" className="gap-2 rounded-full h-12 px-8 border-accent text-accent hover:bg-accent/5 font-bold" onClick={() => window.open(nasBaseUrl, '_blank')}>
                <ExternalLink className="w-4 h-4" /> NAS Verbinding Openen
              </Button>
            </div>

            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Collectie laden...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border hover:shadow-2xl transition-all group rounded-[1.5rem]">
                    <div className="relative aspect-[4/3]">
                      <Image src={art.imageUrl} alt={art.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized={true} />
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="destructive" size="icon" onClick={() => { if(confirm("Zeker weten?")) deleteDoc(doc(firestore!, 'artworks', art.id))}} className="rounded-full shadow-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-1">
                        <h4 className="font-headline text-2xl font-light leading-tight">{art.title}</h4>
                        <p className="text-xs text-accent font-bold uppercase tracking-[0.2em]">{art.series}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-6 border-t border-border">
                        {art.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="gap-2 pr-2 py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                            {tag}
                            <button onClick={() => handleRemoveTag(art.id, tag, art.tags)} className="hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => handleUpdateTags(art.id, art.tags)} className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest rounded-full border-primary/20">
                          <Plus className="w-3 h-3 mr-2" /> Tag Toevoegen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto">
            <Card className="border-border shadow-2xl rounded-[3rem] bg-card/50 overflow-hidden">
              <CardHeader className="p-12 md:p-16 border-b border-border bg-muted/5">
                <CardTitle className="text-5xl font-headline font-light mb-4">NAS Setup</CardTitle>
                <CardDescription className="text-lg">Configureer de verbinding met je fysieke opslag.</CardDescription>
              </CardHeader>
              <CardContent className="p-12 md:p-16 space-y-16">
                <div className="space-y-8">
                  <Label className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Netwerk Locatie</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="h-20 text-lg font-bold rounded-2xl">Lokaal Netwerk</Button>
                    <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="h-20 text-lg font-bold rounded-2xl">QuickConnect</Button>
                  </div>
                  <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-14 text-lg rounded-xl bg-background border-border" />
                </div>

                <div className="p-10 bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-8">
                  <div className="space-y-2">
                    <Label className="font-bold uppercase tracking-widest text-primary text-xs">Verbinding Testen</Label>
                    <p className="text-sm text-muted-foreground">Test of een specifiek bestand bereikbaar is vanaf deze locatie.</p>
                  </div>
                  <div className="flex gap-4">
                    <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" className="h-14 text-lg bg-background rounded-xl" />
                    <Button onClick={() => {
                      setTestResult('testing');
                      const img = new window.Image();
                      img.onload = () => setTestResult('success');
                      img.onerror = () => setTestResult('error');
                      img.src = `${nasBaseUrl}${testFileName}?t=${Date.now()}`;
                    }} disabled={testResult === 'testing'} className="h-14 px-10 rounded-xl font-bold">Start Test</Button>
                  </div>
                  {testResult && (
                    <div className={cn("p-6 rounded-2xl flex items-center gap-4 font-bold text-lg animate-in fade-in slide-in-from-top-4", 
                      testResult === 'success' ? "bg-green-500/10 text-green-700 border border-green-500/20" : 
                      testResult === 'testing' ? "bg-muted text-muted-foreground" :
                      "bg-destructive/10 text-destructive border border-destructive/20")}>
                      {testResult === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                      {testResult === 'success' ? "Verbinding geslaagd!" : testResult === 'testing' ? "Testen..." : "Geen verbinding mogelijk."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-4 text-center">
              <h2 className="text-5xl font-headline font-light">Systeembeheer</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Gereedschappen om je database te onderhouden en snel te vullen voor tests.</p>
            </div>

            <Card className="border-border shadow-xl rounded-[2.5rem] bg-card/30 overflow-hidden">
              <CardContent className="p-12 space-y-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-background rounded-3xl border border-border shadow-inner">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-headline font-light">Voorbeelddata Herstellen</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Zijn je schilderijen weg na een update? Gebruik deze knop om de database direct te vullen met de standaard portfolio-werken.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSeedDatabase} 
                    disabled={loading}
                    className="h-16 px-10 rounded-2xl gap-3 font-bold text-lg bg-accent hover:bg-accent/90 shadow-xl"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                    Vul Database
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-destructive/5 rounded-3xl border border-destructive/10">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-headline font-light text-destructive">Database Leegmaken</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Verwijder ALLE schilderijen uit de database. Let op: dit kan niet ongedaan worden gemaakt.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      if(confirm("Weet je zeker dat je ALLE data wilt wissen?")) {
                        setLoading(true);
                        const snaps = await getDocs(collection(firestore!, 'artworks'));
                        for (const d of snaps.docs) {
                          await deleteDoc(d.ref);
                        }
                        toast({ title: "Database gewist" });
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="h-16 px-10 rounded-2xl border-destructive text-destructive hover:bg-destructive/10 font-bold"
                  >
                    Alles Wissen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
