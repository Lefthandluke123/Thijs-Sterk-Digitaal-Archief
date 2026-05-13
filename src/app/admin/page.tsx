
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
        tags: [] // Altijd zonder tags
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
          tags: [], // Altijd zonder tags
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
          tags: [], // Altijd zonder tags
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
    <div className="min-h-screen bg-background flex flex-col pt-14">
      {/* Admin Navigatie - Geen zijbalk meer */}
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg shadow-sm group-hover:scale-105 transition-transform relative overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain p-1" 
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
              <span className="relative z-10">T</span>
            </div>
            <span className="font-bold text-sm leading-none uppercase tracking-widest hidden sm:block">Studio Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Button variant={activeTab === 'db' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('db')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Archive className="w-3.5 h-3.5" /> Collectie
            </Button>
            <Button variant={activeTab === 'scan' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('scan')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Scan className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('settings')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Settings className="w-3.5 h-3.5" /> NAS
            </Button>
            <Button variant={activeTab === 'system' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('system')} className="gap-2 h-9 px-4 font-bold rounded-full text-[10px] uppercase tracking-widest">
              <Database className="w-3.5 h-3.5" /> Systeem
            </Button>
          </nav>
        </div>
        
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/" className="gap-2"><Home className="w-3.5 h-3.5" /> Website</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-light">Mijn Archief</h2>
                <p className="text-muted-foreground uppercase tracking-[0.2em] font-bold text-[9px]">{artworks?.length || 0} Geregistreerde werken</p>
              </div>
            </div>

            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Laden...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border hover:shadow-xl transition-all group rounded-2xl">
                    <div className="relative aspect-[4/3] group/img">
                      <Image src={art.imageUrl} alt={art.title} fill className="object-cover transition-transform duration-700 group-hover/img:scale-105" unoptimized={true} />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="destructive" size="icon" onClick={() => { if(confirm("Zeker weten?")) deleteDoc(doc(firestore!, 'artworks', art.id))}} className="rounded-full shadow-lg h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-0.5">
                        <h4 className="font-headline text-xl font-light leading-tight">{art.title}</h4>
                        <p className="text-[9px] text-accent font-bold uppercase tracking-[0.2em]">{art.series} &bull; {art.year}</p>
                      </div>
                      
                      {/* Zwevende Tag Sectie */}
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {art.tags?.length > 0 ? art.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="gap-1.5 pr-1 py-0.5 px-2 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                              {tag}
                              <button onClick={() => handleRemoveTag(art.id, tag, art.tags)} className="text-primary/40 hover:text-destructive transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )) : (
                            <span className="text-[8px] text-muted-foreground uppercase tracking-widest italic opacity-40">Geen tags</span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input 
                            value={newTagInputs[art.id] || ""} 
                            onChange={(e) => setNewTagInputs(prev => ({ ...prev, [art.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(art.id, art.tags) }}
                            placeholder="Tag toevoegen..." 
                            className="h-8 text-[9px] rounded-full bg-background/50 border-border"
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleAddTag(art.id, art.tags)}
                            className="h-8 w-8 rounded-full border-primary/20 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

        {/* Andere tabs blijven zoals ze waren */}
        {activeTab === 'scan' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="border-2 border-dashed border-border rounded-3xl p-16 bg-muted/5 flex flex-col items-center justify-center text-center">
                  <input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" {...({ webkitdirectory: "", directory: "" } as any)} />
                  <FolderOpen className="w-16 h-16 text-primary/20 mb-6" />
                  <Button size="lg" className="h-14 px-12 rounded-full font-bold uppercase tracking-widest text-xs" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Map Selecteren</label>
                  </Button>
                  <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest">Selecteer de map met schilderijen op je NAS</p>
                </div>

                <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                  <h3 className="font-headline text-xl flex items-center gap-3"><Settings className="w-5 h-5 text-accent" /> Instellingen</h3>
                  <div className="space-y-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">Werken worden standaard zonder tags geïmporteerd voor een schone administratie.</p>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                      <Label htmlFor="root-folder" className="text-xs font-bold uppercase tracking-widest">Hoofdmap in URL</Label>
                      <Switch id="root-folder" checked={includeRootFolder} onCheckedChange={setIncludeRootFolder} />
                    </div>
                  </div>
                </div>
              </div>

              {scannedFiles.length > 0 && (
                <div className="space-y-6">
                  <Card className="border-primary/20 shadow-2xl bg-primary/5 rounded-3xl p-8 space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-headline font-light flex items-center gap-4"><CheckCircle2 className="w-8 h-8 text-primary" /> Scan Gereed</h3>
                      <p className="text-sm uppercase tracking-widest text-muted-foreground">{scannedFiles.length} kunstwerken gevonden.</p>
                    </div>
                    {loading ? (
                      <div className="space-y-4">
                        <Progress value={uploadProgress} className="h-4 rounded-full" />
                        <p className="text-center font-bold text-[10px] uppercase tracking-widest">{currentUploadItem} / {scannedFiles.length}</p>
                      </div>
                    ) : (
                      <Button onClick={handleSaveAll} className="w-full h-16 text-lg font-bold rounded-2xl uppercase tracking-widest">Import Starten</Button>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-border shadow-2xl rounded-3xl p-10 space-y-12 bg-card/50">
              <div className="space-y-2">
                <h2 className="text-4xl font-headline font-light">NAS Setup</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Configureer de verbinding met je Synology NAS</p>
              </div>
              <div className="space-y-6">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Netwerk Locatie</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant={nasBaseUrl === LOCAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(LOCAL_NAS_URL)} className="h-16 text-[10px] uppercase tracking-widest font-bold rounded-xl">Lokaal Netwerk</Button>
                  <Button variant={nasBaseUrl === EXTERNAL_NAS_URL ? "default" : "outline"} onClick={() => setNasBaseUrl(EXTERNAL_NAS_URL)} className="h-16 text-[10px] uppercase tracking-widest font-bold rounded-xl">QuickConnect</Button>
                </div>
                <Input value={nasBaseUrl} onChange={(e) => setNasBaseUrl(e.target.value)} className="font-mono h-12 text-sm rounded-lg" />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-headline font-light">Systeem</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Beheer de database status</p>
            </div>
            <Card className="border-border shadow-xl rounded-3xl p-8 space-y-6 bg-card/30">
              <div className="flex items-center justify-between p-6 bg-background rounded-2xl border border-border">
                <div className="space-y-1">
                  <h3 className="text-xl font-headline font-light">Voorbeelden Herstellen</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Vult de database met de standaard collectie</p>
                </div>
                <Button onClick={handleSeedDatabase} disabled={loading} className="h-12 px-8 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest bg-accent">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Seed DB
                </Button>
              </div>
              <div className="flex items-center justify-between p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                <div className="space-y-1">
                  <h3 className="text-xl font-headline font-light text-destructive">Database Wissen</h3>
                  <p className="text-[9px] text-destructive/60 uppercase tracking-widest">Verwijder alle geregistreerde werken</p>
                </div>
                <Button variant="outline" onClick={async () => {
                  if(confirm("Weet je zeker dat je ALLES wilt wissen?")) {
                    setLoading(true);
                    const snaps = await getDocs(collection(firestore!, 'artworks'));
                    for (const d of snaps.docs) await deleteDoc(d.ref);
                    toast({ title: "Database gewist" });
                    setLoading(false);
                  }
                }} disabled={loading} className="h-12 px-8 rounded-xl border-destructive text-destructive font-bold text-[10px] uppercase tracking-widest">
                  Reset DB
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
