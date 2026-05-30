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
  AlertCircle,
  Building2,
  CheckSquare,
  Square,
  GripHorizontal,
  FolderInput,
  Lock
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  const auth = useAuth();

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1527') {
      if (auth) {
        try {
          await signInAnonymously(auth);
          setIsAuthorized(true);
          sessionStorage.setItem('admin_auth', 'true');
        } catch (err) {
          toast({ variant: "destructive", title: "Firebase Auth Error", description: "Zorg dat anonieme inlog is ingeschakeld in de console." });
        }
      } else {
        setIsAuthorized(true);
        sessionStorage.setItem('admin_auth', 'true');
      }
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
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [panelPos, setPanelPos] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [bulkExpanded, setBulkExpanded] = useState({ rooms: true, tags: true });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: [], roomIds: [], featured: false, inShop: false, isMonumental: false, monumentalProjectId: ''
  });
  
  const [roomForm, setRoomForm] = useState<any>({ 
    title: '', 
    description: '', 
    order: 0,
    isPublished: false 
  });

  const [projectForm, setProjectForm] = useState<any>({
    title: '',
    order: 0
  });

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const projectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'monumental_projects'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: dbArtworks, loading: artLoading } = useCollection(artworksQuery);
  const { data: rooms } = useCollection(roomsQuery);
  const { data: projects } = useCollection(projectsQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return dbArtworks.map(art => normalizeArtwork(art.id, art));
  }, [dbArtworks]);

  const archiveArtworks = useMemo(() => {
    return artworks.filter(art => !art.isMonumental);
  }, [artworks]);

  const monumentalArtworks = useMemo(() => {
    return artworks.filter(art => art.isMonumental && art.monumentalProjectId === selectedProjectId);
  }, [artworks, selectedProjectId]);

  const filteredArtworks = useMemo(() => {
    const base = activeTab === 'monumentaal' ? monumentalArtworks : archiveArtworks;
    const filtered = base.filter((art: any) => 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return [...filtered].sort(sortArtworksByTitle);
  }, [archiveArtworks, monumentalArtworks, activeTab, searchQuery]);

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
      .then(() => {
        toast({ title: "Bijgewerkt", description: `${selectedIds.length} items aangepast.` });
      })
      .catch(async () => {
        toast({ variant: "destructive", title: "Bulk update mislukt" });
      });
  };

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
      title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: [], roomIds: [], featured: false, inShop: false, isMonumental: false, monumentalProjectId: ''
    });
    setIsArtworkDialogOpen(true);
  };

  const handleEditArtwork = (art: any) => {
    setEditingArtwork(art); 
    setArtworkForm({ 
      ...art, 
      tags: Array.isArray(art.tags) ? art.tags : [],
      roomIds: Array.isArray(art.roomIds) ? art.roomIds : [],
      isMonumental: !!art.isMonumental,
      monumentalProjectId: art.monumentalProjectId || ''
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
        image: finalImageUrl,
        isMonumental: artworkForm.isMonumental,
        monumentalProjectId: artworkForm.isMonumental ? artworkForm.monumentalProjectId : ''
      });

      if (editingArtwork) {
        const artRef = doc(firestore, 'artworks', editingArtwork.id);
        updateDoc(artRef, data)
          .then(() => toast({ title: "Bijgewerkt" }))
          .catch(async () => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: artRef.path,
               operation: 'update',
               requestResourceData: data
             } satisfies SecurityRuleContext));
          });
      } else {
        const artCol = collection(firestore, 'artworks');
        addDoc(artCol, { ...data, createdAt: serverTimestamp() })
          .then(() => toast({ title: "Toegevoegd aan archief" }))
          .catch(async () => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: artCol.path,
               operation: 'create',
               requestResourceData: data
             } satisfies SecurityRuleContext));
          });
      }

      setIsArtworkDialogOpen(false);
      setSelectedFile(null);
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Fout bij opslaan" }); 
    } finally {
      setIsUploading(false);
    }
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
        .then(() => { toast({ title: "Zaal bijgewerkt" }); setIsRoomDialogOpen(false); })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: roomRef.path, operation: 'update', requestResourceData: data } satisfies SecurityRuleContext));
        })
        .finally(() => setIsSavingRoom(false));
    } else {
      const roomsCol = collection(firestore, 'rooms');
      addDoc(roomsCol, { ...data, createdAt: serverTimestamp() })
        .then(() => { toast({ title: "Zaal aangemaakt" }); setIsRoomDialogOpen(false); })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: roomsCol.path, operation: 'create', requestResourceData: data } satisfies SecurityRuleContext));
        })
        .finally(() => setIsSavingRoom(false));
    }
  };

  const handleOpenNewProject = () => {
    const maxOrder = projects?.reduce((max: number, p: any) => Math.max(max, p.order || 0), 0) || 0;
    setEditingProject(null);
    setProjectForm({ title: '', order: maxOrder + 1 });
    setIsProjectDialogOpen(true);
  };

  const handleSaveProject = () => {
    if (!firestore) return;
    setIsSavingProject(true);
    const data = { ...projectForm, updatedAt: serverTimestamp() };

    if (editingProject) {
      const projRef = doc(firestore, 'monumental_projects', editingProject.id);
      updateDoc(projRef, data)
        .then(() => { toast({ title: "Project bijgewerkt" }); setIsProjectDialogOpen(false); })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: projRef.path, operation: 'update', requestResourceData: data } satisfies SecurityRuleContext));
        })
        .finally(() => setIsSavingProject(false));
    } else {
      const projCol = collection(firestore, 'monumental_projects');
      addDoc(projCol, { ...data, createdAt: serverTimestamp() })
        .then(() => { toast({ title: "Project aangemaakt" }); setIsProjectDialogOpen(false); })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: projCol.path, operation: 'create', requestResourceData: data } satisfies SecurityRuleContext));
        })
        .finally(() => setIsSavingProject(false));
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!firestore) return;
    if (confirm("Weet u zeker dat u deze zaal wilt verwijderen?")) {
      deleteDoc(doc(firestore, 'rooms', roomId))
        .then(() => toast({ title: "Zaal verwijderd" }))
        .catch(async () => toast({ variant: "destructive", title: "Verwijderen mislukt" }));
    }
  };

  const togglePublishRoom = (room: any) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'rooms', room.id), { isPublished: !room.isPublished, updatedAt: serverTimestamp() })
      .then(() => toast({ title: room.isPublished ? "Verborgen" : "Gepubliceerd" }));
  };

  const toggleTag = (tag: string) => {
    const tags = artworkForm.tags || [];
    if (tags.includes(tag)) setArtworkForm({ ...artworkForm, tags: tags.filter((t: string) => t !== tag) });
    else setArtworkForm({ ...artworkForm, tags: [...tags, tag] });
  };

  const toggleRoom = (roomId: string) => {
    const roomIds = artworkForm.roomIds || [];
    if (roomIds.includes(roomId)) setArtworkForm({ ...artworkForm, roomIds: roomIds.filter((id: string) => id !== roomId) });
    else setArtworkForm({ ...artworkForm, roomIds: [...roomIds, roomId] });
  };

  const resetOlieverf = async () => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      artworks.forEach(art => { if (art.medium === 'Olieverf') batch.update(doc(firestore, 'artworks', art.id), { medium: '' }); });
      await batch.commit();
      toast({ title: "Olieverf gereset" });
    } catch (e) { toast({ variant: "destructive", title: "Fout bij reset" }); }
  };

  const selectedArts = useMemo(() => artworks.filter(a => selectedIds.includes(a.id)), [artworks, selectedIds]);
  const isTagAssignedToSelection = (tag: string) => selectedArts.some(a => a.tags?.includes(tag));
  const isRoomAssignedToSelection = (roomId: string) => selectedArts.some(a => a.roomIds?.includes(roomId));

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
            <Button type="button" variant="ghost" size="icon" onClick={resetOlieverf} className="w-8 h-8 opacity-10 hover:opacity-100 transition-opacity">
               <Database className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button type="button" onClick={handleOpenNewArtwork} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Nieuw Kunstwerk
        </Button>
      </header>

      <main className="max-w-7xl mx-auto space-y-12 pb-48">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-lg">
            <TabsTrigger value="archive" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest"><Archive className="w-4 h-4 mr-2" /> Alle Werken</TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest"><Layers className="w-4 h-4 mr-2" /> Zalen & Curatie</TabsTrigger>
            <TabsTrigger value="monumentaal" className="rounded-full px-12 h-13 uppercase font-black text-[10px] tracking-widest"><Building2 className="w-4 h-4 mr-2" /> Monumentaal</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-8 mt-0">
            <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/60">
               <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                 <Input placeholder="Zoek op titel of tags..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-14 pl-14 rounded-2xl bg-white border-none shadow-inner" />
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
                  <div key={art.id} onClick={() => handleEditArtwork(art)} className={cn("cursor-pointer relative", selectedIds.includes(art.id) && "scale-95")}>
                    <button type="button" onClick={(e) => handleToggleSelect(art.id, e)} className={cn("absolute top-4 left-4 z-10 p-2 rounded-full backdrop-blur-md border", selectedIds.includes(art.id) ? "bg-accent text-white border-accent" : "bg-white/20 opacity-0 hover:opacity-100")}>
                      {selectedIds.includes(art.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <Card className="p-4 rounded-3xl overflow-hidden shadow-md border-2 border-transparent">
                      <img src={art.image} className="aspect-square object-cover rounded-2xl mb-4" alt="" />
                      <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArtworks.map((art: any) => (
                  <Card key={art.id} className="p-6 rounded-[2rem] flex items-center gap-8 cursor-pointer hover:shadow-lg transition-all" onClick={() => handleEditArtwork(art)}>
                    <img src={art.image} className="w-40 h-40 object-cover rounded-2xl shadow-sm" alt="" />
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
                    <Card key={room.id} className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg flex flex-col justify-between">
                       <div className="space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="flex flex-col gap-2">
                                <Badge className="bg-accent/10 text-accent uppercase text-[9px] font-black">Zaal {room.order}</Badge>
                                <Badge className={cn("uppercase text-[8px] font-black", room.isPublished ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
                                  {room.isPublished ? <Eye className="w-2.5 h-2.5 mr-1" /> : <EyeOff className="w-2.5 h-2.5 mr-1" />}
                                  {room.isPublished ? 'Zichtbaar' : 'Verborgen'}
                                </Badge>
                             </div>
                             <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingRoom(room); setRoomForm({...room}); setIsRoomDialogOpen(true); }}><Edit3 className="w-4 h-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" disabled={artCount > 0} onClick={() => handleDeleteRoom(room.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </div>
                          <h3 className="font-headline text-3xl italic">{room.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 italic leading-relaxed">{room.description}</p>
                       </div>
                       <div className="mt-8 pt-8 border-t border-black/5">
                          <Button type="button" onClick={() => togglePublishRoom(room)} variant={room.isPublished ? "outline" : "default"} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] w-full">
                             {room.isPublished ? "Verbergen voor Publiek" : "Publiek Zichtbaar Maken"}
                          </Button>
                       </div>
                    </Card>
                  );
                })}
             </div>
          </TabsContent>

          <TabsContent value="monumentaal" className="space-y-8 mt-0">
            <div className="bg-white/50 backdrop-blur-md p-8 rounded-[3rem] border border-white/60 space-y-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-white border-none shadow-sm px-6"><SelectValue placeholder="Selecteer een project..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-none">
                      {projects?.map((p: any) => <SelectItem key={p.id} value={p.id} className="p-4">{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleOpenNewProject} className="h-14 rounded-2xl bg-primary text-white px-8 font-black uppercase tracking-widest text-[10px] shrink-0">
                    <Plus className="w-4 h-4 mr-2" /> Nieuw Project
                  </Button>
                </div>
                <div className="bg-black/5 p-1 rounded-xl flex gap-1">
                  <Button type="button" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-lg"><LayoutGrid className="w-4 h-4" /></Button>
                  <Button type="button" variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-lg"><ListIcon className="w-4 h-4" /></Button>
                </div>
              </div>
              {!selectedProjectId && <div className="py-24 text-center opacity-20 italic"><Building2 className="w-12 h-12 mx-auto mb-4" /><p className="text-xl font-headline">Selecteer een project om de werken te bekijken.</p></div>}
            </div>
            {selectedProjectId && (
              <div className="animate-in fade-in duration-500">
                {filteredArtworks.length === 0 ? (
                  <div className="py-32 text-center border-2 border-dashed rounded-[3rem] opacity-20 italic">Nog geen werken toegewezen aan dit project.</div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredArtworks.map((art: any) => (
                      <div key={art.id} onClick={() => handleEditArtwork(art)} className="cursor-pointer group">
                        <Card className="p-4 rounded-3xl overflow-hidden shadow-md border-2 border-transparent">
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
                      <Card key={art.id} className="p-6 rounded-[2rem] flex items-center gap-8 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent" onClick={() => handleEditArtwork(art)}>
                        <img src={art.image} className="w-40 h-40 object-cover rounded-2xl shadow-sm" alt="" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl mb-1 truncate">{art.title}</h3>
                          <p className="text-xs font-black uppercase tracking-widest opacity-40">{art.year} • {art.medium || 'Geen techniek'}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <Button type="button" onClick={() => setSelectedIds([])} variant="ghost" className="h-8 w-8 rounded-full p-0 text-white hover:bg-white/10"><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-8">
                 <div className="space-y-2">
                    <button type="button" onClick={() => setBulkExpanded(p => ({ ...p, rooms: !p.rooms }))} className="flex items-center justify-between w-full p-2 hover:bg-black/5 rounded-lg">
                       <Label className="text-[10px] font-black uppercase text-accent border-l-4 border-accent pl-3 cursor-pointer">Zaal Toewijzing</Label>
                       <ChevronDown className={cn("w-4 h-4 text-accent transition-transform", !bulkExpanded.rooms && "-rotate-90")} />
                    </button>
                    {bulkExpanded.rooms && (
                      <div className="grid grid-cols-1 gap-2 pt-2 animate-in fade-in duration-300">
                         {rooms?.map((room: any) => {
                           const isActive = isRoomAssignedToSelection(room.id);
                           return (
                             <button type="button" key={room.id} onClick={(e) => { e.stopPropagation(); handleBulkUpdate(isActive ? 'remove_room' : 'add_room', room.id); }} className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all text-left", isActive ? "bg-accent/5 border-accent text-accent" : "bg-white border-black/5 text-black/40")}>
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
                      <div className="space-y-6 pt-2 animate-in fade-in duration-300">
                         {Object.entries(MUSEUM_TAGS).map(([category, tags]) => (
                            <div key={category} className="space-y-3">
                               <p className="text-[8px] font-black uppercase opacity-30 tracking-widest">{category}</p>
                               <div className="flex flex-wrap gap-1.5">
                                  {tags.map(tag => {
                                    const isActive = isTagAssignedToSelection(tag);
                                    return (
                                      <button type="button" key={tag} onClick={(e) => { e.stopPropagation(); handleBulkUpdate(isActive ? 'remove_tag' : 'add_tag', tag); }} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-2", isActive ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40 hover:border-black/20")}>
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
                <DialogTitle className="font-headline text-3xl italic">{editingArtwork ? 'Werk Bewerken' : 'Nieuw Kunstwerk'}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-l-4 border-accent pl-4">
                    <div className="flex items-center gap-3">
                      <Type className="w-4 h-4 text-accent" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Identiteit</h4>
                    </div>
                    <div className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full">
                       <Label className="text-[9px] font-black uppercase opacity-60">Monumentaal</Label>
                       <Checkbox checked={artworkForm.isMonumental} onCheckedChange={(v) => setArtworkForm({...artworkForm, isMonumental: !!v})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {artworkForm.isMonumental && (
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <Label className="text-[9px] font-black uppercase ml-2 text-accent">Koppel aan Project</Label>
                        <Select value={artworkForm.monumentalProjectId} onValueChange={v => setArtworkForm({...artworkForm, monumentalProjectId: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-accent/5 border-2 border-accent/20 px-4 text-accent"><SelectValue placeholder="Selecteer project..." /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-none">
                            {projects?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                          <SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue placeholder="Selecteer techniek..." /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-none">
                            {ART_TECHNIQUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </section>

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
                            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={cn("px-3 py-1 rounded-lg text-[9px] font-bold border transition-all", artworkForm.tags?.includes(tag) ? "bg-accent/10 border-accent text-accent" : "bg-white border-black/5 text-black/40 hover:border-black/20")}>{tag}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                    <FolderInput className="w-4 h-4 text-accent" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Zaal Toewijzing</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {rooms?.map((room: any) => (
                      <button key={room.id} type="button" onClick={() => toggleRoom(room.id)} className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all text-left", artworkForm.roomIds?.includes(room.id) ? "bg-accent/5 border-accent text-accent" : "bg-white border-black/5 text-black/40")}>
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
                <Button type="button" onClick={handleSaveArtwork} disabled={isUploading} className="flex-1 h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest shadow-xl">
                  {isUploading ? <Loader2 className="animate-spin" /> : "Wijzigingen Opslaan"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-lg rounded-[3rem] p-0 overflow-hidden bg-background">
          <DialogHeader className="p-10 border-b">
            <DialogTitle className="font-headline text-3xl italic">{editingRoom ? 'Zaal Bewerken' : 'Nieuwe Zaal'}</DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-6">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Naam</Label><Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Beschrijving</Label><Textarea value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})} className="min-h-[120px] rounded-2xl bg-black/5 border-none p-4" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Volgorde</Label><Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: parseInt(e.target.value)})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Publiek Zichtbaar</Label><Switch checked={roomForm.isPublished} onCheckedChange={v => setRoomForm({...roomForm, isPublished: v})} /></div>
          </div>
          <div className="px-10 pb-10">
            <Button type="button" onClick={handleSaveRoom} disabled={isSavingRoom} className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px]">
              {isSavingRoom ? <Loader2 className="animate-spin" /> : editingRoom ? 'Wijzigingen Opslaan' : 'Zaal Aanmaken'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-md rounded-[3rem] p-0 overflow-hidden bg-background">
          <DialogHeader className="p-10 border-b">
            <DialogTitle className="font-headline text-3xl italic">{editingProject ? 'Project Bewerken' : 'Nieuw Monumentaal Project'}</DialogTitle>
          </DialogHeader>
          <div className="p-10 space-y-6">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Projectnaam</Label><Input value={projectForm.title} onChange={e => setProjectForm({...projectForm, title: e.target.value})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase ml-2 opacity-40">Volgorde</Label><Input type="number" value={projectForm.order} onChange={e => setProjectForm({...projectForm, order: parseInt(e.target.value)})} className="h-12 rounded-xl bg-black/5 border-none px-4" /></div>
          </div>
          <div className="px-10 pb-10">
            <Button type="button" onClick={handleSaveProject} disabled={isSavingProject} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px]">
              {isSavingProject ? <Loader2 className="animate-spin" /> : editingProject ? 'Wijzigingen Opslaan' : 'Project Aanmaken'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
