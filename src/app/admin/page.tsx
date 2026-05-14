"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Lock, 
  ArrowLeft 
} from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminPage() {
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('db');
  
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

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
        <nav className="flex items-center gap-1">
          <Button variant={activeTab === 'db' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('db')} className="font-bold text-[10px] uppercase">Archief</Button>
          <Button variant={activeTab === 'new' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('new')} className="font-bold text-[10px] uppercase">Nieuw Werk</Button>
        </nav>
        <Button variant="outline" asChild className="rounded-full h-9 px-4 border-primary/20 text-primary text-[10px] uppercase tracking-widest">
          <Link href="/">Bekijk Site</Link>
        </Button>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'db' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks?.map((art: any) => (
              <Card key={art.id} className="overflow-hidden bg-card border-border rounded-2xl group">
                <div className="relative aspect-[4/3] bg-muted/20">
                  <Image src={art.imageUrl} alt={art.title} fill className="object-cover" unoptimized={true} />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h4 className="font-headline text-xl font-light mb-1">{art.title}</h4>
                  <p className="text-[9px] text-accent font-bold uppercase tracking-widest">{art.series} &bull; {art.year || 'Onbekend'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'new' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-headline font-light mb-8 text-center">Nieuw Kunstwerk</h2>
            <Card className="p-8 rounded-3xl border-border bg-card/50">
              <form onSubmit={handleAddManualArtwork} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Titel</Label>
                  <Input value={newArtwork.title} onChange={(e) => setNewArtwork(prev => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Afbeelding URL</Label>
                  <Input value={newArtwork.imageUrl} onChange={(e) => setNewArtwork(prev => ({ ...prev, imageUrl: e.target.value }))} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl font-bold uppercase">
                  {loading ? <Loader2 className="animate-spin" /> : "Opslaan"}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}