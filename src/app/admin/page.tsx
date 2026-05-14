"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Plus,
  X,
  Save,
  Loader2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('db');
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  
  // Wachtwoord beveiliging: 'gabbes'
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Formulier voor handmatig toevoegen
  const [newArtwork, setNewArtwork] = useState({
    title: "",
    series: "Onbekend",
    year: "",
    medium: "Olieverf op doek",
    description: "",
    imageUrl: "",
    imageHint: "painting"
  });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading: dbLoading } = useCollection(artworksQuery);

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
      tags: [],
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0,
      brightness: 1,
      createdAt: serverTimestamp(),
    };

    addDoc(artworkCol, data)
      .then(() => {
        toast({ title: "Toegevoegd", description: `${newArtwork.title} staat nu in het archief.` });
        setNewArtwork({ title: "", series: "Onbekend", year: "", medium: "Olieverf op doek", description: "", imageUrl: "", imageHint: "painting" });
        setActiveTab('db');
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

  const handleAddTag = async (artId: string, currentTags: string[]) => {
    if (!firestore) return;
    const tagValue = newTagInputs[artId]?.trim();
    if (!tagValue || currentTags?.includes(tagValue)) return;
    
    const updatedTags = [...(currentTags || []), tagValue];
    const artRef = doc(firestore, 'artworks', artId);
    
    updateDoc(artRef, { tags: updatedTags })
      .then(() => {
        setNewTagInputs(prev => ({ ...prev, [artId]: "" }));
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: { tags: updatedTags }
        }));
      });
  };

  const handleRemoveTag = async (artId: string, tagToRemove: string, currentTags: string[]) => {
    if (!firestore) return;
    const updatedTags = (currentTags || []).filter(t => t !== tagToRemove);
    const artRef = doc(firestore, 'artworks', artId);
    updateDoc(artRef, { tags: updatedTags })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: artRef.path,
          operation: 'update',
          requestResourceData: { tags: updatedTags }
        }));
      });
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

  const handleSeedDatabase = async () => {
    if (!firestore) return;
    setLoading(true);
    const artworkCol = collection(firestore, 'artworks');
    
    try {
      const artworksToSeed = PlaceHolderImages.filter(img => img.id.startsWith('artwork-'));
      for (const item of artworksToSeed) {
        await addDoc(artworkCol, {
          title: item.title || 'Ongetiteld',
          series: item.series || 'Collectie',
          year: item.year || 'Onbekend',
          medium: item.medium || 'Olieverf',
          imageUrl: item.imageUrl,
          description: item.description,
          imageHint: item.imageHint,
          tags: [],
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          brightness: 1,
          createdAt: serverTimestamp(),
        });
      }
      toast({ title: "Database gevuld met voorbeelden" });
      setActiveTab('db');
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij vullen" });
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-2xl font-headline font-light mb-2">Beheer Toegang</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Voer het wachtwoord in om het atelier te betreden</p>
            </div>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <Input 
                type="password" 
                placeholder="Wachtwoord" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-center rounded-xl border-border focus:ring-accent"
                autoFocus
              />
              <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-widest shadow-lg">
                Betreden
              </Button>
            </form>
            <Link href="/" className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors pt-4 flex items-center gap-2">
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
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">T</div>
            <span className="font-bold text-[10px] uppercase tracking-[0.2em] hidden sm:block">Atelier Beheer</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Button variant={activeTab === 'db' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('db')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Archief</Button>
            <Button variant={activeTab === 'new' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('new')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Nieuw Werk</Button>
            <Button variant={activeTab === 'system' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('system')} className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest">Systeem</Button>
          </nav>
        </div>
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/">Bekijk Site</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
        {activeTab === 'db' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <h2 className="text-3xl font-headline font-light">Mijn Archief <span className="text-muted-foreground text-sm font-sans uppercase tracking-widest">({artworks?.length || 0} werken)</span></h2>
            </div>
            
            {dbLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks?.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden bg-card border-border rounded-2xl group">
                    <div className="relative aspect-[4/3] bg-muted/20">
                      <Image 
                        src={art.imageUrl} 
                        alt={art.title} 
                        fill 
                        className="object-cover" 
                        unoptimized={true} 
                        style={{
                          clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                          filter: `brightness(${art.brightness || 1})`
                        }}
                      />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full h-8 w-8 shadow-lg"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-headline text-xl font-light mb-1">{art.title}</h4>
                      <p className="text-[9px] text-accent font-bold uppercase tracking-widest mb-4">{art.series} &bull; {art.year || 'Jaar onbekend'}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {art.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="gap-1 py-0.5 px-2 rounded-full text-[8px] font-bold uppercase tracking-widest bg-primary/5">
                            {tag}
                            <button onClick={() => handleRemoveTag(art.id, tag, art.tags)}><X className="w-3 h-3" /></button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input 
                          value={newTagInputs[art.id] || ""} 
                          onChange={(e) => setNewTagInputs(prev => ({ ...prev, [art.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(art.id, art.tags) }}
                          placeholder="Tag toevoegen..." className="h-8 text-[9px] rounded-full"
                        />
                        <Button variant="outline" size="icon" onClick={() => handleAddTag(art.id, art.tags)} className="h-8 w-8 rounded-full"><Plus className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'new' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-headline font-light mb-8 text-center">Nieuw Kunstwerk Toevoegen</h2>
            <Card className="p-8 rounded-3xl border-border bg-card/50">
              <form onSubmit={handleAddManualArtwork} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold">Titel</Label>
                  <Input 
                    value={newArtwork.title} 
                    onChange={(e) => setNewArtwork(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="bijv. Licht over de Polder"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold">Serie / Collectie</Label>
                    <Input 
                      value={newArtwork.series} 
                      onChange={(e) => setNewArtwork(prev => ({ ...prev, series: e.target.value }))}
                      placeholder="bijv. Landschappen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold">Jaar</Label>
                    <Input 
                      value={newArtwork.year} 
                      onChange={(e) => setNewArtwork(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="bijv. 1964"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold">Medium</Label>
                  <Input 
                    value={newArtwork.medium} 
                    onChange={(e) => setNewArtwork(prev => ({ ...prev, medium: e.target.value }))}
                    placeholder="bijv. Olieverf op doek"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold">Afbeelding URL</Label>
                  <Input 
                    value={newArtwork.imageUrl} 
                    onChange={(e) => setNewArtwork(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    required
                  />
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Plak hier de directe link naar de afbeelding (bijv. van Google Drive of NAS).</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold">Beschrijving</Label>
                  <Textarea 
                    value={newArtwork.description} 
                    onChange={(e) => setNewArtwork(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Korte toelichting bij het werk..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-lg">
                  {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-4 h-4" /> Opslaan in Archief</>}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl font-headline font-light text-center">Systeeminstellingen</h2>
            <Card className="p-8 space-y-6 rounded-3xl bg-card/30">
              <div className="flex items-center justify-between p-6 bg-background rounded-2xl border">
                <div>
                  <h3 className="text-xl font-headline font-light">Voorbeelden Herstellen</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Vul de database met de basiscollectie</p>
                </div>
                <Button onClick={handleSeedDatabase} disabled={loading} className="h-10 px-6 font-bold text-[10px] uppercase tracking-widest">Seed DB</Button>
              </div>
              
              <div className="flex items-center justify-between p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                <div>
                  <h3 className="text-xl font-headline font-light text-destructive">Database Opschonen</h3>
                  <p className="text-[9px] text-destructive/60 uppercase tracking-widest">Verwijder alle kunstwerken uit de cloud</p>
                </div>
                <Button variant="outline" onClick={async () => {
                  if (!firestore || !confirm("Weet je dit heel zeker? Alle kunstwerken worden definitief gewist.")) return;
                  setLoading(true);
                  const snaps = await getDocs(collection(firestore, 'artworks'));
                  for (const d of snaps.docs) {
                    await deleteDoc(d.ref);
                  }
                  toast({ title: "Archief leeggemaakt" });
                  setLoading(false);
                }} disabled={loading} className="h-10 px-6 border-destructive text-destructive font-bold text-[10px] uppercase tracking-widest">Reset DB</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
