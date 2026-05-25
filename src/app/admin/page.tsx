
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  writeBatch,
  arrayUnion,
  arrayRemove
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
  Save,
  CheckSquare,
  X,
  Star,
  Search,
  Settings2,
  Hash,
  Image as ImageIcon
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle, cleanString, cleanArray, sanitizeArtwork, normalizeArtwork } from '@/lib/museum-utils';

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('artworks');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk State
  const [selectedArtIds, setSelectedArtIds] = useState<string[]>([]);
  const [isBulkDialogOpen, setIsBulkEditConfirmOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    addRoomIds: [] as string[],
    removeRoomIds: [] as string[],
    addTags: '',
    removeTags: '',
    featured: 'keep' as 'keep' | 'yes' | 'no',
    inShop: 'keep' as 'keep' | 'yes' | 'no'
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog States
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ title: '', slug: '', description: '', order: 0, isPublic: true });

  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [artworkForm, setArtworkForm] = useState({ 
    title: '', 
    displayTitle: '',
    slug: '', 
    image: '', 
    roomIds: [] as string[],
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

  // Queries - We verwijderen orderBy(createdAt) omdat docs zonder dat veld dan worden overgeslagen
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'artworks');
  }, [firestore, isAuthorized]);
  const { data: rawArtworks } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'rooms');
  }, [firestore, isAuthorized]);
  const { data: rooms } = useCollection(roomsQuery);

  const filteredAndSortedArtworks = useMemo(() => {
    if (!rawArtworks) return [];
    
    // Soft normalization toepassen op alle docs
    let list = rawArtworks.map(a => normalizeArtwork(a.id, a));
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((a: any) => 
        (a.title || "").toLowerCase().includes(s) || 
        (a.displayTitle || "").toLowerCase().includes(s) ||
        (a.tags || []).some((t: string) => t.toLowerCase().includes(s))
      );
    }
    
    return list.sort(sortArtworksByTitle);
  }, [rawArtworks, searchTerm]);

  const handleBulkSave = async () => {
    if (!firestore || !selectedArtIds.length) return;
    setIsProcessing(true);

    const batch = writeBatch(firestore);
    const tagsToAdd = cleanArray(bulkForm.addTags.split(','));
    const tagsToRemove = cleanArray(bulkForm.removeTags.split(','));
    const roomIdsToAdd = cleanArray(bulkForm.addRoomIds);
    const roomIdsToRemove = cleanArray(bulkForm.removeRoomIds);

    for (const id of selectedArtIds) {
      const artRef = doc(firestore, 'artworks', id);
      const updateData: any = { updatedAt: serverTimestamp() };

      if (roomIdsToAdd.length > 0) updateData.roomIds = arrayUnion(...roomIdsToAdd);
      if (roomIdsToRemove.length > 0) updateData.roomIds = arrayRemove(...roomIdsToRemove);
      if (tagsToAdd.length > 0) updateData.tags = arrayUnion(...tagsToAdd);
      if (tagsToRemove.length > 0) updateData.tags = arrayRemove(...tagsToRemove);
      
      if (bulkForm.featured !== 'keep') updateData.featured = bulkForm.featured === 'yes';
      if (bulkForm.inShop !== 'keep') updateData.inShop = bulkForm.inShop === 'yes';

      batch.update(artRef, updateData);
    }

    try {
      await batch.commit();
      toast({ title: "Bulk update voltooid", description: `${selectedArtIds.length} items bijgewerkt.` });
      setSelectedArtIds([]);
      setIsBulkEditConfirmOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Batch actie mislukt." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRoom = async () => {
    if (!firestore) return;
    
    const title = cleanString(roomForm.title);
    const slug = cleanString(roomForm.slug);

    if (!title || !slug) {
      toast({ variant: "destructive", title: "Validatiefout", description: "Titel en Slug zijn verplicht." });
      return;
    }

    const data = { 
      ...roomForm, 
      title, 
      slug, 
      description: cleanString(roomForm.description) || "",
      updatedAt: serverTimestamp() 
    };

    try {
      if (editingRoom) {
        await updateDoc(doc(firestore, 'rooms', editingRoom.id), data);
      } else {
        await addDoc(collection(firestore, 'rooms'), { ...data, createdAt: serverTimestamp() });
      }
      setIsRoomDialogOpen(false);
      toast({ title: "Zaal opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon zaal niet opslaan." });
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!firestore || !confirm("Weet je zeker?")) return;
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    const linkedArtworks = rawArtworks?.filter((a: any) => a.roomIds?.includes(roomId)) || [];
    linkedArtworks.forEach((art: any) => {
      batch.update(doc(firestore, 'artworks', art.id), {
        roomIds: arrayRemove(roomId),
        updatedAt: serverTimestamp()
      });
    });
    batch.delete(doc(firestore, 'rooms', roomId));
    try {
      await batch.commit();
      toast({ title: "Zaal verwijderd" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;
    
    if (!cleanString(artworkForm.title)) {
      toast({ variant: "destructive", title: "Naam verplicht" });
      return;
    }

    const cleanData = sanitizeArtwork({
      ...artworkForm,
      tags: artworkForm.tags.split(',')
    });

    try {
      if (editingArtwork) {
        await updateDoc(doc(firestore, 'artworks', editingArtwork.id), cleanData);
      } else {
        await addDoc(collection(firestore, 'artworks'), { ...cleanData, createdAt: serverTimestamp() });
      }
      setIsArtworkDialogOpen(false);
      toast({ title: "Opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl italic">Museum Beheer</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl">
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
            <h1 className="font-headline text-2xl italic">Het Digitale Archief</h1>
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
              <Palette className="w-4 h-4 mr-2" /> Collectie ({filteredAndSortedArtworks.length})
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="tags" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Hash className="w-4 h-4 mr-2" /> Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border sticky top-24 z-30 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                 <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <Input 
                      placeholder="Zoek op titel of tag..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 rounded-full bg-white border-none shadow-inner"
                    />
                 </div>
                 {selectedArtIds.length > 0 && (
                   <Button size="sm" onClick={() => setIsBulkEditConfirmOpen(true)} className="rounded-full bg-accent text-white">
                     <Settings2 className="w-4 h-4 mr-2" /> Bulk ({selectedArtIds.length})
                   </Button>
                 )}
              </div>
              <Button onClick={() => { setEditingArtwork(null); setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', roomIds: [], year: '', medium: '', description: '', featured: false, inShop: false, tags: '' }); setIsArtworkDialogOpen(true); }} className="rounded-full px-8 h-12 bg-primary">
                <Plus className="w-4 h-4 mr-2" /> Nieuw Werk
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
               {filteredAndSortedArtworks.map((art: any) => (
                 <Card key={art.id} className={cn("p-4 rounded-2xl border-none shadow-md group relative", selectedArtIds.includes(art.id) && "ring-2 ring-accent")}>
                    <button onClick={() => setSelectedArtIds(p => p.includes(art.id) ? p.filter(i => i !== art.id) : [...p, art.id])} className={cn("absolute top-4 left-4 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", selectedArtIds.includes(art.id) ? "bg-accent border-accent text-white" : "bg-white/80 border-black/10 opacity-0 group-hover:opacity-100")}>
                      {selectedArtIds.includes(art.id) && <CheckSquare className="w-4 h-4" />}
                    </button>

                    <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center">
                      {art.image ? (
                        <img src={art.image} className="w-full h-full object-cover" alt={art.title} />
                      ) : (
                        <ImageIcon className="w-8 h-8 opacity-10" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                         {art.featured && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                      </div>
                      <p className="text-[9px] opacity-40 uppercase font-black">{art.year} &bull; {art.roomIds?.length || 0} zalen</p>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <Button size="sm" onClick={() => { setEditingArtwork(art); setArtworkForm({ ...art, tags: (art.tags || []).join(', ') }); setIsArtworkDialogOpen(true); }} className="rounded-full bg-white text-black">
                         <Edit3 className="w-4 h-4" />
                       </Button>
                       <Button size="sm" variant="destructive" onClick={() => { if(confirm("Wissen?")) deleteDoc(doc(firestore, 'artworks', art.id)); }} className="rounded-full">
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                 </Card>
               ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-headline text-3xl italic opacity-40">Museum Zalen</h2>
              <Button onClick={() => { setEditingRoom(null); setRoomForm({ title: '', slug: '', description: '', order: (rooms?.length || 0) + 1, isPublic: true }); setIsRoomDialogOpen(true); }} className="rounded-full bg-accent text-white">
                <Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {rooms?.map((room: any) => (
                <Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white space-y-4">
                  <div>
                    <h3 className="font-headline text-2xl italic">{room.title}</h3>
                    <p className="text-[10px] font-black uppercase opacity-30">Slug: {room.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingRoom(room); setRoomForm(room); setIsRoomDialogOpen(true); }} variant="outline" className="flex-1 rounded-xl text-[10px] font-black">Bewerken</Button>
                    <Button onClick={() => handleDeleteRoom(room.id)} variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tags">
            <Card className="p-12 rounded-[3rem] text-center space-y-6 bg-white border-none shadow-xl">
               <Hash className="w-12 h-12 mx-auto text-accent opacity-20" />
               <h2 className="font-headline text-3xl italic">Tags</h2>
               <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from(new Set(rawArtworks?.flatMap((a: any) => a.tags || []) || [])).sort().map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                      {tag}
                    </Badge>
                  ))}
               </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkEditConfirmOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">{selectedArtIds.length} Werken Bewerken</DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-6">
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
               {rawArtworks?.filter((a: any) => selectedArtIds.includes(a.id)).map((a: any) => (
                 <div key={a.id} className="w-12 h-12 rounded-lg bg-black/5 overflow-hidden shrink-0 border">
                    {a.image ? <img src={a.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2 opacity-10" />}
                 </div>
               ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black opacity-40">Zalen Toevoegen</Label>
                  <div className="grid gap-2 max-h-32 overflow-y-auto pr-2">
                     {rooms?.map((r: any) => (
                       <label key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/5 cursor-pointer">
                         <Checkbox checked={bulkForm.addRoomIds.includes(r.id)} onCheckedChange={(v) => setBulkForm(p => ({ ...p, addRoomIds: v ? [...p.addRoomIds, r.id] : p.addRoomIds.filter(id => id !== r.id) }))} />
                         <span className="text-xs font-bold">{r.title}</span>
                       </label>
                     ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black opacity-40">Tags Toevoegen</Label>
                  <Input value={bulkForm.addTags} onChange={e => setBulkForm(p => ({ ...p, addTags: e.target.value }))} placeholder="Polder, Olieverf..." className="rounded-xl h-12" />
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
               <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-40">Homepage (Featured)</Label>
                  <Select value={bulkForm.featured} onValueChange={(v: any) => setBulkForm(p => ({ ...p, featured: v }))}>
                     <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="keep">Geen wijziging</SelectItem>
                        <SelectItem value="yes">Ja</SelectItem>
                        <SelectItem value="no">Nee</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-40">Museumwinkel</Label>
                  <Select value={bulkForm.inShop} onValueChange={(v: any) => setBulkForm(p => ({ ...p, inShop: v }))}>
                     <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="keep">Geen wijziging</SelectItem>
                        <SelectItem value="yes">Ja</SelectItem>
                        <SelectItem value="no">Nee</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
            </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsBulkEditConfirmOpen(false)}>Annuleer</Button>
             <Button onClick={handleBulkSave} disabled={isProcessing} className="bg-primary rounded-full px-8 h-12">
               {isProcessing ? <Loader2 className="animate-spin" /> : "Toepassen"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artwork Dialog */}
      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">{editingArtwork ? 'Bewerken' : 'Nieuw'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black opacity-40">Titel</Label>
                <Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black opacity-40">Afbeelding URL</Label>
                <Input value={artworkForm.image || ''} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="rounded-xl h-12" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-40">Zalen</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-black/5 rounded-xl">
                 {rooms?.map((r: any) => (
                   <label key={r.id} className={cn("px-4 py-1.5 rounded-full border text-[10px] font-black uppercase cursor-pointer transition-all", artworkForm.roomIds?.includes(r.id) ? "bg-accent text-white border-accent" : "bg-white border-black/5 opacity-50")}>
                     <input type="checkbox" className="hidden" checked={artworkForm.roomIds?.includes(r.id)} onChange={e => setArtworkForm(p => ({ ...p, roomIds: e.target.checked ? [...(p.roomIds || []), r.id] : (p.roomIds || []).filter(id => id !== r.id) }))} />
                     {r.title}
                   </label>
                 ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-40">Tags</Label>
              <Input value={artworkForm.tags} onChange={e => setArtworkForm({...artworkForm, tags: e.target.value})} className="rounded-xl h-12" placeholder="Schilderij, Polder..." />
            </div>

            <div className="flex gap-8 py-2">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={artworkForm.featured} onCheckedChange={v => setArtworkForm(p => ({ ...p, featured: !!v }))} /><span className="text-[10px] font-black uppercase">Homepage</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={artworkForm.inShop} onCheckedChange={v => setArtworkForm(p => ({ ...p, inShop: !!v }))} /><span className="text-[10px] font-black uppercase">Winkel</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveArtwork} className="w-full h-14 rounded-2xl bg-primary">Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Zaal</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40">Titel</Label>
              <Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40">Slug (URL)</Label>
              <Input value={roomForm.slug} onChange={e => setRoomForm({...roomForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="rounded-xl h-12" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveRoom} className="w-full h-14 rounded-2xl bg-primary">Zaal Opslaan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
