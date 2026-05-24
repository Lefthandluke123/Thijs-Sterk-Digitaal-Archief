
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, deleteDoc, query, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Search,
  Palette,
  CheckSquare,
  X,
  Lock,
  Tag as TagIcon,
  Crop,
  Plus,
  Upload,
  Mic,
  ImageIcon,
  LayoutDashboard,
  Layers,
  Settings as SettingsIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('artworks');

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setIsAuthorized(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    if (await verifyAdminPassword(password)) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Fout", description: "Wachtwoord onjuist." });
    }
    setIsVerifying(false);
  };

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore, isAuthorized]);
  const { data: artworks } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, isAuthorized]);
  const { data: rooms } = useCollection(roomsQuery);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter((art: any) => 
      (art.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.roomSlug || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artworks, searchQuery]);

  const handleAddArtwork = async () => {
    if (!firestore) return;
    const newDoc = await addDoc(collection(firestore, 'artworks'), {
      title: 'Nieuw Werk',
      slug: `werk-${Date.now()}`,
      image: '',
      roomSlug: rooms?.[0]?.slug || 'onbekend',
      createdAt: serverTimestamp(),
      brightness: 1,
      tags: []
    });
    setEditingArtworkId(newDoc.id);
  };

  const handleAddRoom = async () => {
    if (!firestore) return;
    const newDoc = await addDoc(collection(firestore, 'rooms'), {
      title: 'Nieuwe Zaal',
      slug: `zaal-${Date.now()}`,
      description: '',
      order: (rooms?.length || 0) + 1
    });
    setEditingRoomId(newDoc.id);
  };

  const updateField = (col: string, id: string, field: string, value: any) => {
    if (!firestore) return;
    const ref = doc(firestore, col, id);
    updateDoc(ref, { [field]: value }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'update' }));
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Beheer Toegang</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary">
                 {isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendel"}
              </Button>
           </form>
        </Card>
      </div>
    );
  }

  const editingArtwork = artworks?.find((a: any) => a.id === editingArtworkId);
  const editingRoom = rooms?.find((r: any) => r.id === editingRoomId);

  return (
    <div className="min-h-screen bg-background pt-32 px-8">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LayoutDashboard className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-headline text-2xl">Museum <span className="italic">Manager</span></h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-accent">Safe Harbor Architecture</p>
          </div>
        </div>
        <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           <ArrowLeft className="w-3 h-3" /> Website
        </Link>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto space-y-12 pb-32">
        <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14">
          <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest"><Palette className="w-4 h-4 mr-2" /> Schilderijen</TabsTrigger>
          <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest"><Layers className="w-4 h-4 mr-2" /> Zalen</TabsTrigger>
        </TabsList>

        <TabsContent value="artworks" className="space-y-8">
           <div className="flex gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
               <Input placeholder="Zoek op titel of zaal..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-14 rounded-2xl" />
             </div>
             <Button onClick={handleAddArtwork} className="h-14 px-8 rounded-2xl bg-accent"><Plus className="w-4 h-4 mr-2" /> Nieuw Werk</Button>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredArtworks.map((art: any) => (
                <Card key={art.id} className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all border-none shadow-md" onClick={() => setEditingArtworkId(art.id)}>
                   <div className="aspect-square bg-muted/20 relative">
                      {art.image ? <img src={art.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Palette /></div>}
                      <div className="absolute top-2 right-2 bg-black/40 text-white text-[8px] px-2 py-1 rounded-full backdrop-blur-md uppercase font-bold">{art.roomSlug}</div>
                   </div>
                   <div className="p-3 bg-white">
                      <h3 className="text-[10px] font-bold uppercase truncate">{art.title}</h3>
                   </div>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-8">
           <div className="flex justify-end"><Button onClick={handleAddRoom} className="h-14 px-8 rounded-2xl bg-accent"><Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal</Button></div>
           <div className="grid md:grid-cols-3 gap-6">
              {rooms?.map((room: any) => (
                <Card key={room.id} className="p-6 rounded-[2rem] border-none shadow-md space-y-4 hover:shadow-xl transition-all cursor-pointer" onClick={() => setEditingRoomId(room.id)}>
                   <div className="flex justify-between items-start">
                      <h3 className="font-headline text-xl">{room.title}</h3>
                      <span className="text-[10px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full">#{room.order}</span>
                   </div>
                   <p className="text-xs text-muted-foreground line-clamp-2">{room.description || 'Geen omschrijving.'}</p>
                   <div className="pt-4 border-t flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                      <span>Slug: {room.slug}</span>
                      <span>{artworks?.filter((a: any) => a.roomSlug === room.slug).length || 0} werken</span>
                   </div>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingArtworkId} onOpenChange={() => setEditingArtworkId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-10 rounded-[3rem]">
           <DialogTitle className="font-headline text-3xl italic mb-8">Editor: {editingArtwork?.title}</DialogTitle>
           {editingArtwork && (
             <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                   <div className="aspect-[4/5] rounded-3xl bg-muted/20 relative overflow-hidden shadow-2xl">
                      {editingArtwork.image && <img src={editingArtwork.image} className="w-full h-full object-cover" style={{ filter: `brightness(${editingArtwork.brightness || 1})` }} />}
                   </div>
                   <Input placeholder="Beeld URL" defaultValue={editingArtwork.image} onBlur={e => updateField('artworks', editingArtworkId!, 'image', e.target.value)} className="h-12 rounded-xl" />
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Helderheid</Label>
                      <Slider value={[editingArtwork.brightness || 1]} max={2} step={0.01} onValueChange={([v]) => updateField('artworks', editingArtworkId!, 'brightness', v)} />
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="space-y-4">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Titel</Label><Input defaultValue={editingArtwork.title} onBlur={e => updateField('artworks', editingArtworkId!, 'title', e.target.value)} className="h-12 rounded-xl" /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Slug (URL)</Label><Input defaultValue={editingArtwork.slug} onBlur={e => updateField('artworks', editingArtworkId!, 'slug', e.target.value)} className="h-12 rounded-xl" /></div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold">Zaal</Label>
                        <Select value={editingArtwork.roomSlug} onValueChange={v => updateField('artworks', editingArtworkId!, 'roomSlug', v)}>
                          <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{rooms?.map((r: any) => <SelectItem key={r.slug} value={r.slug}>{r.title}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Jaar</Label><Input defaultValue={editingArtwork.year} onBlur={e => updateField('artworks', editingArtworkId!, 'year', e.target.value)} className="h-12 rounded-xl" /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Techniek</Label><Input defaultValue={editingArtwork.medium} onBlur={e => updateField('artworks', editingArtworkId!, 'medium', e.target.value)} className="h-12 rounded-xl" /></div>
                   </div>
                   <Button variant="destructive" className="w-full h-14 rounded-2xl" onClick={() => { if(confirm('Zeker?')) deleteDoc(doc(firestore!, 'artworks', editingArtworkId!)).then(() => setEditingArtworkId(null)); }}><Trash2 className="w-4 h-4 mr-2" /> Verwijder</Button>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRoomId} onOpenChange={() => setEditingRoomId(null)}>
        <DialogContent className="max-w-md p-10 rounded-[3rem]">
           <DialogTitle className="font-headline text-3xl italic mb-6">Zaal Aanpassen</DialogTitle>
           {editingRoom && (
             <div className="space-y-6">
                <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Titel</Label><Input defaultValue={editingRoom.title} onBlur={e => updateField('rooms', editingRoomId!, 'title', e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Slug</Label><Input defaultValue={editingRoom.slug} onBlur={e => updateField('rooms', editingRoomId!, 'slug', e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Volgorde</Label><Input type="number" defaultValue={editingRoom.order} onBlur={e => updateField('rooms', editingRoomId!, 'order', parseInt(e.target.value))} className="h-12 rounded-xl" /></div>
                <Button variant="destructive" className="w-full h-14 rounded-2xl" onClick={() => { if(confirm('Zeker?')) deleteDoc(doc(firestore!, 'rooms', editingRoomId!)).then(() => setEditingRoomId(null)); }}><Trash2 className="w-4 h-4 mr-2" /> Verwijder Zaal</Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
