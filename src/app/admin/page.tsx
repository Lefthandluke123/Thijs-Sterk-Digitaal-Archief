
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Wand2, Trash2, FolderOpen, Zap, Info, Layers, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const [singleArtwork, setSingleArtwork] = useState({
    title: '',
    series: '',
    year: new Date().getFullYear().toString(),
    medium: 'Olieverf op doek',
    description: '',
    imageUrl: '',
    imageHint: 'abstract painting'
  });

  const [bulkJson, setBulkJson] = useState('');
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string, series: string}[]>([]);
  const [baseUrl, setBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to:5001/portfolio/');
  const [defaultSeries, setDefaultSeries] = useState('Collectie 2024');

  // We laden de collectie zonder orderBy voor de administratie, om te zien of er überhaupt iets in staat
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks, error: collectionError } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('gofile.me') || url.includes('quickconnect.to');
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const data = { ...singleArtwork, createdAt: serverTimestamp() };

    addDoc(artworkCol, data)
      .then(() => {
        toast({ title: "Succes", description: "Schilderij toegevoegd." });
        setSingleArtwork({ 
          title: '', 
          series: singleArtwork.series,
          year: new Date().getFullYear().toString(), 
          medium: 'Olieverf op doek', 
          description: '', 
          imageUrl: '', 
          imageHint: 'abstract painting' 
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  const handleAddBulk = async () => {
    if (!firestore || !bulkJson) return;
    
    setLoading(true);
    try {
      const artworksData = JSON.parse(bulkJson);
      const artworkCol = collection(firestore, 'artworks');
      setImportProgress({ current: 0, total: artworksData.length });
      
      let count = 0;
      for (const art of artworksData) {
        const data = { ...art, createdAt: serverTimestamp() };
        addDoc(artworkCol, data)
          .then(() => {
            count++;
            setImportProgress(prev => ({ ...prev, current: count }));
          })
          .catch(async () => {
             const permissionError = new FirestorePermissionError({
               path: artworkCol.path,
               operation: 'create',
               requestResourceData: data
             });
             errorEmitter.emit('permission-error', permissionError);
          });
      }
      
      toast({ title: "Bulk Import Gestart", description: "De schilderijen worden een voor een toegevoegd." });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "Controleer of de JSON code correct is." });
    } finally {
      setTimeout(() => {
        setLoading(false);
        setImportProgress({ current: 0, total: 0 });
      }, 2000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit kunstwerk wilt verwijderen?")) return;
    deleteDoc(doc(firestore, 'artworks', id))
      .then(() => toast({ title: "Verwijderd" }))
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: `artworks/${id}`,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      let relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      if (pathParts.length > 1) {
        relativePath = pathParts.slice(1).join('/');
      }

      let detectedSeries = defaultSeries;
      if (pathParts.length > 2) {
        detectedSeries = pathParts[pathParts.length - 2].replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        name: relativePath,
        cleanName: cleanName,
        series: detectedSeries
      };
    });
    
    setRawFiles(prev => [...prev, ...scanned]);
    toast({ title: `${scanned.length} bestanden gescand` });
  };

  const generateBulkJson = () => {
    if (rawFiles.length === 0) return;
    
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    const generated = rawFiles.map((file) => ({
      title: file.cleanName,
      series: file.series,
      year: new Date().getFullYear().toString(),
      medium: "Olieverf op doek",
      imageUrl: `${cleanBaseUrl}${file.name}`,
      description: `Een origineel werk van Thijs Sterk.`,
      imageHint: "painting art"
    }));
    
    setBulkJson(JSON.stringify(generated, null, 2));
    toast({ title: "JSON Gegenereerd", description: "Ga naar het tabblad 'Bulk Import' om het op te slaan." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-headline font-light mb-2">Portfolio <span className="italic">Beheer</span></h1>
          <p className="text-muted-foreground">Beheer de collectie van Thijs Sterk.</p>
        </header>

        {loading && importProgress.total > 0 && (
          <div className="mb-8 p-6 bg-accent/20 rounded-2xl border border-accent/30 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Import Bezig...</span>
              <span className="text-sm font-bold">{importProgress.current} / {importProgress.total}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-accent h-full transition-all duration-300" 
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database ({artworks?.length || 0})</TabsTrigger>
            <TabsTrigger value="helper">Scan Mappen</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            <TabsTrigger value="single">Enkel Item</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-light">Huidige Database</CardTitle>
                  <CardDescription>Totaal aantal items: {artworks?.length || 0}</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent" /></div>
                ) : artworks && artworks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b text-sm text-muted-foreground">
                          <th className="pb-3">Beeld</th>
                          <th className="pb-3">Titel</th>
                          <th className="pb-3">Serie</th>
                          <th className="pb-3 text-right">Acties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {artworks.map((art: any) => (
                          <tr key={art.id} className="hover:bg-muted/30">
                            <td className="py-3">
                              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                                <Image 
                                  src={art.imageUrl} 
                                  alt="" 
                                  fill 
                                  className="object-cover"
                                  unoptimized={isExternalStorage(art.imageUrl)}
                                />
                              </div>
                            </td>
                            <td className="py-3 font-medium">{art.title}</td>
                            <td className="py-3 text-muted-foreground text-xs">{art.series}</td>
                            <td className="py-3 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(art.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground space-y-4">
                    <p>Nog geen werken in de database.</p>
                    {collectionError && <p className="text-destructive text-xs">Foutmelding: {collectionError.message}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Stap 1: Map Selecteren</CardTitle>
                <CardDescription>Selecteer de hoofdmap 'portfolio' op je computer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-10 border-2 border-dashed rounded-2xl text-center bg-muted/20 border-accent/20">
                  <Input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner" 
                    onChange={handleFileScan} 
                    accept="image/*" 
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                  <Button variant="outline" size="lg" className="rounded-full px-10 border-accent text-accent hover:bg-accent/10" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-5 w-5" />
                      Selecteer Hoofdmap
                    </label>
                  </Button>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Basis URL (Synology)</Label>
                        <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label>Standaard Serie</Label>
                        <Input value={defaultSeries} onChange={e => setDefaultSeries(e.target.value)} />
                      </div>
                    </div>
                    
                    <Button onClick={generateBulkJson} className="w-full h-14 rounded-full bg-accent hover:bg-accent/90 text-lg">
                      <Wand2 className="mr-2 h-5 w-5" />
                      Stap 2: Maak JSON Lijst
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Stap 3: Bulk Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[300px] font-mono text-[10px] bg-muted/10" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder='JSON code komt hier...'
                />
                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-lg" 
                  disabled={loading || !bulkJson}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                  Stap 4: Alles definitief opslaan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card>
              <CardHeader><CardTitle className="font-light">Handmatig toevoegen</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titel</Label><Input value={singleArtwork.title} onChange={e => setSingleArtwork({...singleArtwork, title: e.target.value})} required /></div>
                    <div className="space-y-2"><Label>Serie</Label><Input value={singleArtwork.series} onChange={e => setSingleArtwork({...singleArtwork, series: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-2"><Label>URL</Label><Input value={singleArtwork.imageUrl} onChange={e => setSingleArtwork({...singleArtwork, imageUrl: e.target.value})} required /></div>
                  <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>Opslaan</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
