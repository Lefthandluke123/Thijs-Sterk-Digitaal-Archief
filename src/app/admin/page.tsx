
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
import { PlusCircle, Database, Loader2, Wand2, Trash2, FolderOpen, Zap, Info, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  
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
  const [rawFiles, setRawFiles] = useState<{name: string, cleanName: string}[]>([]);
  const [baseUrl, setBaseUrl] = useState('https://192-168-178-15.doggyfew.direct.quickconnect.to:5001/portfolio/');
  const [defaultSeries, setDefaultSeries] = useState('Collectie 2024');

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('gofile.me') || url.includes('quickconnect.to');
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    try {
      await addDoc(collection(firestore, 'artworks'), {
        ...singleArtwork,
        createdAt: serverTimestamp()
      });
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
    } catch (error) {
      toast({ variant: "destructive", title: "Fout", description: "Kon niet opslaan." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulk = async () => {
    if (!firestore || !bulkJson) return;
    
    setLoading(true);
    try {
      const artworksData = JSON.parse(bulkJson);
      const artworkCol = collection(firestore, 'artworks');
      
      for (const art of artworksData) {
        addDoc(artworkCol, { 
          ...art, 
          createdAt: serverTimestamp() 
        });
      }
      
      toast({ title: "Bulk Succes", description: `${artworksData.length} schilderijen worden toegevoegd.` });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout in JSON", description: "Controleer of de JSON code correct is." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit kunstwerk wilt verwijderen?")) return;
    try {
      await deleteDoc(doc(firestore, 'artworks', id));
      toast({ title: "Verwijderd" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij verwijderen" });
    }
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const scanned = Array.from(files).map(file => {
      let cleanName = file.name.split('.').slice(0, -1).join('.');
      cleanName = cleanName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        name: file.name,
        cleanName: cleanName
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
      series: defaultSeries,
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
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-light mb-2">Portfolio <span className="italic">Beheer</span></h1>
          <p className="text-muted-foreground">Database van Thijs Sterk.</p>
        </header>

        <div className="grid gap-6 mb-12">
          <Alert className="bg-accent/10 border-accent/20 border-l-4 border-l-accent">
            <Zap className="h-5 w-5 text-accent" />
            <div className="ml-2">
              <AlertTitle className="text-lg font-headline font-semibold text-accent">Bulk Generator: 400 Werken Automatisering</AlertTitle>
              <AlertDescription className="mt-2 space-y-3 text-sm leading-relaxed">
                <p>Je hoeft niet 400 keer een link te maken. Gebruik de <strong>Scanner</strong> hieronder om de namen van je foto's van je computer op te halen. De app plakt deze automatisch achter je Synology URL.</p>
                <div className="bg-background/50 p-4 rounded-lg border border-border mt-2">
                  <p className="font-bold mb-1 flex items-center gap-2">Jouw Synology URL: <Info className="w-3 h-3" /></p>
                  <code className="text-xs break-all text-primary">{baseUrl}</code>
                  <p className="text-[10px] mt-2 text-muted-foreground italic">Zorg dat de map 'portfolio' op je NAS openbaar gedeeld is via Web Station of een gedeelde map.</p>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database</TabsTrigger>
            <TabsTrigger value="helper">Scanner & Generator</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            <TabsTrigger value="single">Enkel Item</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle className="font-light">Huidige Collectie ({artworks?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
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
                ) : <div className="text-center py-12 text-muted-foreground">Nog geen werken in de database. Gebruik de Generator om te beginnen.</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Stap 1: Bestanden Scannen</CardTitle>
                <CardDescription>Selecteer de 400 foto's op je computer om hun namen te laden.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-10 border-2 border-dashed rounded-2xl text-center bg-muted/20 border-accent/20">
                  <Input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" />
                  <Button variant="outline" size="lg" className="rounded-full px-10 border-accent text-accent hover:bg-accent/10" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-5 w-5" />
                      Selecteer alle 400+ foto's
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">We lezen alleen de namen, de foto's worden niet geüpload naar de server.</p>
                </div>

                {rawFiles.length > 0 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Basis URL op jouw Synology</Label>
                        <Input 
                          placeholder="https://.../portfolio/" 
                          value={baseUrl} 
                          onChange={e => setBaseUrl(e.target.value)} 
                          className="bg-muted/30"
                        />
                        <p className="text-[10px] text-muted-foreground">De bestandsnaam (bijv. 'Schilderij1.jpg') wordt hier automatisch achter geplakt.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Collectie Naam</Label>
                        <Input 
                          value={defaultSeries} 
                          onChange={e => setDefaultSeries(e.target.value)} 
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-xl p-4 bg-muted/10">
                      <p className="text-xs font-bold mb-3 flex items-center justify-between">
                        Gescande bestanden ({rawFiles.length}):
                        <span className="text-accent">Preview van links</span>
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {rawFiles.slice(0, 5).map((f, i) => (
                          <div key={i} className="text-[10px] p-2 bg-background rounded border border-border/50 truncate">
                            <span className="font-bold text-accent">{f.cleanName}</span><br/>
                            <span className="text-muted-foreground italic">{baseUrl}{f.name}</span>
                          </div>
                        ))}
                        {rawFiles.length > 5 && <p className="text-center text-[10px] text-muted-foreground pt-2">...en nog {rawFiles.length - 5} andere bestanden.</p>}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={generateBulkJson} className="flex-1 h-14 rounded-full bg-accent hover:bg-accent/90 text-lg">
                        <Wand2 className="mr-2 h-5 w-5" />
                        Stap 2: Maak JSON Lijst
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Stap 3: Bulk Import</CardTitle>
                <CardDescription>De gegenereerde lijst staat hieronder klaar. Klik op de knop om alles in de database te zetten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[300px] font-mono text-[10px] leading-tight bg-muted/10" 
                  value={bulkJson} 
                  onChange={e => setBulkJson(e.target.value)} 
                  placeholder='Klik eerst op "Maak JSON Lijst" in de Scanner tab...'
                />
                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-lg" 
                  disabled={loading || !bulkJson}
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Stap 4: Alles definitief opslaan in Database
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card>
              <CardHeader><CardTitle className="font-light">Handmatig item toevoegen</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titel</Label><Input value={singleArtwork.title} onChange={e => setSingleArtwork({...singleArtwork, title: e.target.value})} required placeholder="Bijv. Stilleven in Blauw" /></div>
                    <div className="space-y-2"><Label>Serie</Label><Input value={singleArtwork.series} onChange={e => setSingleArtwork({...singleArtwork, series: e.target.value})} required placeholder="Bijv. Abstract 2024" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Directe Afbeelding URL</Label>
                    <Input placeholder="https://jouwnas.nl/foto.jpg" value={singleArtwork.imageUrl} onChange={e => setSingleArtwork({...singleArtwork, imageUrl: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschrijving</Label>
                    <Textarea value={singleArtwork.description} onChange={e => setSingleArtwork({...singleArtwork, description: e.target.value})} placeholder="Vertel iets over het werk..." />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>Opslaan in Database</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
