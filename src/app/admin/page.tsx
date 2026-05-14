"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Lock, 
  ArrowLeft,
  Upload,
  Plus,
  Settings2,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [bulkJson, setBulkJson] = useState('');

  const [newArtwork, setNewArtwork] = useState({
    title: "",
    series: "Onbekend",
    year: "",
    medium: "Olieverf op doek",
    description: "",
    imageUrl: "",
    imageHint: "painting",
    tags: [] as string[],
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    brightness: 1,
  });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks } = useCollection(artworksQuery);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'gabbes') {
      setIsAuthorized(true);
      toast({ title: "Toegang verleend", description: "Welkom in het atelier." });
    } else {
      toast({ variant: "destructive", title: "Fout wachtwoord", description: "Toegang geweigerd." });
    }
  };

  const handleAddManualArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newArtwork.title || !newArtwork.imageUrl) {
      toast({ variant: "destructive", title: "Invoer onvolledig", description: "Titel en Afbeelding URL zijn verplicht." });
      return;
    }

    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    const data = {
      ...newArtwork,
      createdAt: serverTimestamp(),
    };

    addDoc(artworkCol, data)
      .then(() => {
        toast({ title: "Toegevoegd", description: `${newArtwork.title} staat nu in het archief.` });
        setNewArtwork({ 
          title: "", series: "Onbekend", year: "", medium: "Olieverf op doek", 
          description: "", imageUrl: "", imageHint: "painting", 
          tags: [], cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1 
        });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artworkCol.path,
          operation: 'create',
          requestResourceData: data
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleBulkUpload = async () => {
    if (!firestore || !bulkJson) return;
    setLoading(true);
    try {
      const data = JSON.parse(bulkJson);
      const artworksArray = Array.isArray(data) ? data : [data];
      const artworkCol = collection(firestore, 'artworks');
      
      let count = 0;
      for (const item of artworksArray) {
        await addDoc(artworkCol, {
          ...item,
          createdAt: serverTimestamp(),
          cropTop: item.cropTop || 0,
          cropBottom: item.cropBottom || 0,
          cropLeft: item.cropLeft || 0,
          cropRight: item.cropRight || 0,
          brightness: item.brightness || 1,
          tags: item.tags || []
        });
        count++;
      }
      toast({ title: "Bulk Upload Geslaagd", description: `${count} werken toegevoegd.` });
      setBulkJson('');
    } catch (err) {
      toast({ variant: "destructive", title: "JSON Fout", description: "De ingevoerde tekst is geen geldige JSON." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArtwork = (artId: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit werk wilt verwijderen?")) return;
    const artRef = doc(firestore, 'artworks', artId);
    deleteDoc(artRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: artRef.path,
        operation: 'delete'
      }));
    });
  };

  const updateArtworkValue = (id: string, field: string, value: any) => {
    if (!firestore) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: artRef.path,
        operation: 'update',
        requestResourceData: { [field]: value }
      }));
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-3xl border-border bg-card/50 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-headline font-light mb-2">Atelier Beheer</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Voer het wachtwoord in</p>
            </div>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <Input 
                type="password" 
                placeholder="Wachtwoord" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-center rounded-xl"
                autoFocus
              />
              <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-widest">
                Betreden
              </Button>
            </form>
            <Link href="/" className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Terug naar de site
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <h1 className="font-headline text-xl font-light">Atelier <span className="italic">Beheer</span></h1>
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/">Bekijk Site</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="archive" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto">
            <TabsTrigger value="archive" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Archief</TabsTrigger>
            <TabsTrigger value="new" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Nieuw Werk</TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-full px-8 text-[10px] uppercase font-bold tracking-widest">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="archive">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {artworks?.map((art: any) => (
                <Card key={art.id} className="overflow-hidden bg-card border-border rounded-2xl group flex flex-col">
                  <div className="relative aspect-[4/3] bg-muted/20 overflow-hidden">
                    <Image 
                      src={art.imageUrl} 
                      alt={art.title} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                      unoptimized={true} 
                      style={{
                        clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                        filter: `brightness(${art.brightness || 1})`
                      }}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline text-xl font-light mb-1">{art.title}</h4>
                      <p className="text-[9px] text-accent font-bold uppercase tracking-widest mb-4">{art.series} &bull; {art.year || 'Onbekend'}</p>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase font-bold flex justify-between">
                          Helderheid <span>{art.brightness?.toFixed(2) || '1.00'}</span>
                        </Label>
                        <Slider 
                          defaultValue={[art.brightness || 1]} 
                          max={2} 
                          step={0.01} 
                          onValueCommit={([val]) => updateArtworkValue(art.id, 'brightness', val)} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Top</Label>
                          <Slider defaultValue={[art.cropTop || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropTop', val)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] uppercase font-bold">Crop Bottom</Label>
                          <Slider defaultValue={[art.cropBottom || 0]} max={50} step={1} onValueCommit={([val]) => updateArtworkValue(art.id, 'cropBottom', val)} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-headline font-light mb-8">Nieuw Kunstwerk</h2>
                <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                  <form onSubmit={handleAddManualArtwork} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Titel</Label>
                      <Input value={newArtwork.title} onChange={(e) => setNewArtwork(prev => ({ ...prev, title: e.target.value }))} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Serie</Label>
                      <Input value={newArtwork.series} onChange={(e) => setNewArtwork(prev => ({ ...prev, series: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Jaar</Label>
                        <Input value={newArtwork.year} onChange={(e) => setNewArtwork(prev => ({ ...prev, year: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Medium</Label>
                        <Input value={newArtwork.medium} onChange={(e) => setNewArtwork(prev => ({ ...prev, medium: e.target.value }))} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Afbeelding URL</Label>
                      <Input value={newArtwork.imageUrl} onChange={(e) => setNewArtwork(prev => ({ ...prev, imageUrl: e.target.value }))} required className="rounded-xl" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 w-4 h-4" /> Opslaan</>}
                    </Button>
                  </form>
                </Card>
              </div>

              <div className="space-y-6">
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                  <Settings2 className="w-3 h-3" /> Live Preview & Cropper
                </h2>
                <div className="sticky top-32 space-y-8">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/20 border-2 border-dashed border-border flex items-center justify-center">
                    {newArtwork.imageUrl ? (
                      <Image 
                        src={newArtwork.imageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-cover" 
                        unoptimized={true} 
                        style={{
                          clipPath: `inset(${newArtwork.cropTop}% ${newArtwork.cropRight}% ${newArtwork.cropBottom}% ${newArtwork.cropLeft}%)`,
                          filter: `brightness(${newArtwork.brightness})`
                        }}
                      />
                    ) : (
                      <div className="text-center p-8 opacity-20">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-[10px] uppercase font-bold">Geen afbeelding geladen</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold flex justify-between">Helderheid <span>{newArtwork.brightness.toFixed(2)}</span></Label>
                      <Slider value={[newArtwork.brightness]} max={2} step={0.01} onValueChange={([v]) => setNewArtwork(p => ({ ...p, brightness: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Top ({newArtwork.cropTop}%)</Label>
                        <Slider value={[newArtwork.cropTop]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropTop: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Bottom ({newArtwork.cropBottom}%)</Label>
                        <Slider value={[newArtwork.cropBottom]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropBottom: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Left ({newArtwork.cropLeft}%)</Label>
                        <Slider value={[newArtwork.cropLeft]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropLeft: v }))} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold">Crop Right ({newArtwork.cropRight}%)</Label>
                        <Slider value={[newArtwork.cropRight]} max={50} step={1} onValueChange={([v]) => setNewArtwork(p => ({ ...p, cropRight: v }))} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-headline font-light mb-2 text-center">Bulk Upload</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">Plak een JSON array van kunstwerken om ze in één keer toe te voegen.</p>
              
              <Card className="p-8 rounded-3xl border-border bg-card/50 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">JSON Data</Label>
                    <Textarea 
                      placeholder='[{"title": "Mooi Werk", "series": "Landschappen", "imageUrl": "https://..."}]' 
                      value={bulkJson} 
                      onChange={(e) => setBulkJson(e.target.value)}
                      className="min-h-[300px] font-mono text-xs rounded-2xl"
                    />
                  </div>
                  <Button onClick={handleBulkUpload} disabled={loading || !bulkJson} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest">
                    {loading ? <Loader2 className="animate-spin" /> : <><Upload className="mr-2 w-4 h-4" /> Start Bulk Import</>}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
