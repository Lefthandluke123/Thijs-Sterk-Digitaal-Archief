"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, updateDoc, addDoc, serverTimestamp, orderBy, getDocs, where, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Search,
  Palette,
  Lock,
  Plus,
  LayoutDashboard,
  Layers,
  Settings as SettingsIcon,
  X,
  RefreshCw,
  DatabaseZap,
  CheckSquare,
  Square,
  CheckCircle2,
  FolderInput,
  Star,
  ShoppingBag,
  ExternalLink,
  Edit3,
  Check,
  Mic,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';
import placeholderData from '@/app/lib/placeholder-images.json';
import { Checkbox } from '@/components/ui/checkbox';
import { generateNarrative } from '@/ai/flows/narrative-flow';

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('artworks');
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);

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
  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, isAuthorized]);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    return artworks.filter((art: any) => 
      (art.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.roomSlug || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artworks, searchQuery]);

  const handleAddArtwork = async () => {
    if (!firestore) return;
    try {
      const newDoc = await addDoc(collection(firestore, 'artworks'), {
        title: 'Nieuw Werk',
        slug: `werk-${Date.now()}`,
        image: '',
        roomSlug: rooms?.[0]?.slug || '',
        createdAt: serverTimestamp(),
        tags: [],
        year: '',
        medium: 'Olieverf op doek',
        description: '',
        brightness: 1,
        featured: false,
        inShop: false
      });
      setEditingArtworkId(newDoc.id);
      toast({ title: "Werk aangemaakt", description: "U kunt nu de details invullen." });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon werk niet aanmaken." });
    }
  };

  const handleAddRoom = async () => {
    if (!firestore) return;
    try {
      const newDoc = await addDoc(collection(firestore, 'rooms'), {
        title: 'Nieuwe Zaal',
        slug: `zaal-${Date.now()}`,
        description: '',
        order: (rooms?.length || 0) + 1
      });
      setEditingRoomId(newDoc.id);
      toast({ title: "Zaal aangemaakt", description: "U kunt nu de zaal inrichten." });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon zaal niet aanmaken." });
    }
  };

  const updateField = (col: string, id: string, field: string, value: any) => {
    if (!firestore) return;
    const ref = doc(firestore, col, id);
    updateDoc(ref, { [field]: value })
      .then(() => {
        toast({ 
          title: "Opgeslagen", 
          description: "Wijziging is succesvol doorgevoerd.",
          duration: 2000
        });
      })
      .catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'update' }));
      });
  };

  const handleGenerateAudio = async () => {
    const artwork = artworks?.find((a: any) => a.id === editingArtworkId);
    if (!artwork || !editingArtworkId) return;

    setIsGeneratingAudio(true);
    try {
      const result = await generateNarrative({
        title: artwork.title,
        description: artwork.description,
        tags: artwork.tags,
        language: 'nl'
      });

      const audioUrls = artwork.audioUrls || {};
      audioUrls['nl'] = result.audioUri;

      await updateDoc(doc(firestore!, 'artworks', editingArtworkId), {
        audioUrls,
        description: result.text // Update ook de tekst met de poëtische versie
      });

      toast({ title: "Audio gegenereerd", description: "Het poëtische narratief is toegevoegd aan het werk." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generatie mislukt", description: error.message });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filteredArtworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArtworks.map((a: any) => a.id));
    }
  };

  const runBulkAction = async (action: 'delete' | 'toggle_featured' | 'toggle_shop' | 'move', targetRoomSlug?: string) => {
    if (!firestore || selectedIds.length === 0) return;
    
    if (action === 'delete' && !confirm(`Weet je zeker dat je ${selectedIds.length} werken wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    setIsBulkOperating(true);
    const batch = writeBatch(firestore);

    try {
      for (const id of selectedIds) {
        const ref = doc(firestore, 'artworks', id);
        const art = artworks?.find((a: any) => a.id === id);
        
        if (action === 'delete') {
          batch.delete(ref);
        } else if (action === 'toggle_featured') {
          batch.update(ref, { featured: !art?.featured });
        } else if (action === 'toggle_shop') {
          batch.update(ref, { inShop: !art?.inShop });
        } else if (action === 'move' && targetRoomSlug) {
          batch.update(ref, { roomSlug: targetRoomSlug });
        }
      }

      await batch.commit();
      toast({ title: "Bulk actie voltooid", description: `${selectedIds.length} werken bijgewerkt.` });
      setSelectedIds([]);
      setShowBulkMoveDialog(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Bulk actie mislukt", description: err.message });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const runMigration = async () => {
    if (!firestore || !confirm('Hiermee importeer je legacy data uit placeholder-images.json naar Firestore. Doorgaan?')) return;
    setIsMigrating(true);
    
    try {
      let defaultRoomSlug = "algemeen";
      if (!rooms || rooms.length === 0) {
        await addDoc(collection(firestore, 'rooms'), {
          title: "Algemene Collectie",
          slug: "algemeen",
          description: "Gerecupereerde werken uit het archief.",
          order: 1
        });
      } else {
        defaultRoomSlug = rooms[0].slug;
      }

      const legacyArtworks = placeholderData.placeholderImages;
      let count = 0;

      for (const legacy of legacyArtworks) {
        const normalizedSlug = legacy.id.toLowerCase().trim();
        const q = query(collection(firestore, 'artworks'), where('slug', '==', normalizedSlug));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          await addDoc(collection(firestore, 'artworks'), {
            title: legacy.title || "Naamloos",
            slug: normalizedSlug,
            image: legacy.imageUrl,
            roomSlug: defaultRoomSlug,
            tags: legacy.tags || [],
            year: legacy.year || "",
            medium: legacy.medium || "Olieverf op doek",
            description: legacy.description || "",
            brightness: legacy.brightness || 1,
            featured: legacy.featured || false,
            createdAt: serverTimestamp()
          });
          count++;
        }
      }

      toast({ title: "Migratie voltooid", description: `${count} nieuwe werken toegevoegd.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Migratie fout", description: err.message });
    } finally {
      setIsMigrating(false);
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

  const editingArtwork = artworks?.find((a: any) => a.id === editingArtworkId);
  const editingRoom = rooms?.find((r: any) => r.id === editingRoomId);

  return (
    <div className="min-h-screen bg-background pt-32 px-8">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LayoutDashboard className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-headline text-2xl">CMS <span className="italic">Manager</span></h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-accent">Real-time Global Archive</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={runMigration} 
            disabled={isMigrating}
            className="text-[10px] font-black uppercase tracking-widest text-accent/60 hover:text-accent"
          >
            {isMigrating ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <DatabaseZap className="w-3 h-3 mr-2" />}
            Legacy Import
          </Button>
          <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <ArrowLeft className="w-3 h-3" /> Website
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-12 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Palette className="w-4 h-4 mr-2" /> Kunstwerken
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                <Input 
                  placeholder="Zoek op titel of zaal..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-12 h-14 rounded-2xl border-none bg-secondary/20" 
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={selectAllFiltered} className="h-14 px-6 rounded-2xl border-2 uppercase font-black text-[10px] tracking-widest">
                  {selectedIds.length === filteredArtworks.length ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                  {selectedIds.length === filteredArtworks.length ? "Deselecteer" : "Selecteer Alles"}
                </Button>
                <Button onClick={handleAddArtwork} className="h-14 px-8 rounded-2xl bg-accent hover:bg-accent/90 transition-all flex-1 md:flex-initial">
                  <Plus className="w-4 h-4 mr-2" /> Werk Toevoegen
                </Button>
              </div>
            </div>

            {artLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {filteredArtworks.map((art: any) => {
                  const displayImage = art.image || art.imageUrl || art.url;
                  const isSelected = selectedIds.includes(art.id);
                  
                  return (
                    <Card 
                      key={art.id} 
                      className={cn(
                        "group relative overflow-hidden cursor-pointer transition-all border-none shadow-md bg-white",
                        isSelected ? "ring-4 ring-primary scale-[0.98]" : "hover:ring-2 hover:ring-accent/50"
                      )} 
                    >
                      <div className="absolute top-2 left-2 z-20" onClick={(e) => { e.stopPropagation(); toggleSelection(art.id); }}>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 transition-all",
                          isSelected ? "bg-primary border-primary text-white" : "bg-white/80 border-white text-transparent group-hover:border-primary/40"
                        )}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>

                      <div className="aspect-square bg-muted/20 relative" onClick={() => setEditingArtworkId(art.id)}>
                        {displayImage ? (
                          <img src={displayImage} className="w-full h-full object-cover" alt={art.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20"><Palette className="w-8 h-8" /></div>
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                           <div className="bg-black/40 text-white text-[8px] px-2 py-1 rounded-full backdrop-blur-md uppercase font-bold">
                            {art.roomSlug || 'geen zaal'}
                          </div>
                          {art.featured && <div className="bg-yellow-500/80 text-white p-1 rounded-full"><Star className="w-3 h-3 fill-white" /></div>}
                          {art.inShop && <div className="bg-blue-500/80 text-white p-1 rounded-full"><ShoppingBag className="w-3 h-3" /></div>}
                        </div>
                      </div>
                      <div className="p-3" onClick={() => setEditingArtworkId(art.id)}>
                        <h3 className="text-[10px] font-bold uppercase truncate">{art.title}</h3>
                        <p className="text-[8px] opacity-40 uppercase font-black tracking-widest mt-1">{art.year || 'Geen jaar'}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8">
            <div className="flex justify-end">
              <Button onClick={handleAddRoom} className="h-14 px-8 rounded-2xl bg-accent hover:bg-accent/90 transition-all">
                <Plus className="w-4 h-4 mr-2" /> Zaal Toevoegen
              </Button>
            </div>

            {roomsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {rooms?.map((room: any) => (
                  <Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white space-y-6 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start">
                      <h3 className="font-headline text-2xl italic">{room.title}</h3>
                      <span className="text-[10px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full">#{room.order}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[3rem]">
                      {room.description || 'Geen omschrijving.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setEditingRoomId(room.id)}
                       >
                         <Edit3 className="w-3 h-3 mr-2" /> Bewerk
                       </Button>
                       <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                        asChild
                       >
                         <Link href={`/room/${room.slug}`} target="_blank">
                           <ExternalLink className="w-3 h-3 mr-2" /> Live Preview
                         </Link>
                       </Button>
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                      <span>Slug: {room.slug}</span>
                      <span>{artworks?.filter((a: any) => a.roomSlug === room.slug).length || 0} werken</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-primary text-primary-foreground px-8 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-20 duration-500">
          <div className="border-r border-white/20 pr-6 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Geselecteerd</span>
            <span className="text-2xl font-headline italic">{selectedIds.length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => runBulkAction('toggle_featured')}
              disabled={isBulkOperating}
              className="rounded-full hover:bg-white/10"
            >
              <Star className="w-4 h-4 mr-2" /> Featured
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => runBulkAction('toggle_shop')}
              disabled={isBulkOperating}
              className="rounded-full hover:bg-white/10"
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> Shop
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBulkMoveDialog(true)}
              disabled={isBulkOperating}
              className="rounded-full hover:bg-white/10"
            >
              <FolderInput className="w-4 h-4 mr-2" /> Verplaats
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => runBulkAction('delete')}
              disabled={isBulkOperating}
              className="rounded-full bg-red-500/20 hover:bg-red-500 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Verwijder
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedIds([])}
            className="ml-2 w-8 h-8 rounded-full hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bulk Move Dialog */}
      <Dialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
        <DialogContent className="max-w-md p-10 rounded-[3rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic mb-6">Verplaats Selectie</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground italic">
              Kies de doelzaal voor de {selectedIds.length} geselecteerde werken.
            </p>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Zaal</Label>
              <Select onValueChange={(v) => runBulkAction('move', v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-secondary/10 border-none">
                  <SelectValue placeholder="Selecteer een zaal..." />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((r: any) => (
                    <SelectItem key={r.slug} value={r.slug}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button variant="outline" className="w-full rounded-2xl h-14" onClick={() => setShowBulkMoveDialog(false)}>Annuleren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Artwork Dialog */}
      <Dialog open={!!editingArtworkId} onOpenChange={() => setEditingArtworkId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-10 rounded-[3rem] border-none shadow-2xl">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <DialogTitle className="font-headline text-3xl italic mb-8">Bewerk Kunstwerk</DialogTitle>
              <Button 
                onClick={handleGenerateAudio} 
                disabled={isGeneratingAudio}
                className="bg-accent hover:bg-accent/90 text-white rounded-full px-6"
              >
                {isGeneratingAudio ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Genereer Narratief
              </Button>
            </div>
          </DialogHeader>
          {editingArtwork && (
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="aspect-[4/5] rounded-3xl bg-muted/20 relative overflow-hidden shadow-xl">
                  {(editingArtwork.image || editingArtwork.imageUrl) ? (
                    <img src={editingArtwork.image || editingArtwork.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20"><Palette className="w-12 h-12" /></div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Afbeelding URL</Label>
                  <Input 
                    placeholder="https://..." 
                    defaultValue={editingArtwork.image || editingArtwork.imageUrl} 
                    onBlur={e => updateField('artworks', editingArtworkId!, 'image', e.target.value)} 
                    className="h-12 rounded-xl bg-secondary/10 border-none" 
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-secondary/10 px-4 py-3 rounded-xl flex-1">
                    <Checkbox 
                      checked={editingArtwork.featured} 
                      onCheckedChange={(checked) => updateField('artworks', editingArtworkId!, 'featured', checked)} 
                    />
                    <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Uitgelicht</Label>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/10 px-4 py-3 rounded-xl flex-1">
                    <Checkbox 
                      checked={editingArtwork.inShop} 
                      onCheckedChange={(checked) => updateField('artworks', editingArtworkId!, 'inShop', checked)} 
                    />
                    <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer">In Winkel</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Titel</Label>
                    <Input 
                      defaultValue={editingArtwork.title} 
                      onBlur={e => updateField('artworks', editingArtworkId!, 'title', e.target.value)} 
                      className="h-12 rounded-xl bg-secondary/10 border-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Slug (URL)</Label>
                    <Input 
                      defaultValue={editingArtwork.slug} 
                      onBlur={e => updateField('artworks', editingArtworkId!, 'slug', e.target.value.toLowerCase().trim())} 
                      className="h-12 rounded-xl bg-secondary/10 border-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Zaal</Label>
                    <Select value={editingArtwork.roomSlug} onValueChange={v => updateField('artworks', editingArtworkId!, 'roomSlug', v.toLowerCase().trim())}>
                      <SelectTrigger className="h-12 rounded-xl bg-secondary/10 border-none">
                        <SelectValue placeholder="Kies een zaal" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms?.map((r: any) => (
                          <SelectItem key={r.slug} value={r.slug}>{r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Jaar</Label>
                    <Input 
                      defaultValue={editingArtwork.year} 
                      onBlur={e => updateField('artworks', editingArtworkId!, 'year', e.target.value)} 
                      className="h-12 rounded-xl bg-secondary/10 border-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Medium</Label>
                    <Input 
                      defaultValue={editingArtwork.medium} 
                      onBlur={e => updateField('artworks', editingArtworkId!, 'medium', e.target.value)} 
                      className="h-12 rounded-xl bg-secondary/10 border-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Beschrijving</Label>
                    <Textarea 
                      defaultValue={editingArtwork.description} 
                      onBlur={e => updateField('artworks', editingArtworkId!, 'description', e.target.value)} 
                      className="rounded-xl bg-secondary/10 border-none min-h-[100px]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Tags (komma gescheiden)</Label>
                    <Input 
                      defaultValue={editingArtwork.tags?.join(', ')} 
                      onBlur={e => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t !== '');
                        updateField('artworks', editingArtworkId!, 'tags', tags);
                      }} 
                      placeholder="bijv. Groet, Olieverf, 1950"
                      className="h-12 rounded-xl bg-secondary/10 border-none" 
                    />
                  </div>
                </div>
                
                <div className="pt-8 border-t flex flex-col gap-4">
                  <Button 
                    variant="destructive" 
                    className="w-full h-14 rounded-2xl" 
                    onClick={() => { 
                      if(confirm('Weet u zeker dat u dit werk wilt verwijderen?')) {
                        deleteDoc(doc(firestore!, 'artworks', editingArtworkId!)).then(() => {
                          setEditingArtworkId(null);
                          toast({ title: "Verwijderd", description: "Het kunstwerk is uit het archief verwijderd." });
                        }); 
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Werk Verwijderen
                  </Button>
                  <Button variant="outline" className="w-full h-14 rounded-2xl" onClick={() => setEditingArtworkId(null)}>
                    Sluiten
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoomId} onOpenChange={() => setEditingRoomId(null)}>
        <DialogContent className="max-w-md p-10 rounded-[3rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic mb-6">Bewerk Zaal</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Titel</Label>
                <Input 
                  defaultValue={editingRoom.title} 
                  onBlur={e => updateField('rooms', editingRoomId!, 'title', e.target.value)} 
                  className="h-12 rounded-xl bg-secondary/10 border-none" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Slug</Label>
                <Input 
                  defaultValue={editingRoom.slug} 
                  onBlur={e => updateField('rooms', editingRoomId!, 'slug', e.target.value.toLowerCase().trim())} 
                  className="h-12 rounded-xl bg-secondary/10 border-none" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Beschrijving</Label>
                <Textarea 
                  defaultValue={editingRoom.description} 
                  onBlur={e => updateField('rooms', editingRoomId!, 'description', e.target.value)} 
                  className="rounded-xl bg-secondary/10 border-none min-h-[100px]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest opacity-60">Volgorde</Label>
                <Input 
                  type="number" 
                  defaultValue={editingRoom.order} 
                  onBlur={e => updateField('rooms', editingRoomId!, 'order', parseInt(e.target.value))} 
                  className="h-12 rounded-xl bg-secondary/10 border-none" 
                />
              </div>
              
              <div className="pt-8 border-t flex flex-col gap-4">
                <Button 
                  variant="destructive" 
                  className="w-full h-14 rounded-2xl" 
                  onClick={() => { 
                    if(confirm('Let op: hiermee verwijdert u de zaal. Kunstwerken blijven bestaan maar raken ontkoppeld. Zeker weten?')) {
                      deleteDoc(doc(firestore!, 'rooms', editingRoomId!)).then(() => {
                        setEditingRoomId(null); 
                        toast({ title: "Zaal verwijderd", description: "De zaal is succesvol verwijderd uit het systeem." });
                      });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Zaal Verwijderen
                </Button>
                <Button variant="outline" className="w-full h-14 rounded-2xl" onClick={() => setEditingRoomId(null)}>
                  Sluiten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
