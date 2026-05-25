"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
  arrayRemove,
  orderBy
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
  Edit3,
  Sparkles,
  Save,
  CheckSquare,
  X,
  Star,
  Search,
  Settings2,
  Hash,
  Image as ImageIcon,
  Sliders,
  Settings,
  Monitor,
  Type,
  Maximize,
  Grid,
  Library
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
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle, cleanString, cleanArray, sanitizeArtwork, normalizeArtwork } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PAGES = [
  { id: 'home', label: 'Homepage' },
  { id: 'gallery', label: 'Zalen Overzicht' },
  { id: 'curator', label: 'Samenstellen' },
  { id: 'shop', label: 'Winkel' },
  { id: 'beatrijs', label: 'Beatrijs Sterk' },
  { id: 'hanneke', label: 'Hanneke Sterk' },
  { id: 'peter-bes', label: 'Peter Bes' },
  { id: 'leo-duppen', label: 'Leo Duppen' },
];

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('artworks');
  const [searchTerm, setSearchTerm] = useState('');

  // Settings UI State
  const [bgSettings, setBgSettings] = useState<Record<string, string>>({});
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

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

  // Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'artworks');
  }, [firestore, isAuthorized]);
  const { data: rawArtworks } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, isAuthorized]);
  const { data: rooms } = useCollection(roomsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  const { data: settings } = useDoc(settingsRef);

  useEffect(() => {
    if (settings) {
      const initialBgs: Record<string, string> = {
        backgroundImageUrl: settings.backgroundImageUrl || ''
      };
      PAGES.forEach(page => {
        initialBgs[`backgroundImageUrl_${page.id}`] = settings[`backgroundImageUrl_${page.id}`] || '';
      });
      setBgSettings(initialBgs);
    }
  }, [settings]);

  const filteredAndSortedArtworks = useMemo(() => {
    if (!rawArtworks) return [];
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

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settingsRef) return;
    setIsSavingSettings(true);
    
    const formData = new FormData(e.currentTarget);
    const updates: any = { updatedAt: serverTimestamp() };

    const fields = [
      'backgroundImageUrl', 'backgroundOpacity', 'bgColor', 'primaryColor', 'accentColor',
      'baseFontSize', 'lineHeight', 'headingScale', 'containerWidth', 'radius', 'bodyFont', 'headFont'
    ];
    
    fields.forEach(f => {
      const val = formData.get(f);
      if (val !== null) {
        if (f.toLowerCase().includes('opacity') || f.toLowerCase().includes('scale')) {
          updates[f] = parseFloat(String(val));
        } else {
          updates[f] = cleanString(val);
        }
      }
    });

    // Overwrite with state-managed background URLs
    Object.entries(bgSettings).forEach(([key, val]) => {
      updates[key] = cleanString(val);
    });

    PAGES.forEach(page => {
      const opacity = formData.get(`backgroundOpacity_${page.id}`);
      if (opacity !== null) updates[`backgroundOpacity_${page.id}`] = parseInt(opacity as string, 10);
      
      const bioImagesStr = formData.get(`bioImages_${page.id}`);
      if (bioImagesStr !== null) {
        updates[`${page.id}BioImages`] = cleanArray(String(bioImagesStr).split(','));
      }
    });

    try {
      await updateDoc(settingsRef, updates);
      toast({ title: "Stramien & Visuele instellingen opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon instellingen niet opslaan." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openImagePicker = (targetField: string) => {
    setPickerTarget(targetField);
    setIsImagePickerOpen(true);
  };

  const selectImageFromArchive = (imageUrl: string) => {
    if (pickerTarget) {
      setBgSettings(prev => ({ ...prev, [pickerTarget]: imageUrl }));
    }
    setIsImagePickerOpen(false);
    setPickerTarget(null);
  };

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
    const data = { ...roomForm, title, slug, description: cleanString(roomForm.description) || "", updatedAt: serverTimestamp() };
    try {
      if (editingRoom) {
        await updateDoc(doc(firestore, 'rooms', editingRoom.id), data);
      } else {
        await addDoc(collection(firestore, 'rooms'), { ...data, createdAt: serverTimestamp() });
      }
      setIsRoomDialogOpen(false);
      toast({ title: "Zaal opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout" });
    }
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;
    if (!cleanString(artworkForm.title)) {
      toast({ variant: "destructive", title: "Naam verplicht" });
      return;
    }
    const cleanData = sanitizeArtwork({ ...artworkForm, tags: artworkForm.tags.split(',') });
    try {
      if (editingArtwork) {
        await updateDoc(doc(firestore, 'artworks', editingArtwork.id), cleanData);
      } else {
        await addDoc(collection(firestore, 'artworks'), { ...cleanData, createdAt: serverTimestamp() });
      }
      setIsArtworkDialogOpen(false);
      toast({ title: "Opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout" });
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
          <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14 border shadow-sm">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Palette className="w-4 h-4 mr-2" /> Collectie ({filteredAndSortedArtworks.length})
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="tags" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Hash className="w-4 h-4 mr-2" /> Tags
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Settings className="w-4 h-4 mr-2" /> Stramien
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
                    <p className="text-[10px] font-bold text-accent">Volgorde: {room.order}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingRoom(room); setRoomForm(room); setIsRoomDialogOpen(true); }} variant="outline" className="flex-1 rounded-xl text-[10px] font-black">Bewerken</Button>
                    <Button onClick={() => { if(confirm("Zaal verwijderen?")) deleteDoc(doc(firestore, 'rooms', room.id)); }} variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

          <TabsContent value="settings">
             <div className="max-w-5xl mx-auto space-y-12">
               <Card className="p-12 rounded-[3rem] bg-white border-none shadow-xl">
                  <form onSubmit={handleSaveSettings} className="space-y-12">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <Grid className="w-6 h-6 text-accent" />
                           <h2 className="font-headline text-3xl italic">Museum Stramien</h2>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                           Beheer hier de kern van uw visuele identiteit: typografie, kleuren en globale layout-regels.
                        </p>
                     </div>

                     <div className="grid md:grid-cols-2 gap-12 pt-8 border-t border-black/5">
                        {/* Typography Section */}
                        <div className="space-y-8">
                           <div className="flex items-center gap-3 opacity-40">
                              <Type className="w-5 h-5" />
                              <h3 className="text-xs font-black uppercase tracking-widest">Typografie & DTP</h3>
                           </div>
                           
                           <div className="grid gap-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black opacity-40">Body Lettertype</Label>
                                    <Select name="bodyFont" defaultValue={settings?.bodyFont || 'sans'}>
                                       <SelectTrigger className="h-12 rounded-xl bg-black/5 border-none">
                                          <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent>
                                          <SelectItem value="sans">Modern (Sans)</SelectItem>
                                          <SelectItem value="serif">Klassiek (Serif)</SelectItem>
                                       </SelectContent>
                                    </Select>
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black opacity-40">Koptekst Lettertype</Label>
                                    <Select name="headFont" defaultValue={settings?.headFont || 'serif'}>
                                       <SelectTrigger className="h-12 rounded-xl bg-black/5 border-none">
                                          <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent>
                                          <SelectItem value="sans">Modern (Sans)</SelectItem>
                                          <SelectItem value="serif">Klassiek (Serif)</SelectItem>
                                       </SelectContent>
                                    </Select>
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase font-black opacity-40">Basis Lettergrootte (px)</Label>
                                 <Input name="baseFontSize" defaultValue={settings?.baseFontSize || '16px'} className="h-12 rounded-xl bg-black/5 border-none" />
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase font-black opacity-40">Regelafstand (Line Height)</Label>
                                 <Input name="lineHeight" defaultValue={settings?.lineHeight || '1.7'} className="h-12 rounded-xl bg-black/5 border-none" />
                              </div>
                           </div>
                        </div>

                        {/* Colors & Layout Section */}
                        <div className="space-y-8">
                           <div className="flex items-center gap-3 opacity-40">
                              <Palette className="w-5 h-5" />
                              <h3 className="text-xs font-black uppercase tracking-widest">Kleuren & Raster</h3>
                           </div>

                           <div className="grid gap-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black opacity-40">Accent Kleur (HSL)</Label>
                                    <Input name="accentColor" defaultValue={settings?.accentColor || '142 30% 25%'} placeholder="142 30% 25%" className="h-12 rounded-xl bg-black/5 border-none" />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black opacity-40">Achtergrond (HSL)</Label>
                                    <Input name="bgColor" defaultValue={settings?.bgColor || '40 15% 97%'} placeholder="40 15% 97%" className="h-12 rounded-xl bg-black/5 border-none" />
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase font-black opacity-40">Container Breedte (px/%)</Label>
                                 <Input name="containerWidth" defaultValue={settings?.containerWidth || '1280px'} className="h-12 rounded-xl bg-black/5 border-none" />
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-[10px] uppercase font-black opacity-40">Afronding Radius (rem)</Label>
                                 <Input name="radius" defaultValue={settings?.radius || '2rem'} className="h-12 rounded-xl bg-black/5 border-none" />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8 pt-12 border-t border-black/5">
                        <div className="flex items-center gap-3 opacity-40">
                           <Monitor className="w-5 h-5" />
                           <h3 className="text-xs font-black uppercase tracking-widest">Pagina Achtergronden</h3>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                           <AccordionItem value="global-bg" className="border-b border-black/5">
                              <AccordionTrigger className="font-bold text-sm uppercase tracking-widest hover:no-underline py-6">
                                 Globale Achtergrondfoto
                              </AccordionTrigger>
                              <AccordionContent className="space-y-8 pt-4 pb-8">
                                 <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                       <Label className="text-[10px] uppercase font-black opacity-40">Afbeelding URL</Label>
                                       <div className="flex gap-2">
                                          <Input 
                                            value={bgSettings.backgroundImageUrl || ''} 
                                            onChange={e => setBgSettings(p => ({...p, backgroundImageUrl: e.target.value}))}
                                            placeholder="https://..." 
                                            className="h-12 rounded-xl bg-black/5 border-none flex-1" 
                                          />
                                          <Button type="button" onClick={() => openImagePicker('backgroundImageUrl')} size="icon" variant="outline" className="h-12 w-12 rounded-xl border-accent/20 text-accent">
                                             <Library className="w-5 h-5" />
                                          </Button>
                                       </div>
                                    </div>
                                    <div className="space-y-4">
                                       <div className="flex justify-between items-center">
                                          <Label className="text-[10px] uppercase font-black opacity-40">Opacity (%)</Label>
                                          <span className="text-xs font-bold text-accent">{settings?.backgroundOpacity || 0}%</span>
                                       </div>
                                       <Slider name="backgroundOpacity" defaultValue={[settings?.backgroundOpacity || 0]} max={100} step={1} />
                                    </div>
                                 </div>
                              </AccordionContent>
                           </AccordionItem>

                           {PAGES.map(page => (
                              <AccordionItem key={page.id} value={page.id} className="border-b border-black/5">
                                 <AccordionTrigger className="font-bold text-sm uppercase tracking-widest hover:no-underline py-6">
                                    {page.label} Overrides
                                 </AccordionTrigger>
                                 <AccordionContent className="space-y-8 pt-4 pb-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                       <div className="space-y-6">
                                          <div className="space-y-4">
                                             <Label className="text-[10px] uppercase font-black opacity-40">Specifieke Achtergrond URL</Label>
                                             <div className="flex gap-2">
                                                <Input 
                                                  value={bgSettings[`backgroundImageUrl_${page.id}`] || ''} 
                                                  onChange={e => setBgSettings(p => ({...p, [`backgroundImageUrl_${page.id}`]: e.target.value}))}
                                                  placeholder="Laat leeg voor globaal..." 
                                                  className="h-12 rounded-xl bg-black/5 border-none flex-1" 
                                                />
                                                <Button type="button" onClick={() => openImagePicker(`backgroundImageUrl_${page.id}`)} size="icon" variant="outline" className="h-12 w-12 rounded-xl border-accent/20 text-accent">
                                                   <Library className="w-5 h-5" />
                                                </Button>
                                             </div>
                                          </div>
                                          <div className="space-y-4">
                                             <div className="flex justify-between items-center">
                                                <Label className="text-[10px] uppercase font-black opacity-40">Opacity (%)</Label>
                                                <span className="text-xs font-bold text-accent">{settings?.[`backgroundOpacity_${page.id}`] ?? 10}%</span>
                                             </div>
                                             <Slider name={`backgroundOpacity_${page.id}`} defaultValue={[settings?.[`backgroundOpacity_${page.id}`] ?? 10]} max={100} step={1} />
                                          </div>
                                       </div>
                                       
                                       {page.id.includes('beatrijs') || page.id.includes('hanneke') || page.id.includes('peter') || page.id.includes('leo') ? (
                                          <div className="space-y-4">
                                             <div className="flex items-center gap-2">
                                                <ImageIcon className="w-3.5 h-3.5 opacity-40" />
                                                <Label className="text-[10px] uppercase font-black opacity-40">Foto-vakken (URL's gescheiden door komma)</Label>
                                             </div>
                                             <Textarea name={`bioImages_${page.id}`} defaultValue={(settings?.[`${page.id}BioImages`] || []).join(', ')} placeholder="URL 1, URL 2..." className="min-h-[120px] rounded-xl bg-black/5 border-none resize-none text-xs" />
                                             <p className="text-[9px] text-muted-foreground italic">Deze foto's verschijnen in vakken naast de tekst op de pagina.</p>
                                          </div>
                                       ) : null}
                                    </div>
                                 </AccordionContent>
                              </AccordionItem>
                           ))}
                        </Accordion>
                     </div>

                     <Button type="submit" disabled={isSavingSettings} className="w-full h-20 rounded-[2.5rem] bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">
                        {isSavingSettings ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
                        Stramien & Visuele Regels Opslaan
                     </Button>
                  </form>
               </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Picker Dialog */}
      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Kies uit Archief</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-black opacity-40">Selecteer een kunstwerk als achtergrond</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 py-8">
             {filteredAndSortedArtworks.map((art: any) => (
               <button 
                key={art.id} 
                onClick={() => selectImageFromArchive(art.image)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-black/5 border hover:ring-2 ring-accent transition-all"
               >
                 {art.image ? (
                   <img src={art.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={art.title} />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-6 h-6" /></div>
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-2 transition-opacity">
                    <p className="text-[8px] text-white font-bold truncate w-full">{art.displayTitle || art.title}</p>
                 </div>
               </button>
             ))}
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40">Volgorde (Nummer)</Label>
              <Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: parseInt(e.target.value, 10)})} className="rounded-xl h-12" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveRoom} className="w-full h-14 rounded-2xl bg-primary">Zaal Opslaan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
