"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useStorage, useAuth } from '@/firebase';
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
import { signInAnonymously } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Plus,
  Layers,
  Edit3,
  Search,
  X,
  Archive,
  ChevronDown,
  Upload,
  LayoutGrid,
  List as ListIcon,
  Tag as TagIcon,
  Type,
  Database,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  GripHorizontal,
  FolderInput,
  Lock,
  Building2,
  Filter,
  Images,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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

type BulkItem = {
  file: File;
  title: string;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
};

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
      if (auth && !auth.currentUser) {
        signInAnonymously(auth).catch(err => console.warn("Background auth failed:", err));
      }
    }
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1527') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      if (auth) {
        signInAnonymously(auth).catch(err => console.warn("Anoniem inloggen mislukt:", err));
      }
    } else {
      toast({ variant: "destructive", title: "Wachtwoord onjuist" });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('archive');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMonumentalOnly, setShowMonumentalOnly] = useState(false);
  const [curatingRoom, setCuratingRoom] = useState<any>(null);
  
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isSelectorDialogOpen, setIsSelectorDialogOpen] = useState(false);
  
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload State
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkGlobalYear, setBulkGlobalYear] = useState('');
  const [bulkGlobalMedium, setBulkGlobalMedium] = useState('');
  const [bulkGlobalTags, setBulkGlobalTags] = useState<string[]>([]);
  const [bulkGlobalRooms, setBulkGlobalRooms] = useState<string[]>([]);
  const [bulkGlobalMonumental, setBulkGlobalMonumental] = useState(false);

  const [panelPos, setPanelPos] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [bulkExpanded, setBulkExpanded] = useState({ rooms: true, tags: true });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: [], roomIds: [], featured: false, inShop: false, isMonumental: false
  });
  
  const [roomForm, setRoomForm] = useState<any>({ title: '', description: '', order: 0, isPublished: false });

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
    let filtered = artworks.filter((art: any) => 
      (art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    if (showMonumentalOnly) {
      filtered = filtered.filter((art: any) => art.isMonumental === true);
    }

    if (curatingRoom) {
      filtered = filtered.filter((art: any) => art.roomIds?.includes(curatingRoom.id));
    }

    return [...filtered].sort(sortArtworksByTitle);
  }, [artworks, searchQuery, showMonumentalOnly, curatingRoom]);

  const availableForRoom = useMemo(() => {
    if (!curatingRoom) return [];
    return artworks.filter(art => !art.roomIds?.includes(curatingRoom.id));
  }, [artworks, curatingRoom]);

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredArtworks.length) setSelectedIds([]);
    else setSelectedIds(filteredArtworks.map(a => a.id));
  };

  const handleBulkUpdate = (type: 'add_tag' | 'remove_tag' | 'add_room' | 'remove_room', value: string) => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const artRef = doc(firestore, 'artworks', id);
      if (type === 'add_tag') batch.update(artRef, { tags: arrayUnion(value) });
      if (type === 'remove_tag') batch.update(artRef, { tags: arrayRemove(value) });
      if (type === 'add_room') batch.update(artRef, { roomIds: arrayUnion(value) });
      if (type === 'remove_room') batch.update(artRef, { roomIds: arrayRemove(value) });
    });

    batch.commit()
      .then(() => toast({ title: "Selectie bijgewerkt" }))
      .catch(async () => toast({ variant: "destructive", title: "Bulk update mislukt" }));
  };

  const handleBatchAddSelectionToRoom = (ids: string[]) => {
    if (!firestore || !curatingRoom || ids.length === 0) return;
    const batch = writeBatch(firestore);
    ids.forEach(id => {
      batch.update(doc(firestore, 'artworks', id), { roomIds: arrayUnion(curatingRoom.id) });
    });
    batch.commit()
      .then(() => {
        toast({ title: `${ids.length} werken toegevoegd aan ${curatingRoom.title}` });
        setIsSelectorDialogOpen(false);
      })
      .catch(() => toast({ variant: "destructive", title: "Toevoegen mislukt" }));
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    if (!confirm(`Weet u zeker dat u deze ${selectedIds.length} werken definitief wilt verwijderen?`)) return;

    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      batch.delete(doc(firestore, 'artworks', id));
    });

    try {
      await batch.commit();
      toast({ title: `${selectedIds.length} werken verwijderd` });
      setSelectedIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Verwijderen mislukt" });
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPanelPos({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
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
      title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: [], 
      roomIds: curatingRoom ? [curatingRoom.id] : [], 
      featured: false, inShop: false, isMonumental: false 
    });
    setIsArtworkDialogOpen(true);
  };

  const handleEditArtwork = (art: any) => {
    setEditingArtwork(art); 
    setArtworkForm({ ...art, tags: Array.isArray(art.tags) ? art.tags : [], roomIds: Array.isArray(art.roomIds) ? art.roomIds : [] }); 
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

      const data = sanitizeArtwork({ ...artworkForm, image: finalImageUrl });

      if (editingArtwork) {
        const artRef = doc(firestore, 'artworks', editingArtwork.id);
        updateDoc(artRef, data)
          .then(() => toast({ title: "Bijgewerkt" }))
          .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update', requestResourceData: data })));
      } else {
        const artCol = collection(firestore, 'artworks');
        addDoc(artCol, { ...data, createdAt: serverTimestamp() })
          .then(() => toast({ title: "Toegevoegd" }))
          .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artCol.path, operation: 'create', requestResourceData: data })));
      }
      setIsArtworkDialogOpen(false);
      setSelectedFile(null);
    } catch (e) { toast({ variant: "destructive", title: "Fout bij opslaan" }); } finally { setIsUploading(false); }
  };

  const handleOpenNewRoom = () => {
    const maxOrder = rooms?.reduce((max: number, r: any) => Math.max(max, r.order || 0), 0) || 0;
    setEditingRoom(null);
    setRoomForm({ title: '', description: '', order: maxOrder + 1, isPublished: false });
    setIsRoomDialogOpen(true);
  };

  const handleSaveRoom = () => {
    if (!firestore) return;
    setIsSavingRoom(true);
    const data = { ...roomForm, slug: slugify(roomForm.title), updatedAt: serverTimestamp() };
    if (editingRoom) {
      const roomRef = doc(firestore, 'rooms', editingRoom.id);
      updateDoc(roomRef, data)
        .then(() => { toast({ title: "Bijgewerkt" }); setIsRoomDialogOpen(false); })
        .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: roomRef.path, operation: 'update', requestResourceData: data })))
        .finally(() => setIsSavingRoom(false));
    } else {
      const roomsCol = collection(firestore, 'rooms');
      addDoc(roomsCol, { ...data, createdAt: serverTimestamp() })
        .then(() => { toast({ title: "Aangemaakt" }); setIsRoomDialogOpen(false); })
        .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: roomsCol.path, operation: 'create', requestResourceData: data })))
        .finally(() => setIsSavingRoom(false));
    }
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: BulkItem[] = files.map(file => ({
      file,
      title: file.name.split('.').slice(0, -1).join('.'),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    setBulkItems(prev => [...prev, ...newItems]);
    if (curatingRoom) setBulkGlobalRooms([curatingRoom.id]);
  };

  const handleBulkSave = async () => {
    if (!firestore || !storage || bulkItems.length === 0) return;
    setIsBulkUploading(true);
    let successCount = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      if (item.status === 'done') continue;
      setBulkItems(prev => prev.map((it, idx) => i === idx ? { ...it, status: 'uploading' } : it));
      try {
        const storageRef = ref(storage, `artworks/${Date.now()}_${item.file.name}`);
        const uploadResult = await uploadBytes(storageRef, item.file);
        const url = await getDownloadURL(uploadResult.ref);
        const data = sanitizeArtwork({
          title: item.title, displayTitle: item.title, image: url,
          year: bulkGlobalYear, medium: bulkGlobalMedium, tags: bulkGlobalTags,
          roomIds: bulkGlobalRooms, isMonumental: bulkGlobalMonumental
        });
        await addDoc(collection(firestore, 'artworks'), { ...data, createdAt: serverTimestamp() });
        setBulkItems(prev => prev.map((it, idx) => i === idx ? { ...it, status: 'done' } : it));
        successCount++;
      } catch (err) {
        setBulkItems(prev => prev.map((it, idx) => i === idx ? { ...it, status: 'error' } : it));
      }
    }
    toast({ title: `${successCount} werken toegevoegd.` });
    setIsBulkUploading(false);
    if (successCount === bulkItems.length) setTimeout(() => setIsBulkDialogOpen(false), 1500);
  };

  const selectedArts = useMemo(() => artworks.filter(a => selectedIds.includes(a.id)), [artworks, selectedIds]);
  const isTagAssignedToSelection = (tag: string) => selectedArts.some(a => a.tags?.includes(tag));
  const isRoomAssignedToSelection = (roomId: string) => selectedArts.some(a => a.roomIds?.includes(roomId));

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto text-accent"><Lock className="w-8 h-8" /></div>
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
        <div className="flex items-center gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => { 
              setBulkItems([]); 
              setBulkGlobalRooms(curatingRoom ? [curatingRoom.id] : []);
              setIsBulkDialogOpen(true); 
            }} 
            className="h-12 rounded-full border-accent text-accent px-8 font-black uppercase tracking-widest text-[10px] hover:bg-accent/5"
          >
            <Images className="w-4 h-4 mr-2" /> Bulk Upload
          </Button>
          <Button type="button" onClick={handleOpenNewArtwork} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all">
            <Plus className="w-4 h-4 mr-2" /> Nieuw Kunstwerk
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12 pb-48">
        <Tabs value={activeTab} onValueChange={(v) => { if(v !== 'archive') setCuratingRoom(null); setActiveTab(v); }} className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-lg">
            <TabsTrigger value="archive" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest"><Archive className="w-4 h-4 mr-2" /> Alle Werken</TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest"><Layers className="w-4 h-4 mr-2" /> Zalen & Curatie</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-8 mt-0">
            {curatingRoom && (
              <div className="flex items-center justify-between p-6 bg-accent text-white rounded-3xl shadow-xl animate-in slide-in-from-top-4">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setCuratingRoom(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                       <h2 className="font-headline text-2xl italic leading-none">Curatie: {curatingRoom.title}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">U beheert nu alleen de werken in deze zaal</p>
                    </div>
                 </div>
                 <Button onClick={() => setIsSelectorDialogOpen(true)} className="bg-white text-accent rounded-full h-12 px-8 font-black uppercase tracking-widest text-[10px] hover:bg-white/90">
                    <Plus className="w-4 h-4 mr-2" /> Toevoegen uit Archief
                 </Button>
              </div>
            )}

            <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div className="flex items-center gap-4 flex-1">
                 <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                   <Input placeholder="Zoek op titel..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white border-none shadow-inner" />
                 </div>
                 {!curatingRoom && (
                   <Button 
                    type="button" 
                    onClick={() => setShowMonumentalOnly(!showMonumentalOnly)}
                    variant={showMonumentalOnly ? "default" : "outline"}
                    className={cn("h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]", showMonumentalOnly && "bg-accent text-white border-accent")}
                   >
                     <Building2 className="w-4 h-4 mr-2" /> Monumentaal
                   </Button>
                 )}
               </div>
               <div className="flex items-center gap-4">
                 <Button type="button" onClick={handleSelectAll} variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedIds.length === filteredArtworks.length ? 'Deselecteer' : 'Selecteer Alles'}</Button>
                 <div className="bg-black/5 p-1 rounded-xl flex gap-1">
                    <Button type="button" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-lg"><LayoutGrid className="w-4 h-4" /></Button>
                    <Button type="button" variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-lg"><ListIcon className="w-4 h-4" /></Button>
                 </div>
               </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredArtworks.map((art: any) => (
                  <div key={art.id} onClick={() => handleEditArtwork(art)} className={cn("cursor-pointer relative transition-all", selectedIds.includes(art.id) && "scale-95")}>
                    <button type="button" onClick={(e) => handleToggleSelect(art.id, e)} className={cn("absolute top-4 left-4 z-10 p-2 rounded-full backdrop-blur-md border transition-all", selectedIds.includes(art.id) ? "bg-accent text-white border-accent opacity-100" : "bg-white/20 opacity-0 group-hover:opacity-100")}>
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <Card className="p-4 rounded-3xl overflow-hidden shadow-md border-2 border-transparent bg-white">
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
                  <Card key={art.id} className={cn("p-6 rounded-[2rem] flex items-center gap-8 cursor-pointer hover:shadow-lg transition-all bg-white relative", selectedIds.includes(art.id) && "border-accent ring-2 ring-accent")} onClick={() => handleEditArtwork(art)}>
                    <button type="button" onClick={(e) => handleToggleSelect(art.id, e)} className={cn("p-2 rounded-full border transition-all", selectedIds.includes(art.id) ? "bg-accent text-white border-accent" : "bg-black/5")}>
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <img src={art.image} className="w-32 h-32 object-cover rounded-2xl shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl mb-1 truncate">{art.title}</h3>
                      <p className="text-xs font-black uppercase opacity-40">{art.year} • {art.medium || 'Geen techniek'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-12 mt-0">
             <div className="flex justify-center">
                <Button type="button" onClick={handleOpenNewRoom} className="h-16 px-10 rounded-full bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-xl">
                  <Plus className="w-5 h-5 mr-3" /> Nieuwe Zaal Aanmaken
                </Button>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rooms?.map((room: any) => {
                  const artCount = artworks.filter(a => a.roomIds?.includes(room.id)).length;
                  return (
                    <Card key={room.id} className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg flex flex-col justify-between group">
                       <div className="space-y-6">
                          <div className="flex justify-between items-start">
                             <Badge className="bg-accent/10 text-accent uppercase text-[9px] font-black">Zaal {room.order}</Badge>
                             <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingRoom(room); setRoomForm({...room}); setIsRoomDialogOpen(true); }}><Edit3 className="w-4 h-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" disabled={artCount > 0} onClick={() => deleteDoc(doc(firestore!, 'rooms', room.id))} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </div>
                          <div>
                             <h3 className="font-headline text-3xl italic mb-2">{room.title}</h3>
                             <p className="text-xs font-bold uppercase tracking-widest opacity-40">{artCount} werken in zaal</p>
                          </div>
                       </div>
                       <div className="mt-8 flex flex-col gap-3">
                          <Button onClick={() => { setCuratingRoom(room); setActiveTab('archive'); }} className="h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] w-full shadow-lg group-hover:scale-[1.02] transition-all">
                             <Settings2 className="w-4 h-4 mr-2" /> Werken Beheren
                          </Button>
                          <Button type="button" onClick={() => updateDoc(doc(firestore!, 'rooms', room.id), { isPublished: !room.isPublished })} variant="ghost" className="h-10 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">
                             {room.isPublished ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />}
                             {room.isPublished ? "Verbergen" : "Zichtbaar maken"}
                          </Button>
                       </div>
                    </Card>
                  );
                })}
             </div>
          </TabsContent>
        </Tabs>
      </main>

      {selectedIds.length > 0 && (
        <div className="fixed z-[1000] shadow-2xl" style={{ left: panelPos.x, top: panelPos.y, width: '420px' }}>
           <Card className="rounded-[2.5rem] bg-white border-4 border-accent overflow-hidden flex flex-col max-h-[80vh]">
              <div onMouseDown={handleDragStart} className="p-6 bg-accent text-white cursor-grab active:cursor-grabbing flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <GripHorizontal className="w-5 h-5 opacity-40" />
                  <span className="font-headline text-lg italic">Bulk Beheer</span>
                  <Badge variant="outline" className="bg-white/10 text-white text-[9px] font-black">{selectedIds.length} items</Badge>
                </div>
                <div className="flex items-center gap-2">
                   <Button onClick={handleBulkDelete} variant="ghost" className="h-8 w-8 rounded-full p-0 text-white hover:bg-red-500"><Trash2 className="w-4 h-4" /></Button>
                   <Button type="button" onClick={() => setSelectedIds([])} variant="ghost" className="h-8 w-8 rounded-full p-0 text-white hover:bg-white/10"><X className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-8 custom-scrollbar">
                 <div className="space-y-2">
                    <button type="button" onClick={() => setBulkExpanded(p => ({ ...p, rooms: !p.rooms }))} className="flex items-center justify-between w-full p-2 hover:bg-black/5 rounded-lg">
                       <Label className="text-[10px] font-black uppercase text-accent border-l-4 border-accent pl-3 cursor-pointer">Zaal Toewijzing</Label>
                       <ChevronDown className={cn("w-4 h-4 text-accent transition-transform", !bulkExpanded.rooms && "-rotate-90")} />
                    </button>
                    {bulkExpanded.rooms && (
                      <div className="grid grid-cols-1 gap-2 pt-2">
                         {rooms?.map((room: any) => {
                           const isActive = isRoomAssignedToSelection(room.id);
                           return (
                             <button type="button" key={room.id} onClick={() => handleBulkUpdate(isActive ? 'remove_room' : 'add_room', room.id)} className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all text-left", isActive ? "bg-accent/5 border-accent text-accent" : "bg-white border-black/5 text-black/40")}>
                                {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{room.title}</span>
                             </button>
                           );
                         })}
                      </div>
                    )}
                 </div>
                 <Separator className="bg-black/5" />
                 <div className="space-y-2">
                    <button type="button" onClick={() => setBulkExpanded(p => ({ ...p, tags: !p.tags }))} className="flex items-center justify-between w-full p-2 hover:bg-black/5 rounded-lg">
                       <Label className="text-[10px] font-black uppercase text-accent border-l-4 border-accent pl-3 cursor-pointer">Tags & Kenmerken</Label>
                       <ChevronDown className={cn("w-4 h-4 text-accent transition-transform", !bulkExpanded.tags && "-rotate-90")} />
                    </button>
                    {bulkExpanded.tags && (
                      <div className="space-y-6 pt-2">
                         {Object.entries(MUSEUM_TAGS).map(([category, tags]) => (
                            <div key={category} className="space-y-3">
                               <p className="text-[8px] font-black uppercase opacity-30 tracking-widest">{category}</p>
                               <div className="flex flex-wrap gap-1.5">
                                  {tags.map(tag => {
                                    const isActive = isTagAssignedToSelection(tag);
                                    return (
                                      <button type="button" key={tag} onClick={() => handleBulkUpdate(isActive ? 'remove_tag' : 'add_tag', tag)} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-2", isActive ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40 hover:border-black/20")}>
                                        {isActive ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                        {tag}
                                      </button>
                                    );
                                  })}
                               </div>
                            </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* ARCHIVE SELECTOR DIALOG (Toevoegen aan zaal) */}
      <Dialog open={isSelectorDialogOpen} onOpenChange={setIsSelectorDialogOpen}>
        <DialogContent className="max-w-5xl rounded-[3rem] p-0 overflow-hidden bg-background">
          <div className="flex flex-col h-[85vh]">
            <DialogHeader className="p-10 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                   <DialogTitle className="font-headline text-3xl italic">Toevoegen aan {curatingRoom?.title}</DialogTitle>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Selecteer werken uit het archief om toe te voegen aan deze zaal</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="relative w-64">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <Input placeholder="Filter archief..." className="h-12 pl-10 rounded-xl bg-black/5 border-none" />
                   </div>
                   <Button onClick={() => setIsSelectorDialogOpen(false)} variant="ghost" className="rounded-full"><X className="w-5 h-5" /></Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-black/[0.02]">
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {availableForRoom.map(art => (
                    <div 
                      key={art.id} 
                      onClick={() => handleBatchAddSelectionToRoom([art.id])}
                      className="group cursor-pointer space-y-4"
                    >
                       <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-white shadow-md group-hover:shadow-xl transition-all border-2 border-transparent group-hover:border-accent">
                          <img src={art.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-accent/20">
                             <Plus className="w-10 h-10 text-white" />
                          </div>
                       </div>
                       <div className="text-center">
                          <h4 className="font-bold text-xs truncate px-2">{art.title}</h4>
                          <p className="text-[9px] font-black uppercase opacity-30">{art.year}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ARTWORK EDITOR DIALOG */}
      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-0 overflow-hidden bg-background">
          <div className="flex h-[85vh]">
            <div className="w-1/2 bg-black/5 flex flex-col items-center justify-center p-12 border-r">
              {artworkForm.image ? (
                <div className="relative group w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
                  <img src={artworkForm.image} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-full h-12 px-6">Vervangen</Button>
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

            <div className="w-1/2 flex flex-col h-full">
              <DialogHeader className="p-8 border-b">
                <DialogTitle className="font-headline text-3xl italic">{editingArtwork ? 'Bewerken' : 'Nieuw Werk'}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                    <Type className="w-4 h-4 text-accent" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Identiteit</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Titel</Label><Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value, displayTitle: artworkForm.displayTitle || e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
                    <div className="flex items-center space-x-3 p-4 rounded-xl bg-black/5">
                      <Checkbox id="isMonumental" checked={artworkForm.isMonumental} onCheckedChange={(v) => setArtworkForm({...artworkForm, isMonumental: !!v})} />
                      <Label htmlFor="isMonumental" className="text-[11px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-accent" /> Monumentaal werk
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Jaar</Label><Input value={artworkForm.year} onChange={e => setArtworkForm({...artworkForm, year: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Techniek</Label><Select value={artworkForm.medium} onValueChange={v => setArtworkForm({...artworkForm, medium: v})}><SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue placeholder="Selecteer..." /></SelectTrigger><SelectContent className="rounded-xl shadow-xl border-none">{ART_TECHNIQUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><TagIcon className="w-4 h-4 text-accent" /><h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Tags</h4></div>
                  <div className="space-y-4">{Object.entries(MUSEUM_TAGS).map(([cat, tags]) => <div key={cat} className="space-y-2"><p className="text-[8px] font-black uppercase opacity-30">{cat}</p><div className="flex flex-wrap gap-1.5">{tags.map(tag => <button key={tag} type="button" onClick={() => { const tags = artworkForm.tags || []; setArtworkForm({...artworkForm, tags: tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag]}); }} className={cn("px-3 py-1 rounded-lg text-[9px] font-bold border transition-all", artworkForm.tags?.includes(tag) ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40 hover:border-black/20")}>{tag}</button>)}</div></div>)}</div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><FolderInput className="w-4 h-4 text-accent" /><h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Zalen</h4></div>
                  <div className="grid grid-cols-2 gap-4">{rooms?.map((room: any) => <button key={room.id} type="button" onClick={() => { const roomIds = artworkForm.roomIds || []; setArtworkForm({...artworkForm, roomIds: roomIds.includes(room.id) ? roomIds.filter((id: string) => id !== room.id) : [...roomIds, room.id]}); }} className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all text-left", artworkForm.roomIds?.includes(room.id) ? "bg-accent/5 border-accent text-accent" : "bg-white border-black/5 text-black/40")}>{artworkForm.roomIds?.includes(room.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}<span className="text-[10px] font-black uppercase tracking-widest">{room.title}</span></button>)}</div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><Edit3 className="w-4 h-4 text-accent" /><h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Beschrijving</h4></div>
                  <Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="min-h-[140px] rounded-2xl bg-black/5 border-none p-6" />
                </section>
              </div>

              <div className="p-8 bg-black/5 flex items-center gap-4">
                <Button type="button" onClick={handleSaveArtwork} disabled={isUploading} className="flex-1 h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest shadow-xl">{isUploading ? <Loader2 className="animate-spin" /> : "Opslaan"}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK UPLOAD DIALOG */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden bg-background">
          <div className="flex h-[90vh]">
             <div className="w-1/3 bg-black/5 border-r p-8 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-10 custom-scrollbar pr-2">
                   <div className="space-y-4">
                      <DialogTitle className="font-headline text-3xl italic">Bulk Archivering</DialogTitle>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Instellingen voor de hele batch</p>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Jaar</Label><Input value={bulkGlobalYear} onChange={e => setBulkGlobalYear(e.target.value)} placeholder="Bijv. 1965" className="bg-white border-none h-12 rounded-xl" /></div>
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Techniek</Label><Select value={bulkGlobalMedium} onValueChange={setBulkGlobalMedium}><SelectTrigger className="h-12 rounded-xl bg-white border-none"><SelectValue placeholder="Kies..." /></SelectTrigger><SelectContent className="rounded-xl shadow-2xl border-none">{ART_TECHNIQUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                      <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/50"><Checkbox id="bulkMonumental" checked={bulkGlobalMonumental} onCheckedChange={(v) => setBulkGlobalMonumental(!!v)} /><Label htmlFor="bulkMonumental" className="text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-2"><Building2 className="w-4 h-4 text-accent" /> Allemaal Monumentaal</Label></div>
                      <div className="space-y-2"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Zalen</Label><div className="grid grid-cols-1 gap-2">{rooms?.map((room: any) => (
                        <button key={room.id} type="button" onClick={() => setBulkGlobalRooms(prev => prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id])} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all text-left", bulkGlobalRooms.includes(room.id) ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40")}>
                          {bulkGlobalRooms.includes(room.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}<span className="text-[9px] font-black uppercase">{room.title}</span>
                        </button>
                      ))}</div></div>
                   </div>
                </div>
                <div className="pt-8 mt-8 border-t border-black/10"><Button type="button" onClick={handleBulkSave} disabled={isBulkUploading || bulkItems.length === 0} className="w-full h-20 rounded-[2rem] bg-accent text-white font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all">{isBulkUploading ? <Loader2 className="animate-spin" /> : <div className="flex flex-col items-center"><span className="text-[13px]">Start Bulk Upload</span><span className="text-[9px] opacity-60 lowercase mt-1">({bulkItems.length} bestanden)</span></div>}</Button></div>
             </div>
             <div className="flex-1 flex flex-col">
                <header className="p-8 border-b flex justify-between items-center bg-white"><div className="flex items-center gap-4"><Images className="w-6 h-6 text-accent" /><span className="text-[11px] font-black uppercase tracking-widest">Wachtrij ({bulkItems.length})</span></div><Button type="button" variant="outline" className="rounded-full" onClick={() => document.getElementById('bulk-file-input')?.click()}><Plus className="w-4 h-4 mr-2" /> Toevoegen</Button><input id="bulk-file-input" type="file" multiple className="hidden" onChange={handleBulkFileSelect} /></header>
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">{bulkItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4"><Upload className="w-16 h-16" /><p className="font-headline text-2xl italic">Selecteer afbeeldingen</p></div> : <div className="grid grid-cols-2 md:grid-cols-3 gap-6">{bulkItems.map((item, idx) => (
                  <Card key={idx} className={cn("p-4 rounded-3xl border-2 transition-all relative group", item.status === 'done' ? "border-green-500/20" : "border-transparent")}>
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-black/5"><img src={item.preview} className="w-full h-full object-cover" alt="" />{item.status === 'uploading' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}{item.status === 'done' && <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-white" /></div>}</div>
                    <Input value={item.title} onChange={e => setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} className="h-10 rounded-xl bg-black/5 border-none text-xs" disabled={item.status === 'done' || item.status === 'uploading'} />
                    {item.status === 'pending' && <button type="button" onClick={() => setBulkItems(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white text-destructive p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>}
                  </Card>
                ))}</div>}</div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ROOM EDITOR DIALOG */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-lg rounded-[3rem] p-0 overflow-hidden bg-background">
          <DialogHeader className="p-10 border-b"><DialogTitle className="font-headline text-3xl italic">{editingRoom ? 'Zaal Bewerken' : 'Nieuwe Zaal'}</DialogTitle></DialogHeader>
          <div className="p-10 space-y-6">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Naam</Label><Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Beschrijving</Label><Textarea value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})} className="min-h-[120px] rounded-2xl bg-black/5 border-none p-4" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Volgorde</Label><Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: parseInt(e.target.value)})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Publiek Zichtbaar</Label><Switch checked={roomForm.isPublished} onCheckedChange={v => setRoomForm({...roomForm, isPublished: v})} /></div>
          </div>
          <div className="px-10 pb-10"><Button type="button" onClick={handleSaveRoom} disabled={isSavingRoom} className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px]">{isSavingRoom ? <Loader2 className="animate-spin" /> : "Opslaan"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
