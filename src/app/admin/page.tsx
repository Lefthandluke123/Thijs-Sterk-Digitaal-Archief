
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, getDocs, setDoc, query, orderBy, updateDoc } from 'firebase/firestore';
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
  ExternalLink,
  Tag,
  Plus,
  X,
  Home
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
  const [importTags, setImportTags] = useState<string>("");

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

  const handleUpdateTags = async (artId: string, currentTags: string[]) => {
    if (!firestore) return;
    const newTag = prompt("Voeg een tag toe:");
    if (!newTag) return;
    const updatedTags = [...(currentTags || []), newTag.trim()];
    
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tags bijgewerkt" }))
      .catch(console.error);
  };

  const handleRemoveTag = async (artId: string, tagToRemove: string, currentTags: string[]) => {
    if (!firestore) return;
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tag verwijderd" }))
      .catch(console.error);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brede Navigatiebalk */}
      <header className="h-16 border-b border-border bg-background sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-xl group-hover:scale-105 transition-transform">T</div>
            <span className="font-bold uppercase tracking-[0.2em] text-sm text-foreground">Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Button variant={activeTab === 'scan' ? 'default' : 'ghost'} onClick={() => setActiveTab('scan')} className="gap-2 font-bold">
              <Scan className="w-4 h-4" /> Importeer
            </Button>
            <Button variant={activeTab === 'db' ? 'default' : 'ghost'} onClick={() => setActiveTab('db')} className="gap-2 font-bold">
              <Archive className="w-4 h-4" /> Collectie
            </Button>
            <Button variant={activeTab === 'settings' ? 'default' : 'ghost'} onClick={() => setActiveTab('settings')} className="gap-2 font-bold">
              <Settings className="w-4 h-4" /> NAS Setup
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2"><Home className="w-4 h-4" /> Naar Website</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 md:p-16 max-w-7xl mx-auto w-full">
        {activeTab === 'scan' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="border-2 border-dashed border-border rounded-[2rem] p-12 bg-muted/5 flex flex-col items-center justify-center text-center">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-16 h-16 text-primary/20 mb-6" />
                  <Button size="lg" className="h-14 px-12 rounded-full font-bold text-lg" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Kies Lokale Map</label>
                  </Button>
                  <p className="mt-4 text-sm text-muted-foreground font-medium uppercase tracking-widest">Selecteer de map met schilderijen</p>
                </div>

                <div className="bg-card p-8 rounded-2xl border border-border space-y-6">
                  <h3 className="font-bold text-xl flex items-center gap-2"><Tag className="w-5 h-5" /> Import Instellingen</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tags">Standaard Tags (komma gescheiden)</Label>
                      <Input id="tags" placeholder="bijv. Atmosferisch, Geometrisch, 2024" value={importTags} onChange={(e) => setImportTags(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                      <div className="space-y-1">
                        <Label htmlFor="root-folder" className="font-bold">Inclusief hoofdmap in URL</Label>
                        <p className="text-xs text-muted-foreground">Is de mapnaam nodig voor het NAS pad?</p>
                      </div>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </div>
                </div>
              </div>

              {scannedFiles.length > 0 && (
                <div className="space-y-6">
                  <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-[2rem]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-4 text-3xl font-light">
                        <CheckCircle2 className="w-8 h-8 text-primary" /> Klaar voor Import
                      </CardTitle>
                      <CardDescription>{scannedFiles.length} werken gevonden.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {loading ? (
                        <div className="space-y-4">
                          <div className="flex justify-between text-sm font-bold uppercase">
                            <span>Bezig met uploaden...</span>
                            <span>{currentUploadItem} / {finalArtworks.length}</span>
                          </div>
                          <Progress value={uploadProgress} className="h-4" />
                        </div>
                      ) : (
                        <Button onClick={handleSaveAll} className="w-full h-16 text-xl font-bold rounded-xl shadow-lg">Start Importeren</Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'db' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <h2 className="text-3xl font-headline font-light">Mijn Collectie ({artworks?.length || 0})</h2>
              <Button variant="outline" className="gap-2" onClick={() => window.open(nasBaseUrl, '_blank')}>
                <ExternalLink className="w-4 h-4" /> Herstel NAS Verbinding
              </Button>
            </div>

            {dbLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border hover:shadow-xl transition-shadow">
                    <div className="relative aspect-video">
                      <Image src={art.imageUrl} alt={art.title} fill className="object-cover" unoptimized={true} />
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{art.title}</h4>
                          <p className="text-sm text-muted-foreground uppercase tracking-widest">{art.series}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(firestore!, 'artworks', art.id))} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-4">
                        {art.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <button onClick={() => handleRemoveTag(art.id, tag, art.tags)} className="hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => handleUpdateTags(art.id, art.tags)} className="h-6 px-2 text-[10px] rounded-full">
                          <Plus className="w-3 h-3 mr-1" /> Tag
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
          <div className="max-w-2xl mx-auto">
            <Card className="border-border shadow-2xl rounded-[2.5rem] bg-card/50">
              <CardHeader className="p-10">
                <CardTitle className="text-3xl font-headline font-light">NAS Configuratie</CardTitle>
                <CardDescription>Hoe maken we verbinding met de schilderijen?</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-12">
                <div className="space-y-6">
                  <Label className="text-sm font-bold uppercase tracking-widest">NAS Basis URL</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(LOCAL_NAS_URL)}>Thuisnetwerk (Snel)</Button>
                    <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)}>QuickConnect (Afstand)</Button>
                  </div>
                  <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-12" />
                </div>

                <div className="p-8 bg-primary/5 rounded-2xl border border-primary/10 space-y-6">
                  <Label className="font-bold uppercase tracking-widest text-primary">Status Test</Label>
                  <div className="flex gap-4">
                    <Input value={testFileName} onChange={(e) => setTestFileName(e.target.value)} placeholder="bijv. 1.jpg" />
                    <Button onClick={() => {
                      setTestResult('testing');
                      const img = new window.Image();
                      img.onload = () => setTestResult('success');
                      img.onerror = () => setTestResult('error');
                      img.src = `${nasBaseUrl}${testFileName}?t=${Date.now()}`;
                    }} disabled={testResult === 'testing'}>Test Verbinding</Button>
                  </div>
                  {testResult && (
                    <div className={cn("p-4 rounded-xl flex items-center gap-3 font-bold", testResult === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive")}>
                      {testResult === 'success' ? <CheckCircle2 /> : <AlertCircle />}
                      {testResult === 'success' ? "NAS is bereikbaar!" : "Geen verbinding mogelijk."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
