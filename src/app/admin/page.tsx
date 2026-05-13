
"use client";

import React, { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Database, FileJson, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  
  // Single entry state
  const [singleArtwork, setSingleArtwork] = useState({
    title: '',
    series: '',
    year: '',
    medium: '',
    description: '',
    imageUrl: '',
    imageHint: ''
  });

  // Bulk entry state
  const [bulkJson, setBulkJson] = useState('');

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
      setSingleArtwork({ title: '', series: '', year: '', medium: '', description: '', imageUrl: '', imageHint: '' });
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
      const artworks = JSON.parse(bulkJson);
      if (!Array.isArray(artworks)) throw new Error("Input moet een array zijn");

      const artworkCol = collection(firestore, 'artworks');
      let count = 0;
      
      for (const art of artworks) {
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

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-light mb-2">Beheer je <span className="italic">Portfolio</span></h1>
          <p className="text-muted-foreground">Voeg nieuwe werken toe aan de digitale galerie.</p>
        </header>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Per stuk toevoegen
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" /> Bulk toevoegen (JSON)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-light">Nieuw Kunstwerk</CardTitle>
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
                    <Label htmlFor="imageUrl">Afbeelding URL</Label>
                    <Input 
                      id="imageUrl" 
                      placeholder="https://picsum.photos/..."
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
                    {loading ? <Loader2 className="animate-spin" /> : "Opslaan in Database"}
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
                <p className="text-sm text-muted-foreground mb-4">
                  Plak hier een JSON array van objecten. Handig voor als je veel mappen tegelijk wilt invoeren.
                </p>
                <Textarea 
                  placeholder='[ { "title": "...", "series": "...", "imageUrl": "..." } ]'
                  className="min-h-[300px] font-mono text-sm"
                  value={bulkJson}
                  onChange={e => setBulkJson(e.target.value)}
                />
                <Button 
                  onClick={handleAddBulk} 
                  variant="secondary" 
                  className="w-full h-12 rounded-full" 
                  disabled={loading || !bulkJson}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Database className="mr-2 w-4 h-4" /> Bulk Uploaden</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
