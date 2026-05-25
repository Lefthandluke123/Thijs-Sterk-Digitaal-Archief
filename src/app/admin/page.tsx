
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
  orderBy, 
  writeBatch,
  setDoc,
  getDocs,
  where
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
  CheckSquare,
  Square,
  ArrowRightLeft,
  X,
  Star,
  ShoppingBag,
  Type,
  Tag
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
import { sortArtworksByTitle, MUSEUM_TAGS } from '@/lib/museum-utils';

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('artworks');

  // Bulk State
  const [selectedArtIds, setSelectedArtIds] = useState<string[]>([]);
  const [isBulkRoomDialogOpen, setIsBulkRoomDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [bulkRoomForm, setBulkRoomForm] = useState({ roomSlug: '', newRoomTitle: '' });
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Room Dialog State
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ title: '', slug: '', description: '', order: 0 });

  // Artwork Dialog State
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [artworkForm, setArtworkForm] = useState({ 
    title: '', 
    displayTitle: '',
    slug: '', 
    image: '', 
    roomSlug: '', 
    newRoomTitle: '', 
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
  const { data: dbArtworks } = useCollection(artworksQuery);

  const sortedArtworks = useMemo(() => {
    if (!dbArtworks) return [];
    return [...dbArtworks].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, isAuthorized]);
  const { data: rooms } = useCollection(roomsQuery);

  // --- Bulk Actions ---
  const toggleSelection = (id: string) => {
    setSelectedArtIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (!dbArtworks) return;
    if (selectedArtIds.length === dbArtworks.length) setSelectedArtIds([]);
    else setSelectedArtIds(dbArtworks.map(a => (a as any).id));
  };

  const handleBulkDelete = async () => {
    if (!firestore || !selectedArtIds.length) return;
    if (!confirm(`Weet je zeker dat je ${selectedArtIds.length} kunstwerken wilt verwijderen uit het archief?`)) return;

    setIsProcessing(true);
    const batch = writeBatch(firestore);
    selectedArtIds.forEach(id => {
      batch.delete(doc(firestore, 'artworks', id));
    });

    try {
      await batch.commit();
      toast({ title: `${selectedArtIds.length} kunstwerken verwijderd` });
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon items niet verwijderen." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdateStatus = async (field: 'featured' | 'inShop', value: boolean) => {
    if (!firestore || !selectedArtIds.length) return;
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    selectedArtIds.forEach(id => {
      batch.update(doc(firestore, 'artworks', id), { [field]: value });
    });

    try {
      await batch.commit();
      toast({ title: `Status bijgewerkt voor ${selectedArtIds.length} items` });
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon status niet bijwerken." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTagSave = async (mode: 'add' | 'set') => {
    if (!firestore || !selectedArtIds.length) return;
    setIsProcessing(true);

    const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
    const batch = writeBatch(firestore);

    // Voor 'add' moeten we eerst de huidige tags ophalen, dus we doen dit per document
    // Maar batch commit kan tot 500 documenten aan.
    try {
      for (const id of selectedArtIds) {
        const artRef = doc(firestore, 'artworks', id);
        if (mode === 'set') {
          batch.update(artRef, { tags: newTags });
        } else {
          const currentArt = dbArtworks?.find((a: any) => a.id === id) as any;
          const existingTags = currentArt?.tags || [];
          const combinedTags = Array.from(new Set([...existingTags, ...newTags]));
          batch.update(artRef, { tags: combinedTags });
        }
      }

      await batch.commit();
      toast({ title: `Tags bijgewerkt voor ${selectedArtIds.length} items` });
      setIsBulkTagDialogOpen(false);
      setBulkTagInput("");
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon tags niet bijwerken." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRoomSave = async () => {
    if (!firestore || !selectedArtIds.length) return;
    setIsProcessing(true);

    let finalRoomSlug = bulkRoomForm.roomSlug;

    if (bulkRoomForm.newRoomTitle.trim()) {
      const existingRoom = rooms?.find(r => r.title.toLowerCase() === bulkRoomForm.newRoomTitle.trim().toLowerCase());
      if (existingRoom) {
        finalRoomSlug = existingRoom.slug;
      } else {
        const newSlug = bulkRoomForm.newRoomTitle.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const newRoomRef = doc(collection(firestore, 'rooms'));
        await setDoc(newRoomRef, {
          title: bulkRoomForm.newRoomTitle.trim(),
          slug: newSlug,
          description: `Collectie van ${bulkRoomForm.newRoomTitle.trim()}`,
          order: (rooms?.length || 0) + 1,
          createdAt: serverTimestamp()
        });
        finalRoomSlug = newSlug;
      }
    }

    if (!finalRoomSlug) {
      toast({ variant: "destructive", title: "Fout", description: "Geen zaal geselecteerd." });
      setIsProcessing(false);
      return;
    }

    const batch = writeBatch(firestore);
    selectedArtIds.forEach(id => {
      batch.update(doc(firestore, 'artworks', id), { roomSlug: finalRoomSlug });
    });

    try {
      await batch.commit();
      toast({ title: `${selectedArtIds.length} kunstwerken verplaatst naar ${finalRoomSlug}` });
      setIsBulkRoomDialogOpen(false);
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon items niet verplaatsen." });
    } finally {
      setIsProcessing(false);
    }
  };

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
        title: art.title || '', 
        displayTitle: art.displayTitle || '',
        slug: art.slug || '', 
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
        displayTitle: '',
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
          toast({ variant: "destructive", title: "Zaal fout", description: "Kon nieuwe zaal niet aanmaken." });
          return;
        }
      }
    }

    const finalData = {
      title: artworkForm.title,
      displayTitle: artworkForm.displayTitle,
      slug: artworkForm.slug || artworkForm.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
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

  const addTagToInput = (tag: string) => {
    const currentTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) {
      setBulkTagInput([...currentTags, tag].join(', '));
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
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-3xl border sticky top-24 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                 <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] uppercase font-black tracking-widest">
                   {selectedArtIds.length === (dbArtworks?.length || 0) ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                   {selectedArtIds.length > 0 ? `${selectedArtIds.length} geselecteerd` : 'Selecteer alles'}
                 </Button>

                 {selectedArtIds.length > 0 && (
                   <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                     <div className="h-6 w-px bg-black/10 mx-2" />
                     <Button size="sm" variant="outline" onClick={() => setIsBulkRoomDialogOpen(true)} className="rounded-full text-[10px] font-black uppercase">
                       <ArrowRightLeft className="w-3 h-3 mr-2" /> Verplaatsen
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => setIsBulkTagDialogOpen(true)} className="rounded-full text-[10px] font-black uppercase">
                       <Tag className="w-3 h-3 mr-2" /> Taggen
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => handleBulkUpdateStatus('featured', true)} className="rounded-full text-[10px] font-black uppercase text-yellow-600">
                       <Star className="w-3 h-3 mr-2 fill-yellow-600" /> Featured
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => handleBulkUpdateStatus('inShop', true)} className="rounded-full text-[10px] font-black uppercase text-blue-600">
                       <ShoppingBag className="w-3 h-3 mr-2" /> In Shop
                     </Button>
                     <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="rounded-full text-[10px] font-black uppercase">
                       <Trash2 className="w-3 h-3 mr-2" /> Verwijderen
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedArtIds([])} className="rounded-full">
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                 )}
              </div>
              
              <Button onClick={() => handleOpenArtworkDialog()} className="rounded-full px-8 h-12 bg-accent">
                <Plus className="w-4 h-4 mr-2" /> Werk Toevoegen
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
               {sortedArtworks.map((art: any) => {
                 const imgSrc = art.image || art.imageUrl;
                 const isSelected = selectedArtIds.includes(art.id);
                 return (
                   <Card 
                     key={art.id} 
                     className={cn(
                       "p-4 rounded-2xl border-none shadow-md transition-all duration-300 group relative overflow-hidden",
                       isSelected ? "bg-accent/5 ring-2 ring-accent" : "bg-white"
                     )}
                   >
                      <button 
                        onClick={() => toggleSelection(art.id)}
                        className={cn(
                          "absolute top-6 left-6 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-accent border-accent text-white" : "bg-white/80 border-black/10 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {isSelected && <CheckSquare className="w-4 h-4" />}
                      </button>

                      <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center cursor-pointer" onClick={() => toggleSelection(art.id)}>
                        {imgSrc ? (
                          <img src={imgSrc} className="w-full h-full object-cover" alt={art.title} />
                        ) : (
                          <Palette className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                           {art.featured && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                        </div>
                        <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">{art.title} • {art.year} • {art.roomSlug}</p>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                         <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenArtworkDialog(art); }} className="rounded-full bg-white text-black hover:bg-white/90">
                           <Edit3 className="w-4 h-4" />
                         </Button>
                         <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteArtwork(art.id); }} className="rounded-full">
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

      {/* Bulk Tag Dialog */}
      <Dialog open={isBulkTagDialogOpen} onOpenChange={setIsBulkTagDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Bulk Taggen</DialogTitle>
            <DialogDescription>Voeg tags toe aan of overschrijf tags voor {selectedArtIds.length} items.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Huidige Selectie Tags (komma gescheiden)</Label>
                <Input 
                  value={bulkTagInput} 
                  onChange={e => setBulkTagInput(e.target.value)} 
                  className="h-12 rounded-xl bg-black/5 border-none" 
                  placeholder="Bijv. Olieverf, Polder..." 
                />
             </div>

             <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest border-b pb-2 opacity-30">Snel Menu</h4>
                {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
                  <div key={cat} className="space-y-2">
                    <p className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <Button 
                          key={tag} 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => addTagToInput(tag)}
                          className="h-7 text-[9px] font-bold uppercase rounded-md hover:bg-accent hover:text-white"
                        >
                          + {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => handleBulkTagSave('add')} 
              disabled={isProcessing} 
              className="flex-1 h-14 rounded-2xl border-2"
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Toevoegen aan bestaande
            </Button>
            <Button 
              onClick={() => handleBulkTagSave('set')} 
              disabled={isProcessing} 
              className="flex-1 h-14 rounded-2xl bg-primary"
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Overschrijven
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Room Dialog */}
      <Dialog open={isBulkRoomDialogOpen} onOpenChange={setIsBulkRoomDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Bulk Verplaatsen</DialogTitle>
            <DialogDescription>Verplaats {selectedArtIds.length} geselecteerde items naar een andere zaal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Bestaande Zaal</Label>
              <Select value={bulkRoomForm.roomSlug} onValueChange={v => setBulkRoomForm({...bulkRoomForm, roomSlug: v})}>
                <SelectTrigger className="rounded-xl bg-black/5 border-none h-12">
                  <SelectValue placeholder="Kies een zaal" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((r: any) => (
                    <SelectItem key={r.id} value={r.slug}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-center opacity-40 font-black text-[9px] uppercase tracking-widest">Of</div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Maak een nieuwe zaal</Label>
              <Input 
                value={bulkRoomForm.newRoomTitle} 
                onChange={e => setBulkRoomForm({...bulkRoomForm, newRoomTitle: e.target.value})} 
                className="rounded-xl bg-black/5 border-none h-12" 
                placeholder="Naam nieuwe zaal..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBulkRoomSave} disabled={isProcessing} className="w-full h-14 rounded-2xl bg-primary">
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Selectie Verplaatsen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">{editingRoom ? 'Zaal Bewerken' : 'Nieuwe Zaal'}</DialogTitle>
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
            <div className="space-y-4 p-5 bg-accent/5 rounded-2xl border border-accent/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40 flex items-center gap-2">
                    <Edit3 className="w-3 h-3" /> Archief Titel (Sorteertype)
                  </Label>
                  <Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="rounded-xl bg-white border-none shadow-sm h-12" placeholder="Bijv. 13 XII" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40 flex items-center gap-2">
                    <Type className="w-3 h-3" /> Publieke Titel
                  </Label>
                  <Input value={artworkForm.displayTitle} onChange={e => setArtworkForm({...artworkForm, displayTitle: e.target.value})} className="rounded-xl bg-white border-none shadow-sm h-12" placeholder="Bijv. Licht over de Polder" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Slug (URL)</Label>
                <Input value={artworkForm.slug} onChange={e => setArtworkForm({...artworkForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="rounded-xl bg-white border-none shadow-sm h-10" placeholder="bijv-licht-over-de-polder" />
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

            <div className="space-y-4">
              <Label className="text-[10px] uppercase font-black tracking-widest ml-2 opacity-40">Tags (komma gescheiden)</Label>
              <Input value={artworkForm.tags} onChange={e => setArtworkForm({...artworkForm, tags: e.target.value})} className="rounded-xl bg-black/5 border-none" placeholder="Olieverf, Polder, 1960" />
              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-20">Snel Menu</p>
                {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
                  <div key={cat} className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <Button 
                        key={tag} 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const current = artworkForm.tags.split(',').map(t => t.trim()).filter(Boolean);
                          if (!current.includes(tag)) {
                            setArtworkForm({...artworkForm, tags: [...current, tag].join(', ')});
                          }
                        }}
                        className="h-6 text-[8px] font-bold uppercase border border-black/5 hover:bg-accent hover:text-white"
                      >
                        + {tag}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
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
