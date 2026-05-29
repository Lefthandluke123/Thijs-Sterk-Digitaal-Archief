
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
  arrayRemove,
  writeBatch
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
  Tag as TagIcon,
  Save,
  Wand2,
  Type,
  Calendar,
  Hammer,
  Camera,
  Activity,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckSquare,
  Square,
  Tags,
  FolderInput,
  GripHorizontal,
  MousePointer2
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { normalizeArtwork, sanitizeArtwork, MUSEUM_TAGS, slugify, sortArtworksByTitle } from '@/lib/museum-utils';
import { Checkbox } from '@/components/ui/checkbox';

const ART_TECHNIQUES = [
  "Olieverf",
  "Aquarel",
  "Gouache",
  "Litho",
  "Pentekening",
  "Gemengde techniek",
  "Glas in lood",
  "Houtskool",
  "Ets",
  "Zeefdruk",
  "Anders..."
];

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const firestore = useFirestore();
  const storage = useStorage();

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1527') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Toegang geweigerd" });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Floating Panel State
  const [panelPos, setPanelPos] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: [], roomIds: [], featured: false, inShop: false
  });
  
  const [roomForm, setRoomForm] = useState({ title: '', description: '', order: 0 });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: dbArtworks, loading: artLoading } = useCollection(artworksQuery);
  const { data: rooms } = useCollection(roomsQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return dbArtworks.map(art => normalizeArtwork(art.id, art));
  }, [dbArtworks]);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    const filtered = artworks.filter((art: any) => 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return [...filtered].sort(sortArtworksByTitle);
  }, [artworks, searchQuery]);

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredArtworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArtworks.map(a => a.id));
    }
  };

  const handleBulkUpdate = async (type: 'add_tag' | 'remove_tag' | 'add_room' | 'remove_room', value: string) => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    
    selectedIds.forEach(id => {
      const artRef = doc(firestore, 'artworks', id);
      if (type === 'add_tag') batch.update(artRef, { tags: arrayUnion(value) });
      if (type === 'remove_tag') batch.update(artRef, { tags: arrayRemove(value) });
      if (type === 'add_room') batch.update(artRef, { roomIds: arrayUnion(value) });
      if (type === 'remove_room') batch.update(artRef, { roomIds: arrayRemove(value) });
    });

    try {
      await batch.commit();
      toast({ title: `Bulk update voltooid voor ${selectedIds.length} items.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij bulk update" });
    }
  };

  // Dragging Logic
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panelPos.x,
      y: e.clientY - panelPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPanelPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleOpenNewArtwork = () => {
    setEditingArtwork(null);
    setArtworkForm({ 
      title: '', displayTitle: '', slug: '', image: '', year: '', medium: 'Olieverf', description: '', tags: [], roomIds: [], featured: false, inShop: false 
    });
    setIsArtworkDialogOpen(true);
  };

  const handleEditArtwork = (art: any) => {
    setEditingArtwork(art); 
    setArtworkForm({ 
      ...art, 
      tags: Array.isArray(art.tags) ? art.tags : [],
      roomIds: Array.isArray(art.roomIds) ? art.roomIds : []
    }); 
    setIsArtworkDialogOpen(true); 
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;
    setIsUploading(true);

    try {
      let finalImageUrl = artworkForm.image;
      if (selectedFile && storage) {
        const storageRef = ref(storage, `artworks/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const data = sanitizeArtwork({
        ...artworkForm,
        image: finalImageUrl
      });

      if (editingArtwork) {
        await updateDoc(doc(firestore, 'artworks', editingArtwork.id), data);
        toast({ title: "Bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'artworks'), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Toegevoegd aan archief" });
      }

      setIsArtworkDialogOpen(false);
      setSelectedFile(null);
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Fout bij opslaan" }); 
    } finally {
      setIsUploading(false);
    }
  };

  const toggleTag = (tag: string) => {
    const tags = artworkForm.tags || [];
    if (tags.includes(tag)) {
      setArtworkForm({ ...artworkForm, tags: tags.filter((t: string) => t !== tag) });
    } else {
      setArtworkForm({ ...artworkForm, tags: [...tags, tag] });
    }
  };

  const toggleRoom = (roomId: string) => {
    const roomIds = artworkForm.roomIds || [];
    if (roomIds.includes(roomId)) {
      setArtworkForm({ ...artworkForm, roomIds: roomIds.filter((id: string) => id !== roomId) });
    } else {
      setArtworkForm({ ...artworkForm, roomIds: [...roomIds, roomId] });
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto text-accent">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl italic">Archief <span className="text-accent">Beheer</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" className="h-16 rounded-2xl text-center text-xl bg-black/5 border-none" />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest">Ontgrendelen</Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-md border-b z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Archive className="w-6 h-6 text-accent" />
            <h1 className="font-headline text-2xl italic leading-none">Museum Archief</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Button onClick={handleOpenNewArtwork} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all">
             <Plus className="w-4 h-4 mr-2" /> Nieuw Kunstwerk
           </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12 pb-48">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-lg">
            <TabsTrigger value="archive" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest">
              <Archive className="w-4 h-4 mr-2" /> Alle Werken
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
                 <Button onClick={handleSelectAll} variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
                    {selectedIds.length === filteredArtworks.length ? 'Deselecteer Alles' : 'Selecteer Alles'}
                 </Button>
                 <div className="bg-black/5 p-1 rounded-xl flex gap-1">
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-lg px-3 h-10"><LayoutGrid className="w-4 h-4" /></Button>
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-lg px-3 h-10"><ListIcon className="w-4 h-4" /></Button>
                 </div>
               </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredArtworks.map((art: any) => (
                  <div 
                    key={art.id} 
                    onClick={() => handleEditArtwork(art)}
                    className={cn(
                      "cursor-pointer group relative",
                      selectedIds.includes(art.id) && "scale-95"
                    )}
                  >
                    <button 
                      onClick={(e) => handleToggleSelect(art.id, e)}
                      className={cn(
                        "absolute top-4 left-4 z-10 p-2 rounded-full backdrop-blur-md border transition-all",
                        selectedIds.includes(art.id) ? "bg-accent text-white border-accent" : "bg-white/20 border-white/40 opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <Card className={cn(
                      "p-4 rounded-3xl overflow-hidden shadow-md group-hover:shadow-xl transition-all border-2",
                      selectedIds.includes(art.id) ? "border-accent bg-accent/5" : "border-transparent"
                    )}>
                      <img src={art.image} className="aspect-square object-cover rounded-2xl mb-4" alt="" />
                      <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                      <p className="text-[9px] font-black uppercase opacity-30 mt-1">{art.year || '-'}</p>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArtworks.map((art: any) => (
                  <Card key={art.id} className={cn(
                    "p-6 rounded-[2rem] flex items-center gap-8 cursor-pointer hover:shadow-lg transition-all border-2",
                    selectedIds.includes(art.id) ? "border-accent bg-accent/5" : "border-transparent"
                  )} onClick={() => handleEditArtwork(art)}>
                    <Checkbox checked={selectedIds.includes(art.id)} onCheckedChange={() => handleToggleSelect(art.id)} onClick={e => e.stopPropagation()} />
                    <img src={art.image} className="w-40 h-40 object-cover rounded-2xl shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl mb-1 truncate">{art.title}</h3>
                      <p className="text-xs font-black uppercase tracking-widest opacity-40">{art.year} • {art.medium}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                         {art.tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-black/5">{t}</Badge>)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8 mt-0">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms?.map((room: any) => (
                  <Card key={room.id} className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg space-y-4">
                     <div className="flex justify-between items-start">
                        <Badge className="bg-accent/10 text-accent uppercase text-[9px] tracking-widest font-black">Zaal {room.order}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingRoom(room); setRoomForm({...room}); setIsRoomDialogOpen(true); }}><Edit3 className="w-4 h-4" /></Button>
                     </div>
                     <h3 className="font-headline text-3xl italic">{room.title}</h3>
                     <p className="text-sm text-muted-foreground line-clamp-2 italic">{room.description}</p>
                  </Card>
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* FLOATING DRAGGABLE BULK PANEL WITH INTERNAL SCROLLING */}
      {selectedIds.length > 0 && (
        <div 
          className="fixed z-[1000] shadow-2xl transition-shadow"
          style={{ left: panelPos.x, top: panelPos.y, width: '420px' }}
        >
           <Card className="rounded-[2.5rem] bg-white border-4 border-accent overflow-hidden flex flex-col max-h-[70vh] min-h-0">
              {/* Header / Handle */}
              <div 
                onMouseDown={handleDragStart}
                className="p-6 bg-accent text-white cursor-grab active:cursor-grabbing flex items-center justify-between shrink-0"
              >
                <div className="flex items-center gap-3">
                  <GripHorizontal className="w-5 h-5 opacity-40" />
                  <span className="font-headline text-lg italic">Bulk Beheer</span>
                  <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[9px] font-black">{selectedIds.length} items</Badge>
                </div>
                <Button onClick={() => setSelectedIds([])} variant="ghost" className="h-8 w-8 rounded-full p-0 text-white hover:bg-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Scrollable Content Area - FIX: Native scroll for better flex stability */}
              <div className="flex-1 overflow-y-auto p-8 min-h-0 custom-scrollbar">
                 <div className="space-y-10">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase opacity-60 border-l-4 border-accent pl-3">Toevoegen aan Zaal</Label>
                       <div className="grid grid-cols-1 gap-2">
                          {rooms?.map((room: any) => (
                            <Button key={room.id} variant="outline" onClick={() => handleBulkUpdate('add_room', room.id)} className="justify-start h-10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/5">
                               <Plus className="w-4 h-4 mr-3 opacity-30" /> {room.title}
                            </Button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                       <Label className="text-[10px] font-black uppercase opacity-60 border-l-4 border-accent pl-3">Tag Toevoegen</Label>
                       <div className="space-y-8">
                          {Object.entries(MUSEUM_TAGS).map(([category, tags]) => (
                            <div key={category} className="space-y-3">
                               <p className="text-[8px] font-black uppercase opacity-30 tracking-widest">{category}</p>
                               <div className="flex flex-wrap gap-1.5">
                                  {tags.map(tag => (
                                    <Button 
                                      key={tag} 
                                      size="sm" 
                                      variant="secondary" 
                                      onClick={() => handleBulkUpdate('add_tag', tag)} 
                                      className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-black/5 hover:bg-accent hover:text-white transition-all"
                                    >
                                      {tag}
                                    </Button>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Helper Footer */}
              <div className="p-4 bg-black/5 border-t text-center shrink-0">
                 <p className="text-[8px] font-bold uppercase opacity-30 tracking-[0.2em]">Pak de bovenbalk vast om dit paneel te verplaatsen</p>
              </div>
           </Card>
        </div>
      )}

      {/* ARTWORK EDITOR DIALOG */}
      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-0 overflow-hidden bg-background">
          <div className="flex h-[85vh]">
             {/* Linkerkant: Media Preview */}
             <div className="w-1/2 bg-black/5 flex flex-col items-center justify-center p-12 border-r">
                {artworkForm.image ? (
                  <div className="relative group w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
                     <img src={artworkForm.image} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-full h-12 px-6">Vervangen</Button>
                     </div>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/5 transition-all">
                     <Upload className="w-10 h-10 opacity-20" />
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Upload Afbeelding</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
             </div>

             {/* Rechterkant: Formulier */}
             <div className="w-1/2 flex flex-col h-full">
                <DialogHeader className="p-8 border-b">
                   <DialogTitle className="font-headline text-3xl italic">
                     {editingArtwork ? 'Werk Bewerken' : 'Nieuw Kunstwerk'}
                   </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                   {/* Namen Sectie */}
                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                         <Type className="w-4 h-4 text-accent" />
                         <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Identiteit</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase ml-2 opacity-40">Interne Titel</Label>
                            <Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase ml-2 opacity-40">Weergavetitel (Gallerie)</Label>
                            <Input value={artworkForm.displayTitle} onChange={e => setArtworkForm({...artworkForm, displayTitle: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <Label className="text-[9px] font-black uppercase ml-2 opacity-40">Jaar</Label>
                               <Input value={artworkForm.year} onChange={e => setArtworkForm({...artworkForm, year: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" />
                            </div>
                            <div className="space-y-1.5">
                               <Label className="text-[9px] font-black uppercase ml-2 opacity-40">Techniek</Label>
                               <Select value={artworkForm.medium} onValueChange={v => setArtworkForm({...artworkForm, medium: v})}>
                                  <SelectTrigger className="h-12 rounded-xl bg-black/5 border-none">
                                     <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl shadow-xl border-none">
                                     {ART_TECHNIQUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                  </SelectContent>
                               </Select>
                            </div>
                         </div>
                      </div>
                   </section>

                   {/* Tags Sectie */}
                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                         <TagIcon className="w-4 h-4 text-accent" />
                         <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Tags & Kenmerken</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {artworkForm.tags?.map((t: string) => (
                          <Badge key={t} className="bg-accent text-white rounded-full px-3 py-1 flex items-center gap-2">
                             {t} <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(t)} />
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-4">
                        {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
                          <div key={cat} className="space-y-2">
                             <p className="text-[8px] font-black uppercase opacity-30">{cat}</p>
                             <div className="flex flex-wrap gap-1.5">
                                {tags.map(tag => (
                                  <button 
                                    key={tag} 
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                      "px-3 py-1 rounded-lg text-[9px] font-bold border transition-all",
                                      artworkForm.tags?.includes(tag) ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40 hover:border-black/20"
                                    )}
                                  >
                                    {tag}
                                  </button>
                                ))}
                             </div>
                          </div>
                        ))}
                      </div>
                   </section>

                   {/* Zalen Sectie */}
                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                         <FolderInput className="w-4 h-4 text-accent" />
                         <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Zaal Toewijzing</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         {rooms?.map((room: any) => (
                           <button 
                             key={room.id}
                             onClick={() => toggleRoom(room.id)}
                             className={cn(
                               "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                               artworkForm.roomIds?.includes(room.id) ? "bg-accent/5 border-accent text-accent" : "bg-white border-black/5 text-black/40"
                             )}
                           >
                              {artworkForm.roomIds?.includes(room.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              <span className="text-[10px] font-black uppercase tracking-widest">{room.title}</span>
                           </button>
                         ))}
                      </div>
                   </section>

                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                         <Edit3 className="w-4 h-4 text-accent" />
                         <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Beschrijving</h4>
                      </div>
                      <Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="min-h-[140px] rounded-2xl bg-black/5 border-none p-6" />
                   </section>
                </div>

                <div className="p-8 bg-black/5 flex items-center gap-4">
                   <Button onClick={handleSaveArtwork} disabled={isUploading} className="flex-1 h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest shadow-xl">
                      {isUploading ? <Loader2 className="animate-spin" /> : "Wijzigingen Opslaan"}
                   </Button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
