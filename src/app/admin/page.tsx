
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Database, FileJson, Loader2, Wand2, Trash2, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  
  // Single entry state
  const [singleArtwork, setSingleArtwork] = useState({
    title: '',
    series: '',
    year: new Date().getFullYear().toString(),
    medium: 'Olieverf op doek',
    description: '',
    imageUrl: '',
    imageHint: 'abstract painting'
  });

  // Bulk entry state
  const [bulkJson, setBulkJson] = useState('');

  // Generator state
  const [rawList, setRawList] = useState('');

  // Database Overview
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: loadingArtworks } = useCollection(artworksQuery);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    setLoading(true);
    try {
      await addDoc(collection(firestore, 'artworks'), {
        ...singleArtwork,
        createdAt: serverTimestamp()
      });
      toast({ title: "Succes", description: "Schilderij toegevoegd aan de database." });
      setSingleArtwork({ 
        title: '', 
        series: singleArtwork.series, // Behou serie voor sneller invoeren
        year: new Date().getFullYear().toString(), 
        medium: 'Olieverf op doek', 
        description: '', 
        imageUrl: '', 
        imageHint: 'abstract painting' 
      });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Fout", description: "Kon schilderij niet opslaan." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulk = async () => {
    if (!firestore || !bulkJson) return;
    
    setLoading(true);
    try {
      const artworksData = JSON.parse(bulkJson);
      if (!Array.isArray(artworksData)) throw new Error("Input moet een array zijn");

      const artworkCol = collection(firestore, 'artworks');
      let count = 0;
      
      for (const art of artworksData) {
        await addDoc(artworkCol, {
          ...art,
          createdAt: serverTimestamp()
        });
        count++;
      }

      toast({ title: "Bulk Succes", description: `${count} schilderijen toegevoegd.` });
      setBulkJson('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "JSON Fout", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (!confirm("Weet je zeker dat je dit schilderij wilt verwijderen uit de database?")) return;

    try {
      await deleteDoc(doc(firestore, 'artworks', id));
      toast({ title: "Verwijderd", description: "Het schilderij is uit de database gehaald." });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout", description: "Kon niet verwijderen." });
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
    toast({ title: "JSON Gegenereerd", description: "Ga naar de Bulk Import tab om het op te slaan." });
  };

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const names = Array.from(files)
      .map(file => {
        // Haal extensie weg en vervang underscores/streepjes door spaties
        let name = file.name.split('.').slice(0, -1).join('.');
        return name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      });
    
    setRawList(prev => (prev ? prev + '\n' + names.join('\n') : names.join('\n')));
    toast({ title: "Map Gescannd", description: `${names.length} titels toegevoegd aan de lijst.` });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-light mb-2">Portfolio <span className="italic">Beheer</span></h1>
          <p className="text-muted-foreground">Beheer de eigen database van de app.</p>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Database className="w-4 h-4" /> Database
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Nieuw
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" /> Bulk Import
            </TabsTrigger>
            <TabsTrigger value="helper" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> Scan Mappen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-light">Database Inhoud</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingArtworks ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : artworks && artworks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Beeld</th>
                          <th className="pb-3 font-medium">Titel</th>
                          <th className="pb-3 font-medium">Serie</th>
                          <th className="pb-3 font-medium">Jaar</th>
                          <th className="pb-3 font-medium text-right">Acties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {artworks.map((art: any) => (
                          <tr key={art.id} className="group">
                            <td className="py-3">
                              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                                <Image src={art.imageUrl} alt="" fill className="object-cover" />
                              </div>
                            </td>
                            <td className="py-3 font-medium">{art.title}</td>
                            <td className="py-3 text-sm text-muted-foreground">{art.series}</td>
                            <td className="py-3 text-sm">{art.year}</td>
                            <td className="py-3 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(art.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                    De database is momenteel leeg.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-light">Nieuw Kunstwerk Toevoegen</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titel</Label>
                      <Input 
                        id="title" 
                        value={singleArtwork.title} 
                        onChange={e => setSingleArtwork({...singleArtwork, title: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="series">Serie / Collectie</Label>
                      <Input 
                        id="series" 
                        value={singleArtwork.series} 
                        onChange={e => setSingleArtwork({...singleArtwork, series: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Jaar</Label>
                      <Input 
                        id="year" 
                        value={singleArtwork.year} 
                        onChange={e => setSingleArtwork({...singleArtwork, year: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medium">Medium</Label>
                      <Input 
                        id="medium" 
                        value={singleArtwork.medium} 
                        onChange={e => setSingleArtwork({...singleArtwork, medium: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Afbeelding URL (Link naar de foto)</Label>
                    <Input 
                      id="imageUrl" 
                      placeholder="https://jouw-site.nl/fotos/mijn-werk.jpg"
                      value={singleArtwork.imageUrl} 
                      onChange={e => setSingleArtwork({...singleArtwork, imageUrl: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschrijving</Label>
                    <Textarea 
                      id="description" 
                      className="min-h-[100px]"
                      value={singleArtwork.description} 
                      onChange={e => setSingleArtwork({...singleArtwork, description: e.target.value})} 
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Direct Opslaan in Database"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-light">Bulk Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Plak hier een JSON lijst. Gebruik de <strong>Scan Mappen</strong> tab om deze lijst automatisch te genereren op basis van je bestanden.
                </p>
                <Textarea 
                  placeholder='[ { "title": "...", "series": "...", "imageUrl": "..." } ]'
                  className="min-h-[300px] font-mono text-xs"
                  value={bulkJson}
                  onChange={e => setBulkJson(e.target.value)}
                />
                <Button 
                  onClick={handleAddBulk} 
                  className="w-full h-12 rounded-full" 
                  disabled={loading || !bulkJson}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Database className="mr-2 w-4 h-4" /> Alles naar Database Sturen</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="helper">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-light">Mappen Scanner & Helper</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 border-2 border-dashed border-border rounded-xl bg-secondary/10 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Scan je lokale mappen</h3>
                  <p className="text-sm text-muted-foreground mb-4">Selecteer de foto's op je computer. Wij halen de namen eruit om een lijst te maken.</p>
                  <Input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-scanner"
                    onChange={handleFileScan}
                    accept="image/*"
                  />
                  <Button variant="outline" className="rounded-full" asChild>
                    <label htmlFor="file-scanner" className="cursor-pointer">
                      <FolderOpen className="mr-2 w-4 h-4" /> Selecteer Foto's
                    </label>
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label>Lijst met Titels (wordt automatisch gevuld of handmatig typen)</Label>
                  <Textarea 
                    placeholder="Zonsopgang&#10;Stille Oceaan&#10;Abstract Bos"
                    className="min-h-[150px]"
                    value={rawList}
                    onChange={e => setRawList(e.target.value)}
                  />
                  <Button 
                    onClick={generateJsonFromList} 
                    variant="secondary"
                    className="w-full h-12 rounded-full" 
                    disabled={!rawList}
                  >
                    <Wand2 className="mr-2 w-4 h-4" /> Maak JSON voor Bulk Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
