"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Plus,
  LayoutDashboard,
  Layers,
  Edit3,
  Search,
  Settings,
  Languages,
  X,
  CheckCircle2,
  Users,
  Archive,
  Library,
  ChevronDown,
  Sparkles,
  Zap
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
  DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sanitizeArtwork, MUSEUM_TAGS, slugify } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { verifyAdminPassword } from '@/lib/admin-actions';

export default function AdminPage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [selectedArtworks, setSelectedItems] = useState<string[]>([]);
  
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: '', featured: false, inShop: false
  });
  
  const [roomForm, setRoomForm] = useState({ title: '', description: '', order: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('title', 'asc'));
  }, [firestore]);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter((art: any) => 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artworks, searchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Fout", description: "Wachtwoord onjuist." });
    }
    setIsVerifying(false);
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;
    const data = sanitizeArtwork({
      ...artworkForm,
      tags: typeof artworkForm.tags === 'string' ? artworkForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : artworkForm.tags
    });

    try {
      if (editingArtwork) {
        await updateDoc(doc(firestore, 'artworks', editingArtwork.id), data);
        toast({ title: "Bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'artworks'), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Toegevoegd" });
      }
      setIsArtworkDialogOpen(false);
    } catch (e) { toast({ variant: "destructive", title: "Fout bij opslaan" }); }
  };

  const handleSaveRoom = async () => {
    if (!firestore) return;
    const slug = slugify(roomForm.title);
    const data = { ...roomForm, slug, updatedAt: serverTimestamp() };

    try {
      if (editingRoom) {
        await updateDoc(doc(firestore, 'rooms', editingRoom.id), data);
        toast({ title: "Zaal bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'rooms'), { ...data, createdAt: serverTimestamp(), isPublic: true });
        toast({ title: "Zaal aangemaakt" });
      }
      setIsRoomDialogOpen(false);
    } catch (e) { toast({ variant: "destructive", title: "Fout bij opslaan" }); }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!firestore || !confirm(`Weet u zeker dat u '${room.title}' wilt verwijderen? De schilderijen blijven behouden.`)) return;
    try {
      const associated = artworks?.filter((a: any) => a.roomIds?.includes(room.id)) || [];
      for (const art of associated) {
        await updateDoc(doc(firestore, 'artworks', art.id), {
          roomIds: arrayRemove(room.id)
        });
      }
      await deleteDoc(doc(firestore, 'rooms', room.id));
      toast({ title: "Zaal verwijderd", description: `${associated.length} koppelingen opgeschoond.` });
    } catch (e) { toast({ variant: "destructive", title: "Verwijderen mislukt" }); }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkAddToRoom = async (roomId: string, roomTitle: string) => {
    if (!firestore || selectedArtworks.length === 0) return;
    try {
      for (const id of selectedArtworks) {
        await updateDoc(doc(firestore, 'artworks', id), {
          roomIds: arrayUnion(roomId)
        });
      }
      toast({ title: "Bulk update voltooid", description: `${selectedArtworks.length} items toegevoegd aan '${roomTitle}'` });
      setSelectedItems([]);
    } catch (e) { toast({ variant: "destructive", title: "Bulk update mislukt" }); }
  };

  const bulkRemoveFromRoom = async (roomId: string, roomTitle: string) => {
    if (!firestore || selectedArtworks.length === 0) return;
    try {
      for (const id of selectedArtworks) {
        await updateDoc(doc(firestore, 'artworks', id), {
          roomIds: arrayRemove(roomId)
        });
      }
      toast({ title: "Items verwijderd", description: `${selectedArtworks.length} items verwijderd uit '${roomTitle}'` });
      setSelectedItems([]);
    } catch (e) { toast({ variant: "destructive", title: "Fout bij verwijderen" }); }
  };

  const bulkAddTag = async (tag: string) => {
    if (!firestore || selectedArtworks.length === 0) return;
    try {
      for (const id of selectedArtworks) {
        await updateDoc(doc(firestore, 'artworks', id), {
          tags: arrayUnion(tag)
        });
      }
      toast({ title: "Tag toegevoegd", description: `'${tag}' toegevoegd aan selectie.` });
    } catch (e) { toast({ variant: "destructive", title: "Fout bij taggen" }); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
                 <Settings className="w-10 h-10" />
              </div>
              <h1 className="font-headline text-3xl italic">Museum <span className="text-accent">Beheer</span></h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-black tracking-widest ml-4 opacity-40">Toegangscode</Label>
                 <Input 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)} 
                   className="h-14 rounded-2xl text-center bg-black/5 border-none text-xl" 
                   placeholder="••••••"
                   autoFocus
                 />
              </div>
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px]">
                 {isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendel Beheer"}
              </Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-6 h-6 text-accent" />
            <h1 className="font-headline text-2xl italic">Museum Beheer</h1>
          </div>
          <div className="h-8 w-px bg-black/10 mx-2" />
          <div className="flex items-center gap-2">
            <Link href="/admin/forum" className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 text-accent hover:bg-accent hover:text-white transition-all">
               <Users className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Moderatie Forum</span>
            </Link>
            <Link href="/admin/team" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white transition-all">
               <Zap className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Team Hub (Mark & Co)</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Link href="/admin/translate" className="h-12 px-6 rounded-full border-2 flex items-center gap-3 hover:bg-black/5">
             <Languages className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Vertalingen & Story DTP</span>
           </Link>
           <Button onClick={() => { setEditingArtwork(null); setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: '', featured: false, inShop: false }); setIsArtworkDialogOpen(true); }} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px]">
             <Plus className="w-4 h-4 mr-2" /> Nieuw Kunstwerk
           </Button>
        </div>
      </header>

      {selectedArtworks.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground p-4 px-8 rounded-full shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex items-center gap-3 border-r border-white/20 pr-8">
              <Badge className="bg-accent text-white rounded-full h-8 w-8 flex items-center justify-center p-0 font-bold">{selectedArtworks.length}</Badge>
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Items geselecteerd</span>
           </div>
           
           <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-5 rounded-full hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">
                    <Library className="w-4 h-4 mr-2" /> Toevoegen aan zaal <ChevronDown className="w-3 h-3 ml-2 opacity-40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 min-w-[200px]">
                   {rooms?.map((r: any) => (
                     <DropdownMenuItem key={r.id} onClick={() => bulkAddToRoom(r.id, r.title)} className="rounded-xl p-3 text-[10px] font-bold uppercase tracking-widest">
                       {r.title}
                     </DropdownMenuItem>
                   ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-5 rounded-full hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 mr-2" /> Tag toevoegen <ChevronDown className="w-3 h-3 ml-2 opacity-40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto">
                   {Object.values(MUSEUM_TAGS).flat().map(tag => (
                     <DropdownMenuItem key={tag} onClick={() => bulkAddTag(tag)} className="rounded-xl p-3 text-[10px] font-bold uppercase tracking-widest">
                       {tag}
                     </DropdownMenuItem>
                   ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" onClick={() => setSelectedItems([])} className="h-10 w-10 rounded-full hover:bg-destructive hover:text-white p-0">
                <X className="w-4 h-4" />
              </Button>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-12 pb-48">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-lg">
            <TabsTrigger value="archive" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest">
              <Archive className="w-4 h-4 mr-2" /> Volledig Archief
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen & Curatie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-8 mt-0">
            <div className="flex items-center justify-between gap-8 bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                 <Input 
                   placeholder="Zoek in archief..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="h-14 pl-14 rounded-2xl bg-white border-none shadow-inner"
                 />
               </div>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40">
                  <Library className="w-4 h-4" /> {artworks?.length || 0} items totaal
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {artLoading ? (
                Array(12).fill(0).map((_, i) => <div key={i} className="aspect-[4/5] bg-black/5 animate-pulse rounded-3xl" />)
              ) : filteredArtworks.map((art: any) => (
                <Card 
                  key={art.id} 
                  className={cn(
                    "group relative aspect-[4/5] rounded-[2rem] overflow-hidden border-none shadow-md transition-all cursor-pointer",
                    selectedArtworks.includes(art.id) ? "ring-4 ring-accent ring-offset-4 scale-95" : "hover:shadow-2xl"
                  )}
                  onClick={() => toggleSelection(art.id)}
                >
                   {art.image && (
                     <img 
                      src={art.image} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      style={{ filter: `brightness(${art.brightness || 1})` }}
                      alt="" 
                     />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-bold text-xs truncate px-1">{art.displayTitle || art.title}</h3>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-1">{art.year}</p>
                   </div>
                   
                   <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={(e) => { 
                          e.stopPropagation();
                          setEditingArtwork(art); 
                          setArtworkForm({ ...art, tags: (art.tags || []).join(', ') }); 
                          setIsArtworkDialogOpen(true); 
                        }} 
                        className="rounded-full bg-white text-black hover:bg-white/80 w-10 h-10 shadow-xl"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      {selectedArtworks.includes(art.id) && (
                        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-xl animate-in zoom-in">
                           <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                   </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8 mt-0">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div>
                  <h2 className="font-headline text-3xl italic">Interactieve Zalen</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Schilderijen in zalen slepen is uitgeschakeld. Gebruik het snelmenu.</p>
               </div>
               <Button onClick={() => { setEditingRoom(null); setRoomForm({ title: '', description: '', order: (rooms?.length || 0) + 1 }); setIsRoomDialogOpen(true); }} className="h-12 rounded-full border-2 bg-white text-black hover:bg-black/5 px-8 font-black uppercase tracking-widest text-[10px]">
                 <Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal
               </Button>
            </div>

            <Accordion type="multiple" className="space-y-6">
               {rooms?.map((room: any) => {
                 const roomArtworks = artworks?.filter((a: any) => a.roomIds?.includes(room.id)) || [];
                 return (
                   <AccordionItem key={room.id} value={room.id} className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border-none shadow-xl overflow-hidden">
                      <div className="flex items-center px-10 h-24">
                        <AccordionTrigger className="flex-1 hover:no-underline">
                           <div className="flex items-center gap-6">
                              <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent">{room.order}</span>
                              <div className="text-left">
                                 <h3 className="font-headline text-2xl italic leading-none">{room.title}</h3>
                                 <span className="text-[9px] font-black uppercase tracking-widest opacity-30 mt-1.5 block">{roomArtworks.length} schilderijen in deze zaal</span>
                              </div>
                           </div>
                        </AccordionTrigger>
                        
                        <div className="flex items-center gap-3 pl-8 border-l ml-8">
                           <Button size="icon" variant="ghost" onClick={() => { setEditingRoom(room); setRoomForm({ ...room }); setIsRoomDialogOpen(true); }} className="h-12 w-12 rounded-full hover:bg-black/5"><Edit3 className="w-4 h-4" /></Button>
                           <Button size="icon" variant="ghost" onClick={() => handleDeleteRoom(room)} className="h-12 w-12 rounded-full hover:bg-destructive/10 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      <AccordionContent className="px-10 pb-10">
                         <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-4 pt-4 border-t">
                            {roomArtworks.map((art: any) => (
                              <div key={art.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5">
                                 <img src={art.image} className="w-full h-full object-cover" alt="" />
                                 <button 
                                  onClick={() => {
                                    setSelectedItems([art.id]);
                                    bulkRemoveFromRoom(room.id, room.title);
                                  }}
                                  className="absolute inset-0 bg-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                 >
                                   <X className="w-5 h-5" />
                                 </button>
                              </div>
                            ))}
                            {roomArtworks.length === 0 && (
                              <div className="col-span-full py-12 text-center opacity-20 italic">Geen schilderijen in deze zaal. Selecteer items in het archief om ze hieraan toe te voegen.</div>
                            )}
                         </div>
                      </AccordionContent>
                   </AccordionItem>
                 );
               })}
            </Accordion>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[3rem] p-12">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">{editingArtwork ? 'Kunstwerk Bewerken' : 'Nieuw Kunstwerk'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-10 pt-6">
             <div className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Titel (Archief)</Label>
                   <Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Titel (Publicatie)</Label>
                   <Input value={artworkForm.displayTitle} onChange={e => setArtworkForm({...artworkForm, displayTitle: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Jaar</Label>
                    <Input value={artworkForm.year} onChange={e => setArtworkForm({...artworkForm, year: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Techniek</Label>
                    <Input value={artworkForm.medium} onChange={e => setArtworkForm({...artworkForm, medium: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                  </div>
                </div>
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Afbeelding URL</Label>
                   <Input value={artworkForm.image} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none font-mono text-xs" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Beschrijving</Label>
                   <Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="min-h-[160px] rounded-[2rem] bg-black/5 border-none p-6" />
                </div>
             </div>
          </div>
          <DialogFooter className="mt-12">
             <Button onClick={handleSaveArtwork} className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs">Wijzigingen Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-md rounded-[3rem] p-12">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">{editingRoom ? 'Zaal Bewerken' : 'Nieuwe Zaal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-6">
             <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Naam van de Zaal</Label>
                <Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Volgorde</Label>
                <Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: Number(e.target.value)})} className="h-14 rounded-2xl bg-black/5 border-none" />
             </div>
          </div>
          <DialogFooter className="mt-10">
             <Button onClick={handleSaveRoom} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs">Zaal Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
