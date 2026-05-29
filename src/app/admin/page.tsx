
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
  Download,
  Database,
  Github,
  Lock,
  ArrowRight
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { normalizeArtwork, sanitizeArtwork, MUSEUM_TAGS, slugify, sortArtworksByTitle } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedArtworks, setSelectedItems] = useState<string[]>([]);
  
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [artworkForm, setArtworkForm] = useState<any>({
    title: '', displayTitle: '', slug: '', image: '', year: '', medium: '', description: '', tags: '', featured: false, inShop: false
  });
  
  const [roomForm, setRoomForm] = useState({ title: '', description: '', order: 0 });
  const [tempBulkTags, setTempBulkTags] = useState<string[]>([]);
  const [showCustomMedium, setShowCustomMedium] = useState(false);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: dbArtworks, loading: artLoading } = useCollection(artworksQuery);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

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

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-accent/40" />
          </div>
          <h1 className="font-headline text-3xl italic">Archief <span className="text-accent">Beheer</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Wachtwoord" 
              className="h-16 rounded-2xl text-center text-xl tracking-widest bg-black/5 border-none"
            />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px]">
              Ontgrendelen <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  const handleOpenNewArtwork = () => {
    setEditingArtwork(null);
    setSelectedFile(null);
    setShowCustomMedium(false);
    setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', year: '', medium: 'Olieverf', description: '', tags: [], featured: false, inShop: false });
    setIsArtworkDialogOpen(true);
  };

  const handleEditArtwork = (art: any) => {
    setEditingArtwork(art); 
    setSelectedFile(null);
    const isCustom = art.medium && !ART_TECHNIQUES.includes(art.medium);
    setShowCustomMedium(isCustom);
    setArtworkForm({ 
      ...art, 
      tags: Array.isArray(art.tags) ? art.tags : []
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

  const handleCleanupYears = async () => {
    if (!firestore || !dbArtworks || !confirm("Corrigeer alle jaartallen?")) return;
    setIsCleaning(true);
    try {
      for (const art of dbArtworks) {
        const rawYear = String(art.year || "");
        if (rawYear.includes('2026')) {
          const newYear = rawYear.replace(/2026/g, '').replace(/\s+/g, ' ').trim();
          await updateDoc(doc(firestore, 'artworks', art.id), { year: newYear });
        }
      }
      toast({ title: "Gecorrigeerd" });
    } catch (e) { toast({ variant: "destructive", title: "Schoonmaak mislukt" }); }
    finally { setIsCleaning(false); }
  };

  const handleSaveRoom = async () => {
    if (!firestore) return;
    const slug = slugify(roomForm.title);
    const data = { ...roomForm, slug, updatedAt: serverTimestamp() };
    if (editingRoom) {
      await updateDoc(doc(firestore, 'rooms', editingRoom.id), data);
      toast({ title: "Zaal bijgewerkt" });
    } else {
      await addDoc(collection(firestore, 'rooms'), { ...data, createdAt: serverTimestamp(), isPublic: true });
      toast({ title: "Zaal aangemaakt" });
    }
    setIsRoomDialogOpen(false);
  };

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
            <Link href="/admin/activity" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shrink-0">
               <Activity className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Ghost Monitor</span>
            </Link>
            <Link href="/admin/private" className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/5 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shrink-0">
               <Camera className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Privé Archief</span>
            </Link>
            <Link href="/admin/team" className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/5 text-green-600 hover:bg-green-500 hover:text-white transition-all shrink-0">
               <Zap className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Team Hub</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
           <Button variant="ghost" onClick={() => setIsExportDialogOpen(true)} className="h-12 rounded-full text-blue-600 font-black uppercase tracking-widest text-[9px]">
             <ShieldCheck className="w-4 h-4 mr-2" /> Systeem Backup
           </Button>
           <Button onClick={handleOpenNewArtwork} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px] shadow-lg">
             <Plus className="w-4 h-4 mr-2" /> Nieuw Kunstwerk
           </Button>
        </div>
      </header>

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
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-lg px-3 h-10"><LayoutGrid className="w-4 h-4" /></Button>
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-lg px-3 h-10"><ListIcon className="w-4 h-4" /></Button>
                 </div>
               </div>
            </div>

            <div className={cn(viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6" : "space-y-6")}>
              {filteredArtworks.map((art: any) => (
                <div key={art.id} onClick={() => handleEditArtwork(art)} className="cursor-pointer group">
                  <Card className="p-4 rounded-3xl overflow-hidden shadow-md group-hover:shadow-xl transition-all">
                    <img src={art.image} className="aspect-square object-cover rounded-2xl mb-4" alt="" />
                    <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                  </Card>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8 mt-0">
            <div className="grid gap-6">
              {rooms?.map((room: any) => (
                <Card key={room.id} className="p-8 rounded-[2.5rem] bg-white flex justify-between items-center shadow-lg">
                   <div>
                      <h3 className="font-headline text-2xl italic">{room.title}</h3>
                      <p className="text-xs opacity-40 uppercase font-black tracking-widest">Zaal {room.order}</p>
                   </div>
                   <Button variant="ghost" onClick={() => { setEditingRoom(room); setRoomForm({...room}); setIsRoomDialogOpen(true); }} className="rounded-full h-12 w-12"><Edit3 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">{editingArtwork ? 'Bewerken' : 'Nieuw'}</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-6">
             <div className="space-y-2"><Label>Titel</Label><Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="h-14 rounded-2xl bg-black/5" /></div>
             <div className="space-y-2"><Label>Beeld URL</Label><Input value={artworkForm.image} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="h-14 rounded-2xl bg-black/5" /></div>
             <div className="space-y-2"><Label>Beschrijving</Label><Textarea value={artworkForm.description} onChange={e => setArtworkForm({...artworkForm, description: e.target.value})} className="min-h-[140px] rounded-2xl bg-black/5" /></div>
             <Button onClick={handleSaveArtwork} disabled={isUploading} className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase">{isUploading ? 'Laden...' : 'Opslaan'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
