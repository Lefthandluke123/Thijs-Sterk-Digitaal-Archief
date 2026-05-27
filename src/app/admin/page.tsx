"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useStorage } from '@/firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  Zap,
  Upload,
  Image as ImageIcon,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
  Tag as TagIcon,
  Save,
  Wand2
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { sanitizeArtwork, MUSEUM_TAGS, slugify, sortArtworksByTitle } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedArtworks, setSelectedItems] = useState<string[]>([]);
  
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: '', featured: false, inShop: false
  });
  
  const [roomForm, setRoomForm] = useState({ title: '', description: '', order: 0 });
  const [tempBulkTags, setTempBulkTags] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    const filtered = artworks.filter((art: any) => 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return [...filtered].sort(sortArtworksByTitle);
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

  const handleOpenNewArtwork = () => {
    setEditingArtwork(null);
    setSelectedFile(null);
    setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: '', featured: false, inShop: false });
    setIsArtworkDialogOpen(true);
  };

  const handleEditArtwork = (art: any) => {
    setEditingArtwork(art); 
    setSelectedFile(null);
    setArtworkForm({ 
      ...art, 
      image: art.image || art.imageUrl || '',
      tags: Array.isArray(art.tags) ? art.tags.join(', ') : (art.tags || '')
    }); 
    setIsArtworkDialogOpen(true); 
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;

    let finalImageUrl = artworkForm.image;
    setIsUploading(true);

    try {
      if (selectedFile && storage) {
        const storageRef = ref(storage, `artworks/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      if (!finalImageUrl && !selectedFile) {
        toast({ variant: "destructive", title: "Afbeelding ontbreekt", description: "Upload een bestand of voer een URL in." });
        setIsUploading(false);
        return;
      }

      const cleanTags = typeof artworkForm.tags === 'string' 
        ? artworkForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) 
        : artworkForm.tags;

      const data = sanitizeArtwork({
        ...artworkForm,
        image: finalImageUrl,
        tags: cleanTags
      });

      if (editingArtwork) {
        const docRef = doc(firestore, 'artworks', editingArtwork.id);
        updateDoc(docRef, data)
          .then(() => toast({ title: "Bijgewerkt" }))
          .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: data
            } satisfies SecurityRuleContext));
          });
      } else {
        const collRef = collection(firestore, 'artworks');
        const newData = { ...data, createdAt: serverTimestamp() };
        addDoc(collRef, newData)
          .then(() => toast({ title: "Toegevoegd aan archief" }))
          .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: collRef.path,
              operation: 'create',
              requestResourceData: newData
            } satisfies SecurityRuleContext));
          });
      }

      setIsArtworkDialogOpen(false);
      setSelectedFile(null);
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Fout bij opslaan", description: e.message }); 
    } finally {
      setIsUploading(false);
    }
  };

  const handleCleanupYears = async () => {
    if (!firestore || !artworks || !confirm("Wilt u alle foutieve jaartallen '2026' definitief uit de database verwijderen voor alle kunstwerken? Dit herstelt de data-integriteit.")) return;
    
    setIsCleaning(true);
    let count = 0;
    
    try {
      for (const art of artworks) {
        if (art.year && String(art.year).includes('2026')) {
          // Gebruik de robuuste regex om alle voorkomens te verwijderen
          const newYear = String(art.year).replace(/2026/g, '').trim();
          const docRef = doc(firestore, 'artworks', art.id);
          
          await updateDoc(docRef, { 
            year: newYear, 
            updatedAt: serverTimestamp() 
          });
          count++;
        }
      }
      toast({ title: "Database opgeschoond", description: `${count} kunstwerken gecorrigeerd.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Schoonmaak mislukt" });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSaveRoom = () => {
    if (!firestore) return;
    const slug = slugify(roomForm.title);
    const data = { ...roomForm, slug, updatedAt: serverTimestamp() };

    if (editingRoom) {
      const docRef = doc(firestore, 'rooms', editingRoom.id);
      updateDoc(docRef, data)
        .then(() => toast({ title: "Zaal bijgewerkt" }))
        .catch(async (e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data
          } satisfies SecurityRuleContext));
        });
    } else {
      const collRef = collection(firestore, 'rooms');
      const newData = { ...data, createdAt: serverTimestamp(), isPublic: true };
      addDoc(collRef, newData)
        .then(() => toast({ title: "Zaal aangemaakt" }))
        .catch(async (e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: collRef.path,
            operation: 'create',
            requestResourceData: newData
          } satisfies SecurityRuleContext));
        });
    }
    setIsRoomDialogOpen(false);
  };

  const handleDeleteRoom = (room: any) => {
    if (!firestore || !confirm(`Weet u zeker dat u '${room.title}' wilt verwijderen? De schilderijen blijven behouden.`)) return;
    
    const associated = artworks?.filter((a: any) => a.roomIds?.includes(room.id)) || [];
    associated.forEach(art => {
      updateDoc(doc(firestore, 'artworks', art.id), {
        roomIds: arrayRemove(room.id)
      });
    });

    const docRef = doc(firestore, 'rooms', room.id);
    deleteDoc(docRef)
      .then(() => toast({ title: "Zaal verwijderd" }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        } satisfies SecurityRuleContext));
      });
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkAddToRoom = (roomId: string, roomTitle: string) => {
    if (!firestore || selectedArtworks.length === 0) return;
    selectedArtworks.forEach(id => {
      const docRef = doc(firestore, 'artworks', id);
      updateDoc(docRef, { roomIds: arrayUnion(roomId) })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { roomIds: arrayUnion(roomId) }
          } satisfies SecurityRuleContext));
        });
    });
    toast({ title: "Bulk update gestart", description: `${selectedArtworks.length} items worden toegevoegd aan '${roomTitle}'` });
    setSelectedItems([]);
  };

  const applyBulkTags = () => {
    if (!firestore || selectedArtworks.length === 0) return;
    setIsUploading(true);
    
    const isSingleEdit = selectedArtworks.length === 1;

    selectedArtworks.forEach(id => {
      const docRef = doc(firestore, 'artworks', id);
      const updateData = isSingleEdit ? { tags: tempBulkTags } : { tags: arrayUnion(...tempBulkTags) };
      
      updateDoc(docRef, updateData)
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData
          } satisfies SecurityRuleContext));
        });
    });

    toast({ 
      title: isSingleEdit ? "Tags bijgewerkt" : "Tags toegevoegd", 
      description: isSingleEdit ? "De tags voor dit werk zijn aangepast." : `${tempBulkTags.length} tags toegevoegd aan ${selectedArtworks.length} items.` 
    });
    
    setIsBulkTagDialogOpen(false);
    setTempBulkTags([]);
    setSelectedItems([]);
    setIsUploading(false);
  };

  const bulkRemoveFromRoom = (roomId: string, roomTitle: string) => {
    if (!firestore || selectedArtworks.length === 0) return;
    selectedArtworks.forEach(id => {
      const docRef = doc(firestore, 'artworks', id);
      updateDoc(docRef, { roomIds: arrayRemove(roomId) })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { roomIds: arrayRemove(roomId) }
          } satisfies SecurityRuleContext));
        });
    });
    toast({ title: "Verwijderd uit zaal", description: `${selectedArtworks.length} items verwijderd uit '${roomTitle}'` });
    setSelectedItems([]);
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
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-md border-b z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-4 shrink-0">
            <LayoutDashboard className="w-6 h-6 text-accent" />
            <h1 className="font-headline text-2xl italic hidden sm:block">Museum Beheer</h1>
          </div>
          <div className="h-8 w-px bg-black/10 mx-2 hidden md:block" />
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <Link href="/admin/forum" className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 text-accent hover:bg-accent hover:text-white transition-all shrink-0">
               <Users className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Forum</span>
            </Link>
            <Link href="/admin/team" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shrink-0">
               <Zap className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Team Hub</span>
            </Link>
            <Link href="/admin/translate" className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 text-black hover:bg-black hover:text-white transition-all shrink-0">
               <Languages className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">DTP & Teksten</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
           <Button 
             variant="ghost"
             onClick={handleCleanupYears}
             disabled={isCleaning}
             className="h-12 rounded-full text-accent font-black uppercase tracking-widest text-[9px] hover:bg-accent/5"
           >
             {isCleaning ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4 mr-2" />}
             Schoonmaak
           </Button>
           <Button 
             onClick={handleOpenNewArtwork} 
             className="h-12 rounded-full bg-accent text-white px-6 md:px-8 font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all"
           >
             <Plus className="w-4 h-4 md:mr-2" /> 
             <span className="hidden md:inline">Nieuw Kunstwerk</span>
             <span className="md:hidden inline">Toevoegen</span>
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

              <Button 
                variant="ghost" 
                onClick={() => { setTempBulkTags([]); setIsBulkTagDialogOpen(true); }}
                className="h-10 px-5 rounded-full hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
              >
                <TagIcon className="w-4 h-4 mr-2" /> Bulk Taggen
              </Button>

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
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div className="relative flex-1 w-full max-w-md">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                 <Input 
                   placeholder="Zoek op titel of tags..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="h-14 pl-14 rounded-2xl bg-white border-none shadow-inner"
                 />
               </div>
               
               <div className="flex items-center gap-4">
                 <div className="bg-black/5 p-1 rounded-xl flex gap-1">
                    <Button 
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('grid')}
                      className="rounded-lg px-3 h-10"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('list')}
                      className="rounded-lg px-3 h-10"
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                 </div>
                 <div className="h-8 w-px bg-black/10 mx-2" />
                 <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40">
                    <Library className="w-4 h-4" /> {filteredArtworks.length} items
                 </div>
               </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {artLoading ? (
                  Array(12).fill(0).map((_, i) => <div key={i} className="aspect-[4/5] bg-black/5 animate-pulse rounded-3xl" />)
                ) : filteredArtworks.length === 0 ? (
                  <div className="col-span-full py-32 text-center space-y-6 bg-black/5 rounded-[3rem] border-2 border-dashed border-black/10">
                    <Library className="w-12 h-12 mx-auto opacity-10" />
                    <p className="font-headline text-2xl italic opacity-30">Geen resultaten gevonden...</p>
                  </div>
                ) : filteredArtworks.map((art: any) => {
                  const displayImage = art.image || art.imageUrl;
                  return (
                    <Card 
                      key={art.id} 
                      className={cn(
                        "group relative aspect-[4/5] rounded-[2rem] overflow-hidden border-none shadow-md transition-all cursor-pointer",
                        selectedArtworks.includes(art.id) ? "ring-4 ring-accent ring-offset-4 scale-95" : "hover:shadow-2xl"
                      )}
                      onClick={() => toggleSelection(art.id)}
                    >
                      {displayImage && (
                        <img 
                          src={displayImage} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          style={{ filter: `brightness(0.9)` }}
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
                              handleEditArtwork(art);
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
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white/60 backdrop-blur-xl">
                <Table>
                  <TableHeader className="bg-black/5">
                    <TableRow className="border-none hover:bg-transparent h-16">
                      <TableHead className="w-20 pl-8"></TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Thumbnail</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Titel / Archiefnaam</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Jaar & Techniek</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Tags</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArtworks.map((art: any) => {
                      const displayImage = art.image || art.imageUrl;
                      const isSelected = selectedArtworks.includes(art.id);
                      return (
                        <TableRow 
                          key={art.id} 
                          className={cn(
                            "group cursor-pointer h-24 transition-colors", 
                            isSelected ? "bg-accent/5" : "hover:bg-black/[0.02]"
                          )}
                          onClick={() => toggleSelection(art.id)}
                        >
                          <TableCell className="pl-8">
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-accent border-accent text-white" : "border-black/10"
                            )}>
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 border border-black/5 shadow-sm">
                              {displayImage ? (
                                <img src={displayImage} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-4 h-4" /></div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm">{art.displayTitle || art.title}</p>
                              <p className="text-[10px] font-mono opacity-30">{art.title}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex flex-col">
                               <span className="text-sm font-medium opacity-80">{art.year || '-'}</span>
                               <span className="text-[10px] opacity-40 uppercase font-black">{art.medium || '-'}</span>
                             </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {(art.tags || []).map((t: string) => (
                                <Badge key={t} variant="outline" className="text-[8px] px-2 py-0 h-4 bg-black/5 border-none font-bold uppercase tracking-wider">{t}</Badge>
                              ))}
                              {(art.tags || []).length === 0 && <span className="text-[10px] italic opacity-20">Geen tags</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                             <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { e.stopPropagation(); handleEditArtwork(art); }} 
                                  className="w-10 h-10 rounded-full hover:bg-accent/10 hover:text-accent"
                                  title="Volledig dossier"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setSelectedItems([art.id]); 
                                    setTempBulkTags(art.tags || []);
                                    setIsBulkTagDialogOpen(true); 
                                  }} 
                                  className="w-10 h-10 rounded-full hover:bg-accent/10 hover:text-accent"
                                  title="Tags aanpassen"
                                >
                                  <TagIcon className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  asChild
                                  className="w-10 h-10 rounded-full hover:bg-black/5"
                                  title="Bekijk op site"
                                >
                                  <Link href={`/art/${art.slug || art.id}`} target="_blank">
                                    <ExternalLink className="w-4 h-4" />
                                  </Link>
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8 mt-0">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div>
                  <h2 className="font-headline text-3xl italic">Interactieve Zalen</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Selecteer schilderijen in het archief om ze aan zalen toe te voegen.</p>
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
                            {roomArtworks.map((art: any) => {
                               const displayImage = art.image || art.imageUrl;
                               return (
                                <div key={art.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/5">
                                    {displayImage && <img src={displayImage} className="w-full h-full object-cover" alt="" />}
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
                               );
                            })}
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

      <Dialog open={isBulkTagDialogOpen} onOpenChange={setIsBulkTagDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-10">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Tags Bewerken</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">
              {selectedArtworks.length === 1 ? 'Pas tags aan voor dit werk' : `Voeg tags toe aan ${selectedArtworks.length} geselecteerde items`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-8 overflow-y-auto max-h-[60vh]">
             {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
               <div key={cat} className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-accent border-b border-black/5 pb-2">{cat}</h4>
                  <div className="grid gap-2">
                    {tags.map(tag => (
                      <div key={tag} className="flex items-center space-x-3 group cursor-pointer" onClick={() => {
                        setTempBulkTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                      }}>
                        <Checkbox 
                          checked={tempBulkTags.includes(tag)} 
                          onCheckedChange={() => {}} 
                          className="rounded-md border-black/10 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/60 group-hover:text-foreground transition-colors">{tag}</span>
                      </div>
                    ))}
                  </div>
               </div>
             ))}
          </div>

          <DialogFooter className="pt-6 border-t">
             <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{tempBulkTags.length} tags geselecteerd</span>
                <div className="flex gap-3">
                   <Button variant="ghost" onClick={() => { setIsBulkTagDialogOpen(false); setSelectedItems([]); }} className="rounded-full px-8 uppercase font-black text-[10px] tracking-widest">Annuleren</Button>
                   <Button 
                    onClick={applyBulkTags} 
                    disabled={isUploading}
                    className="rounded-full bg-accent text-white px-10 h-14 uppercase font-black text-[10px] tracking-widest shadow-xl"
                   >
                     {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                     Opslaan
                   </Button>
                </div>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[3rem] p-8 md:p-12 overflow-y-auto max-h-[90vh]">
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
                <div className="space-y-4">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Afbeelding (Upload of URL)</Label>
                   
                   <div className="flex flex-col gap-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative aspect-video rounded-2xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all overflow-hidden bg-black/[0.02]"
                      >
                         {selectedFile || artworkForm.image ? (
                           <>
                             <img 
                               src={selectedFile ? URL.createObjectURL(selectedFile) : artworkForm.image} 
                               className="absolute inset-0 w-full h-full object-cover opacity-40"
                               alt=""
                             />
                             <div className="relative z-10 flex flex-col items-center gap-2">
                               <CheckCircle2 className="w-6 h-6 text-accent" />
                               <span className="text-[9px] font-black uppercase tracking-widest bg-white/80 px-3 py-1 rounded-full">{selectedFile ? "Nieuw bestand" : "Huidige foto"}</span>
                             </div>
                           </>
                         ) : (
                           <>
                             <Upload className="w-8 h-8 opacity-20 group-hover:text-accent group-hover:opacity-100 transition-all" />
                             <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Kies bestand van computer</span>
                           </>
                         )}
                         <input 
                           type="file" 
                           ref={fileInputRef}
                           onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                           className="hidden" 
                           accept="image/*"
                         />
                      </div>

                      <div className="relative">
                         <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-20">
                            <ImageIcon className="w-4 h-4" />
                         </div>
                         <Input 
                            placeholder="Of plak een directe URL..." 
                            value={artworkForm.image} 
                            onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} 
                            className="h-12 pl-12 rounded-xl bg-black/5 border-none text-xs font-mono" 
                         />
                      </div>
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Beschrijving</Label>
                   <Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="min-h-[140px] rounded-[2rem] bg-black/5 border-none p-6" />
                </div>
             </div>
          </div>
          <DialogFooter className="mt-12">
             <Button 
                onClick={handleSaveArtwork} 
                disabled={isUploading}
                className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] transition-all"
             >
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingArtwork ? 'Wijzigingen Opslaan' : 'Toevoegen aan Archief'}
             </Button>
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
             <Button onClick={handleSaveRoom} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-xl">Zaal Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
