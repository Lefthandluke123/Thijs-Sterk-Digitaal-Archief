
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  setDoc 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Palette,
  Lock,
  Plus,
  LayoutDashboard,
  Layers,
  Languages,
  Edit3,
  Sparkles,
  FileText,
  Save,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('artworks');

  // Room Dialog State
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ title: '', slug: '', description: '', order: 0 });

  // Artwork Dialog State
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [artworkForm, setArtworkForm] = useState({ 
    title: '', 
    slug: '', 
    image: '', 
    roomSlug: '', 
    newRoomTitle: '', // Extra veld voor on-the-fly creatie
    year: '', 
    medium: '', 
    description: '',
    featured: false,
    inShop: false,
    tags: ''
  });

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

  // --- Room Actions ---
  const handleOpenRoomDialog = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({ title: room.title, slug: room.slug, description: room.description || '', order: room.order || 0 });
    } else {
      setEditingRoom(null);
      setRoomForm({ title: '', slug: '', description: '', order: (rooms?.length || 0) + 1 });
    }
    setIsRoomDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!firestore) return;
    try {
      if (editingRoom) {
        await updateDoc(doc(firestore, 'rooms', editingRoom.id), roomForm);
        toast({ title: "Zaal bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'rooms'), { ...roomForm, createdAt: serverTimestamp() });
        toast({ title: "Zaal aangemaakt" });
      }
      setIsRoomDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon zaal niet opslaan." });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je deze zaal wilt verwijderen? Kunstwerken blijven bestaan maar verliezen hun koppeling.")) return;
    try {
      await deleteDoc(doc(firestore, 'rooms', id));
      toast({ title: "Zaal verwijderd" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon zaal niet verwijderen." });
    }
  };

  // --- Artwork Actions ---
  const handleOpenArtworkDialog = (art?: any) => {
    if (art) {
      setEditingArtwork(art);
      setArtworkForm({ 
        title: art.title, 
        slug: art.slug, 
        image: art.image || art.imageUrl || '', 
        roomSlug: art.roomSlug || '', 
        newRoomTitle: '',
        year: art.year || '', 
        medium: art.medium || '', 
        description: art.description || '',
        featured: !!art.featured,
        inShop: !!art.inShop,
        tags: (art.tags || []).join(', ')
      });
    } else {
      setEditingArtwork(null);
      setArtworkForm({ 
        title: '', 
        slug: '', 
        image: '', 
        roomSlug: rooms?.[0]?.slug || '', 
        newRoomTitle: '',
        year: '', 
        medium: 'Olieverf op doek', 
        description: '',
        featured: false,
        inShop: false,
        tags: ''
      });
    }
    setIsArtworkDialogOpen(true);
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;

    let finalRoomSlug = artworkForm.roomSlug;

    // Als er een nieuwe zaalnaam is ingevoerd, maak deze dan eerst aan
    if (artworkForm.newRoomTitle.trim()) {
      const existingRoom = rooms?.find(r => r.title.toLowerCase() === artworkForm.newRoomTitle.trim().toLowerCase());
      if (existingRoom) {
        finalRoomSlug = existingRoom.slug;
      } else {
        const newSlug = artworkForm.newRoomTitle.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        try {
          await addDoc(collection(firestore, 'rooms'), {
            title: artworkForm.newRoomTitle.trim(),
            slug: newSlug,
            description: `Collectie van ${artworkForm.newRoomTitle.trim()}`,
            order: (rooms?.length || 0) + 1,
            createdAt: serverTimestamp()
          });
          finalRoomSlug = newSlug;
          toast({ title: `Nieuwe zaal '${artworkForm.newRoomTitle}' aangemaakt` });
        } catch (err) {
          console.error("Fout bij aanmaken zaal:", err);
          toast({ variant: "destructive", title: "Zaal fout", description: "Kon nieuwe zaal niet aanmaken." });
          return;
        }
      }
    }

    const finalData = {
      title: artworkForm.title,
      slug: artworkForm.slug,
      image: artworkForm.image,
      roomSlug: finalRoomSlug,
      year: artworkForm.year,
      medium: artworkForm.medium,
      description: artworkForm.description,
      featured: artworkForm.featured,
      inShop: artworkForm.inShop,
      tags: artworkForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: editingArtwork ? editingArtwork.createdAt : serverTimestamp()
    };

    try {
      if (editingArtwork) {
        await updateDoc(doc(firestore, 'artworks', editingArtwork.id), finalData);
        toast({ title: "Kunstwerk bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'artworks'), finalData);
        toast({ title: "Kunstwerk toegevoegd" });
      }
      setIsArtworkDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon kunstwerk niet opslaan." });
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    if (!firestore || !confirm("Weet je zeker dat je dit kunstwerk wilt verwijderen uit het archief?")) return;
    try {
      await deleteDoc(doc(firestore, 'artworks', id));
      toast({ title: "Kunstwerk verwijderd" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon kunstwerk niet verwijderen." });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Museum Beheer</h1>
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-32 px-8">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LayoutDashboard className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-headline text-2xl">Het Digitale <span className="italic">Archief</span></h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-accent">Real-time CMS Manager</p>
          </div>
        </div>
        <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           <ArrowLeft className="w-3 h-3" /> Naar Website
        </Link>
      </header>

      <div className="max-w-7xl mx-auto space-y-12 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14 border">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Palette className="w-4 h-4 mr-2" /> Collectie
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Languages className="w-4 h-4 mr-2" /> Vertalingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="space-y-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-headline text-3xl italic opacity-40">Kunstwerken</h2>
              <Button onClick={() => handleOpenArtworkDialog()} className="rounded-full px-8 h-12 bg-accent">
                <Plus className="w-4 h-4 mr-2" /> Werk Toevoegen
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
               {artworks?.map((art: any) => {
                 const imgSrc = art.image || art.imageUrl;
                 return (
                   <Card key={art.id} className="p-4 rounded-2xl border-none shadow-md bg-white group relative overflow-hidden">
                      <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center">
                        {imgSrc ? (
                          <img src={imgSrc} className="w-full h-full object-cover" alt={art.title} />
                        ) : (
                          <Palette className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <h3 className="font-bold text-sm truncate">{art.title}</h3>
                      <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">{art.year} • {art.roomSlug}</p>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                         <Button size="sm" onClick={() => handleOpenArtworkDialog(art)} className="rounded-full bg-white text-black hover:bg-white/90">
                           <Edit3 className="w-4 h-4" />
                         </Button>
                         <Button size="sm" variant="destructive" onClick={() => handleDeleteArtwork(art.id)} className="rounded-full">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                   </Card>
                 );
               })}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-headline text-3xl italic opacity-40">Museum Zalen</h2>
              <Button onClick={() => handleOpenRoomDialog()} className="rounded-full px-8 h-12 bg-accent">
                <Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal Toevoegen
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {rooms?.map((room: any) => (
                <Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white space-y-4">
                  <div>
                    <h3 className="font-headline text-2xl italic">{room.title}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Slug: {room.slug} • Volgorde: {room.order}</p>
                  </div>
                  <p className="text-sm opacity-60 line-clamp-2 min-h-[40px]">{room.description}</p>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleOpenRoomDialog(room)} variant="outline" className="flex-1 rounded-xl uppercase font-black text-[10px] tracking-widest">
                      <Edit3 className="w-3.5 h-3.5 mr-2" /> Bewerken
                    </Button>
                    <Button onClick={() => handleDeleteRoom(room.id)} variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/5">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="content">
            <Card className="p-16 rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Languages className="w-48 h-48" />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
                   <Sparkles className="w-10 h-10 text-accent" />
                </div>
                <div className="space-y-4">
                  <h2 className="font-headline text-4xl italic">Translation Hub & CMS</h2>
                  <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    Beheer alle teksten op de website in 5 talen. Gebruik AI om direct vertalingen te genereren voor de homepage, biografie en winkel.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button size="lg" className="h-16 px-12 rounded-full bg-primary font-black uppercase tracking-widest text-[12px] shadow-xl" asChild>
                    <Link href="/admin/translate">
                      Open Vertaal Station <ArrowLeft className="w-4 h-4 ml-3 rotate-180" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-16 px-12 rounded-full border-2 font-black uppercase tracking-widest text-[12px]">
                    <FileText className="w-4 h-4 mr-3" /> Pagina Beheer
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">{editingRoom ? 'Zaal Bewerken' : 'Nieuwe Zaal'}</DialogTitle>
            <DialogDescription>Voer de details van de museumzaal in.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Titel</Label>
              <Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="rounded-xl bg-black/5 border-none h-12" placeholder="Bijv. De Vroege Jaren" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Slug (URL)</Label>
                <Input value={roomForm.slug} onChange={e => setRoomForm({...roomForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="rounded-xl bg-black/5 border-none h-12" placeholder="vroege-jaren" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Volgorde</Label>
                <Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: parseInt(e.target.value)})} className="rounded-xl bg-black/5 border-none h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Beschrijving (NL)</Label>
              <Textarea value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})} className="rounded-2xl bg-black/5 border-none min-h-[100px]" placeholder="Korte inleiding voor de zaal..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveRoom} className="w-full h-14 rounded-2xl bg-primary">
              <Save className="w-4 h-4 mr-2" /> Zaal Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artwork Dialog */}
      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">{editingArtwork ? 'Werk Bewerken' : 'Nieuw Kunstwerk'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Titel</Label>
                <Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="rounded-xl bg-black/5 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Slug</Label>
                <Input value={artworkForm.slug} onChange={e => setArtworkForm({...artworkForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="rounded-xl bg-black/5 border-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Afbeelding URL (High Res)</Label>
              <Input value={artworkForm.image} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="rounded-xl bg-black/5 border-none" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Jaartal</Label>
                <Input value={artworkForm.year} onChange={e => setArtworkForm({...artworkForm, year: e.target.value})} className="rounded-xl bg-black/5 border-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Techniek</Label>
                <Input value={artworkForm.medium} onChange={e => setArtworkForm({...artworkForm, medium: e.target.value})} className="rounded-xl bg-black/5 border-none" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-black/5 rounded-2xl border border-black/5">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Bestaande Zaal</Label>
                <Select value={artworkForm.roomSlug} onValueChange={v => setArtworkForm({...artworkForm, roomSlug: v})}>
                  <SelectTrigger className="rounded-xl bg-white border-none shadow-sm h-12">
                    <SelectValue placeholder="Kies een zaal" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map((r: any) => (
                      <SelectItem key={r.id} value={r.slug}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Of maak een nieuwe zaal</Label>
                <Input 
                  value={artworkForm.newRoomTitle} 
                  onChange={e => setArtworkForm({...artworkForm, newRoomTitle: e.target.value})} 
                  className="rounded-xl bg-white border-none shadow-sm h-12" 
                  placeholder="Naam nieuwe zaal..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Tags (komma gescheiden)</Label>
              <Input value={artworkForm.tags} onChange={e => setArtworkForm({...artworkForm, tags: e.target.value})} className="rounded-xl bg-black/5 border-none" placeholder="Olieverf, Polder, 1960" />
            </div>
            <div className="flex gap-8 py-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="featured" checked={artworkForm.featured} onCheckedChange={(v) => setArtworkForm({...artworkForm, featured: !!v})} />
                <Label htmlFor="featured" className="text-[10px] uppercase font-black tracking-widest opacity-60">Op Homepage (Featured)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="inShop" checked={artworkForm.inShop} onCheckedChange={(v) => setArtworkForm({...artworkForm, inShop: !!v})} />
                <Label htmlFor="inShop" className="text-[10px] uppercase font-black tracking-widest opacity-60">In Museumwinkel</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Beschrijving (NL)</Label>
              <Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="rounded-2xl bg-black/5 border-none min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveArtwork} className="w-full h-14 rounded-2xl bg-primary">
              <Palette className="w-4 h-4 mr-2" /> Kunstwerk Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
