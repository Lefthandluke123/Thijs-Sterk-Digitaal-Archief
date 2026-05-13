
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  Trash2, 
  CheckCircle2, 
  Settings, 
  Archive, 
  Scan, 
  Database,
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
  const [activeTab, setActiveTab] = useState('db');
  const [nasBaseUrl, setNasBaseUrl] = useState(LOCAL_NAS_URL);
  const [includeRootFolder, setIncludeRootFolder] = useState(false);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

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
        tags: []
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
          tags: [],
          createdAt: serverTimestamp(),
        };
        await addDoc(artworkCol, data);
      }
      toast({ title: "Database gevuld", description: "Voorbeelddata is toegevoegd." });
      setActiveTab('db');
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij vullen" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!firestore || scannedFiles.length === 0) return;
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    
    try {
      for (let i = 0; i < scannedFiles.length; i++) {
        const artwork = scannedFiles[i];
        const data = { 
          title: artwork.title,
          series: artwork.series,
          year: artwork.year,
          medium: artwork.medium,
          imageUrl: generateImageUrl(artwork.relativePath),
          description: artwork.description,
          imageHint: artwork.imageHint,
          tags: [],
          createdAt: serverTimestamp(),
        };
        setCurrentUploadItem(i + 1);
        setUploadProgress(((i + 1) / scannedFiles.length) * 100);
        
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
        toast({ title: "Import voltooid" });
        setScannedFiles([]);
        setLoading(false);
        setActiveTab('db');
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Fout bij importeren" });
    }
  };

  const handleAddTag = async (artId: string, currentTags: string[]) => {
    if (!firestore) return;
    const tagValue = newTagInputs[artId]?.trim();
    if (!tagValue) return;
    
    const updatedTags = [...(currentTags || []), tagValue];
    const artRef = doc(firestore, 'artworks', artId);
    
    updateDoc(artRef, { tags: updatedTags })
      .then(() => {
        setNewTagInputs(prev => ({ ...prev, [artId]: "" }));
        toast({ title: "Tag toegevoegd" });
      });
  };

  const handleRemoveTag = async (artId: string, tagToRemove: string, currentTags: string[]) => {
    if (!firestore) return;
    const updatedTags = (currentTags || []).filter(t => t !== tagToRemove);
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .then(() => toast({ title: "Tag verwijderd" }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-20 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-headline font-bold text-2xl shadow-lg group-hover:scale-105 transition-transform relative overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain p-2" 
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
              <span className="relative z-10">T</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none uppercase tracking-widest">Studio Beheer</span>
              <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Thijs Sterk</span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Button variant={activeTab === 'db' ? 'default' : 'ghost'} onClick={() => setActiveTab('db')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Archive className="w-4 h-4" /> Collectie
            </Button>
            <Button variant={activeTab === 'scan' ? 'default' : 'ghost'} onClick={() => setActiveTab('scan')} className="gap-2 h-11 px-6 font-bold rounded-full">
              <Scan className="w-4 h-4" /> Importeer
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
        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-10">
              <div className="space-y-2">
                <h2 className="text-5xl font-headline font-light">Mijn Collectie</h2>
                <p className="text-muted-foreground uppercase tracking-[0.3em] font-bold text-xs">{artworks?.length || 0} Geregistreerde werken</p>
              </div>
            </div>

            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Laden...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border hover:shadow-2xl transition-all group rounded-[2rem]">
                    <div className="relative aspect-[4/3] group/img">
                      <Image src={art.imageUrl} alt={art.title} fill className="object-cover transition-transform duration-700 group-hover/img:scale-105" unoptimized={true} />
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="destructive" size="icon" onClick={() => { if(confirm("Zeker weten?")) deleteDoc(doc(firestore!, 'artworks', art.id))}} className="rounded-full shadow-lg h-10 w-10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-1">
                        <h4 className="font-headline text-2xl font-light leading-tight">{art.title}</h4>
                        <p className="text-xs text-accent font-bold uppercase tracking-[0.2em]">{art.series} &bull; {art.year}</p>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                          {art.tags?.length > 0 ? art.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="gap-2 pr-1.5 py-1 px-3 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10 hover:bg-primary/10">
                              {tag}
                              <button onClick={() => handleRemoveTag(art.id, tag, art.tags)} className="text-primary/40 hover:text-destructive transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </Badge>
                          )) : (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest italic opacity-50">Geen tags</span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input 
                            value={newTagInputs[art.id] || ""} 
                            onChange={(e) => setNewTagInputs(prev => ({ ...prev, [art.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(art.id, art.tags) }}
                            placeholder="Nieuwe tag..." 
                            className="h-9 text-xs rounded-full bg-background/50 border-border"
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleAddTag(art.id, art.tags)}
                            className="h-9 w-9 rounded-full border-primary/20"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Andere tabs blijven hetzelfde voor functionaliteit */}
        {activeTab === 'scan' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="border-2 border-dashed border-border rounded-[2.5rem] p-16 bg-muted/5 flex flex-col items-center justify-center text-center">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-20 h-20 text-primary/20 mb-8" />
                  <Button size="lg" className="h-16 px-16 rounded-full font-bold text-xl" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Kies Map</label>
                  </Button>
                </div>

                <div className="bg-card p-10 rounded-[2rem] border border-border shadow-sm space-y-8">
                  <h3 className="font-headline text-2xl flex items-center gap-3"><Settings className="w-6 h-6 text-accent" /> Import Instellingen</h3>
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground italic">Werken worden zonder tags geïmporteerd.</p>
                    <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-border/50">
                      <Label htmlFor="root-folder" className="text-base font-bold">Inclusief hoofdmap in URL</Label>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </div>
                </div>
              </div>

              {scannedFiles.length > 0 && (
                <div className="space-y-6">
                  <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-[3rem] p-10 space-y-10">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-headline font-light flex items-center gap-4"><CheckCircle2 className="w-10 h-10 text-primary" /> Klaar</h3>
                      <p className="text-lg">{scannedFiles.length} kunstwerken gedetecteerd.</p>
                    </div>
                    {loading ? (
                      <div className="space-y-6">
                        <Progress value={uploadProgress} className="h-6 rounded-full" />
                        <p className="text-center font-bold">{currentUploadItem} / {scannedFiles.length}</p>
                      </div>
                    ) : (
                      <Button onClick={handleSaveAll} className="w-full h-20 text-2xl font-bold rounded-2xl">Start Import</Button>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto">
            <Card className="border-border shadow-2xl rounded-[3rem] p-12 md:p-16 space-y-16 bg-card/50">
              <div className="space-y-4">
                <h2 className="text-5xl font-headline font-light">NAS Setup</h2>
              </div>
              <div className="space-y-8">
                <Label className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Netwerk Locatie</Label>
                <div className="grid grid-cols-2 gap-6">
                  <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="h-20 text-lg font-bold rounded-2xl">Lokaal Netwerk</Button>
                  <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="h-20 text-lg font-bold rounded-2xl">QuickConnect</Button>
                </div>
                <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-14 text-lg rounded-xl" />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-4 text-center">
              <h2 className="text-5xl font-headline font-light">Systeembeheer</h2>
            </div>
            <Card className="border-border shadow-xl rounded-[2.5rem] p-12 space-y-10 bg-card/30">
              <div className="flex items-center justify-between p-10 bg-background rounded-3xl border border-border">
                <div className="space-y-2">
                  <h3 className="text-2xl font-headline font-light">Voorbeelddata Herstellen</h3>
                </div>
                <Button onClick={handleSeedDatabase} disabled={loading} className="h-16 px-10 rounded-2xl gap-3 font-bold text-lg bg-accent">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                  Vul Database
                </Button>
              </div>
              <div className="flex items-center justify-between p-10 bg-destructive/5 rounded-3xl border border-destructive/10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-headline font-light text-destructive">Database Leegmaken</h3>
                </div>
                <Button variant="outline" onClick={async () => {
                  if(confirm("Alles wissen?")) {
                    setLoading(true);
                    const snaps = await getDocs(collection(firestore!, 'artworks'));
                    for (const d of snaps.docs) await deleteDoc(d.ref);
                    toast({ title: "Database gewist" });
                    setLoading(false);
                  }
                }} disabled={loading} className="h-16 px-10 rounded-2xl border-destructive text-destructive font-bold">
                  Alles Wissen
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
