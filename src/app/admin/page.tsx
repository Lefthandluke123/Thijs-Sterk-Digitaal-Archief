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
import { PlusCircle, Database, FileJson, Loader2, Wand2, Trash2, FolderOpen, Image as ImageIcon, Info, Link as LinkIcon, AlertTriangle } from 'lucide-react';
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
  const [rawList, setRawList] = useState('');

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
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
        await addDoc(artworkCol, { ...art, createdAt: serverTimestamp() });
      }
      toast({ title: "Bulk Succes", description: "Lijst toegevoegd." });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Verwijderen?")) return;
    try {
      await deleteDoc(doc(firestore, 'artworks', id));
      toast({ title: "Verwijderd" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout" });
    }
  };

  const generateJsonFromList = () => {
    const lines = rawList.split('\n').filter(line => line.trim() !== '');
    const generated = lines.map((line, index) => ({
      title: line.trim(),
      series: "Nieuwe Collectie",
      year: new Date().getFullYear().toString(),
      medium: "Olieverf op doek",
      imageUrl: `https://picsum.photos/seed/${index + 100}/800/800`,
      description: `Beschrijving voor ${line.trim()}`,
      imageHint: "abstract painting"
    }));
    setBulkJson(JSON.stringify(generated, null, 2));
    toast({ title: "JSON Gegenereerd" });
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map(file => {
      let name = file.name.split('.').slice(0, -1).join('.');
      return name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
    setRawList(prev => (prev ? prev + '\n' + names.join('\n') : names.join('\n')));
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-light mb-2">Portfolio <span className="italic">Beheer</span></h1>
          <p className="text-muted-foreground">Beheer de database van Thijs Sterk.</p>
        </header>

        <div className="grid gap-6 mb-12">
          <Alert className="bg-accent/10 border-accent/20 border-l-4 border-l-accent">
            <LinkIcon className="h-5 w-5 text-accent" />
            <div className="ml-2">
              <AlertTitle className="text-lg font-headline font-semibold text-accent">Belangrijk: Synology & Directe Links</AlertTitle>
              <AlertDescription className="mt-2 space-y-3 text-sm leading-relaxed">
                <p>Een standaard <strong>gofile.me</strong> link van Synology is vaak een 'deel-pagina' en geen directe foto. </p>
                <div className="bg-background/50 p-4 rounded-lg border border-border space-y-2">
                  <p className="font-bold">Hoe krijg je de juiste link?</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Gebruik <strong>Synology Photos</strong> voor de beste resultaten.</li>
                    <li>Kies 'Deel-instellingen' &gt; 'Openbare link inschakelen'.</li>
                    <li>Rechtermuisknop op de geopende foto &gt; <strong>'Adres van afbeelding kopiëren'</strong>.</li>
                    <li>De link moet eindigen op een bestandstype (zoals <code>.jpg</code>) of een directe stream-ID bevatten.</li>
                  </ul>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Database</TabsTrigger>
            <TabsTrigger value="single">Nieuw</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            <TabsTrigger value="helper">Scan Mappen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle className="font-light">Database Inhoud</CardTitle></CardHeader>
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
                            <td className="py-3 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(art.id)}><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="text-center py-12 text-muted-foreground">Leeg.</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card>
              <CardHeader><CardTitle className="font-light">Toevoegen</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Titel</Label><Input value={singleArtwork.title} onChange={e => setSingleArtwork({...singleArtwork, title: e.target.value})} required /></div>
                    <div className="space-y-2"><Label>Serie</Label><Input value={singleArtwork.series} onChange={e => setSingleArtwork({...singleArtwork, series: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Afbeelding URL</Label>
                    <Input placeholder="https://..." value={singleArtwork.imageUrl} onChange={e => setSingleArtwork({...singleArtwork, imageUrl: e.target.value})} required />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>Opslaan</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader><CardTitle className="font-light">Bulk Import</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea className="min-h-[300px] font-mono text-xs" value={bulkJson} onChange={e => setBulkJson(e.target.value)} />
                <Button onClick={handleAddBulk} className="w-full h-12 rounded-full" disabled={loading || !bulkJson}>Alles importeren</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card>
              <CardHeader><CardTitle className="font-light">Mappen Scanner</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="p-8 border-2 border-dashed rounded-2xl text-center">
                  <Input type="file" multiple className="hidden" id="file-scanner" onChange={handleFileScan} accept="image/*" />
                  <Button variant="outline" className="rounded-full" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">Selecteer Foto's van computer</label>
                  </Button>
                </div>
                <Textarea placeholder="Titels..." className="min-h-[150px]" value={rawList} onChange={e => setRawList(e.target.value)} />
                <Button onClick={generateJsonFromList} variant="secondary" className="w-full h-12 rounded-full" disabled={!rawList}>Genereer JSON</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}