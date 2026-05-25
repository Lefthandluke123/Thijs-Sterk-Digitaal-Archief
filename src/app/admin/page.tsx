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
  setDoc,
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
  Settings,
  Monitor,
  Type,
  Grid,
  Library,
  LayoutTemplate,
  Languages
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
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { translateMuseumText } from '@/ai/flows/translate-flow';

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

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', isSource: true },
  { code: 'en', label: 'Engels' },
  { code: 'de', label: 'Duits' },
  { code: 'fr', label: 'Frans' },
  { code: 'es', label: 'Spaans' },
];

const CONTENT_FIELDS = [
  { id: 'siteTitle', label: 'Website Titel', type: 'input', category: 'Algemeen' },
  { id: 'siteSubtitle', label: 'Website Ondertitel', type: 'input', category: 'Algemeen' },
  { id: 'homeHeroTitle', label: 'Hero Hoofdtitel', type: 'input', category: 'Homepage' },
  { id: 'homeBioTitle', label: 'Biografie Titel', type: 'input', category: 'Homepage' },
  { id: 'homeBio', label: 'Biografie Tekst', type: 'textarea', category: 'Homepage' },
  { id: 'gallery_title', label: 'Zalen Overzicht Titel', type: 'input', category: 'Zalen' },
  { id: 'gallery_select', label: 'Zalen Selectie Instructie', type: 'input', category: 'Zalen' },
  { id: 'curator_title', label: 'Curator Titel', type: 'input', category: 'Uw Zaal' },
  { id: 'curator_subtitle', label: 'Curator Ondertitel', type: 'input', category: 'Uw Zaal' },
  { id: 'shopIntro', label: 'Winkel Introductie', type: 'textarea', category: 'Winkel' },
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
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  // Story Designer State
  const [selectedStoryId, setSelectedStoryId] = useState<string>('beatrijs');
  const [storyNodes, setStoryNodes] = useState<StoryNode[]>([]);
  const [isSavingStory, setIsSavingStory] = useState(false);

  // Translation State
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

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

  const storyRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized || !selectedStoryId) return null;
    return doc(firestore, 'stories', selectedStoryId);
  }, [firestore, isAuthorized, selectedStoryId]);
  const { data: storyData } = useDoc(storyRef);

  useEffect(() => {
    if (settings) {
      setFormData(settings as Record<string, string>);
      const initialBgs: Record<string, string> = {
        backgroundImageUrl: settings.backgroundImageUrl || ''
      };
      const initialOpacities: Record<string, number> = {
        backgroundOpacity: typeof settings.backgroundOpacity === 'number' ? settings.backgroundOpacity : 10
      };
      PAGES.forEach(page => {
        initialBgs[`backgroundImageUrl_${page.id}`] = settings[`backgroundImageUrl_${page.id}`] || '';
        initialOpacities[`backgroundOpacity_${page.id}`] = typeof settings[`backgroundOpacity_${page.id}`] === 'number' ? settings[`backgroundOpacity_${page.id}`] : 10;
      });
      setBgSettings(initialBgs);
      setOpacities(initialOpacities);
    }
  }, [settings]);

  useEffect(() => {
    if (storyData?.nodes) {
      setStoryNodes(storyData.nodes);
    } else {
      setStoryNodes([]);
    }
  }, [storyData]);

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
    const fields = ['bgColor', 'primaryColor', 'accentColor', 'baseFontSize', 'lineHeight', 'headingScale', 'containerWidth', 'radius', 'bodyFont', 'headFont'];
    fields.forEach(f => {
      const val = formData.get(f);
      if (val !== null) updates[f] = f.toLowerCase().includes('scale') ? parseFloat(String(val)) : cleanString(val);
    });
    updates['backgroundImageUrl'] = cleanString(formData.get('backgroundImageUrl'));
    updates['backgroundOpacity'] = parseInt(String(formData.get('backgroundOpacity')), 10);
    PAGES.forEach(page => {
      const bgUrl = formData.get(`backgroundImageUrl_${page.id}`);
      const opacity = formData.get(`backgroundOpacity_${page.id}`);
      if (bgUrl !== null) updates[`backgroundImageUrl_${page.id}`] = cleanString(bgUrl);
      if (opacity !== null) updates[`backgroundOpacity_${page.id}`] = parseInt(String(opacity), 10);
      const bioImagesStr = formData.get(`bioImages_${page.id}`);
      if (bioImagesStr !== null) updates[`${page.id}BioImages`] = cleanArray(String(bioImagesStr).split(','));
    });
    try {
      await updateDoc(settingsRef, updates);
      toast({ title: "Instellingen opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTranslateField = async (fieldId: string) => {
    const sourceText = formData[fieldId];
    if (!sourceText) return toast({ variant: "destructive", title: "Leeg veld" });
    setTranslatingField(fieldId);
    const newTranslations: Record<string, string> = { ...formData };
    try {
      for (const lang of LANGUAGES.filter(l => !l.isSource)) {
        const result = await translateMuseumText({ text: sourceText, targetLanguage: lang.label, context: `Veld: ${fieldId}` });
        newTranslations[`${fieldId}_${lang.code}`] = result.translatedText;
      }
      setFormData(newTranslations);
      toast({ title: "Vertaling voltooid" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Fout", description: error.message });
    } finally {
      setTranslatingField(null);
    }
  };

  const handleSaveStory = async () => {
    if (!storyRef) return;
    setIsSavingStory(true);
    try {
      await setDoc(storyRef, { nodes: storyNodes, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Story layout opgeslagen" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSavingStory(false);
    }
  };

  const openImagePicker = (targetField: string) => {
    setPickerTarget(targetField);
    setIsImagePickerOpen(true);
  };

  const selectImageFromArchive = (imageUrl: string) => {
    if (pickerTarget) setBgSettings(prev => ({ ...prev, [pickerTarget]: imageUrl }));
    setIsImagePickerOpen(false);
    setPickerTarget(null);
  };

  const handleBulkSave = async () => {
    if (!firestore || !selectedArtIds.length) return;
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    const tagsToAdd = cleanArray(bulkForm.addTags.split(','));
    const roomIdsToAdd = cleanArray(bulkForm.addRoomIds);
    for (const id of selectedArtIds) {
      const artRef = doc(firestore, 'artworks', id);
      const updateData: any = { updatedAt: serverTimestamp() };
      if (roomIdsToAdd.length > 0) updateData.roomIds = arrayUnion(...roomIdsToAdd);
      if (tagsToAdd.length > 0) updateData.tags = arrayUnion(...tagsToAdd);
      if (bulkForm.featured !== 'keep') updateData.featured = bulkForm.featured === 'yes';
      if (bulkForm.inShop !== 'keep') updateData.inShop = bulkForm.inShop === 'yes';
      batch.update(artRef, updateData);
    }
    try {
      await batch.commit();
      toast({ title: "Bulk update voltooid" });
      setSelectedArtIds([]);
      setIsBulkEditConfirmOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Batch fout" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRoom = async () => {
    if (!firestore) return;
    const title = cleanString(roomForm.title);
    const slug = cleanString(roomForm.slug);
    if (!title || !slug) {
      toast({ variant: "destructive", title: "Validatiefout" });
      return;
    }
    const data = { ...roomForm, title, slug, description: cleanString(roomForm.description) || "", updatedAt: serverTimestamp() };
    try {
      if (editingRoom) await updateDoc(doc(firestore, 'rooms', editingRoom.id), data);
      else await addDoc(collection(firestore, 'rooms'), { ...data, createdAt: serverTimestamp() });
      setIsRoomDialogOpen(false);
      toast({ title: "Zaal opgeslagen" });
    } catch (e) { toast({ variant: "destructive", title: "Fout" }); }
  };

  const handleSaveArtwork = async () => {
    if (!firestore) return;
    if (!cleanString(artworkForm.title)) {
      toast({ variant: "destructive", title: "Naam verplicht" });
      return;
    }
    const cleanData = sanitizeArtwork({ ...artworkForm, tags: artworkForm.tags.split(',') });
    try {
      if (editingArtwork) await updateDoc(doc(firestore, 'artworks', editingArtwork.id), cleanData);
      else await addDoc(collection(firestore, 'artworks'), { ...cleanData, createdAt: serverTimestamp() });
      setIsArtworkDialogOpen(false);
      toast({ title: "Opgeslagen" });
    } catch (e) { toast({ variant: "destructive", title: "Fout" }); }
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

  const categories = Array.from(new Set(CONTENT_FIELDS.map(f => f.category)));

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-32 px-8">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-6 h-6 text-accent" />
            <div>
              <h1 className="font-headline text-2xl italic">Het Digitale Archief</h1>
            </div>
          </div>
          <div className="h-8 w-px bg-black/5 mx-2" />
          <Button onClick={() => setActiveTab('story')} variant="outline" className="rounded-full bg-accent text-white hover:bg-accent/90 border-none shadow-lg px-6">
             <LayoutTemplate className="w-4 h-4 mr-2" /> Story Designer (DTP)
          </Button>
        </div>
        <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-accent transition-colors">
           <ArrowLeft className="w-3 h-3" /> Naar Website
        </Link>
      </header>

      <div className="max-w-[1600px] mx-auto space-y-12 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14 border shadow-sm flex flex-nowrap overflow-x-auto no-scrollbar">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Palette className="w-4 h-4 mr-2" /> Collectie
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="story" className="rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest shrink-0">
              <LayoutTemplate className="w-4 h-4 mr-2" /> Story Designer
            </TabsTrigger>
            <TabsTrigger value="translations" className="rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Languages className="w-4 h-4 mr-2" /> Teksten
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Settings className="w-4 h-4 mr-2" /> Stramien
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border sticky top-24 z-30 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                 <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <Input placeholder="Zoek..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-full bg-white border-none shadow-inner" />
                 </div>
                 {selectedArtIds.length > 0 && <Button size="sm" onClick={() => setIsBulkEditConfirmOpen(true)} className="rounded-full bg-accent text-white"><Settings2 className="w-4 h-4 mr-2" /> Bulk ({selectedArtIds.length})</Button>}
              </div>
              <Button onClick={() => { setEditingArtwork(null); setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', roomIds: [], year: '', medium: '', description: '', featured: false, inShop: false, tags: '' }); setIsArtworkDialogOpen(true); }} className="rounded-full px-8 h-12 bg-primary"><Plus className="w-4 h-4 mr-2" /> Nieuw Werk</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
               {filteredAndSortedArtworks.map((art: any) => (
                 <Card key={art.id} className={cn("p-4 rounded-2xl border-none shadow-md group relative", selectedArtIds.includes(art.id) && "ring-2 ring-accent")}>
                    <button onClick={() => setSelectedArtIds(p => p.includes(art.id) ? p.filter(i => i !== art.id) : [...p, art.id])} className={cn("absolute top-4 left-4 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", selectedArtIds.includes(art.id) ? "bg-accent border-accent text-white" : "bg-white/80 border-black/10 opacity-0 group-hover:opacity-100")}><CheckSquare className="w-4 h-4" /></button>
                    <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center">
                      {art.image ? <img src={art.image} className="w-full h-full object-cover" alt={art.title} /> : <ImageIcon className="w-8 h-8 opacity-10" />}
                    </div>
                    <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <Button size="sm" onClick={() => { setEditingArtwork(art); setArtworkForm({ ...art, tags: (art.tags || []).join(', ') }); setIsArtworkDialogOpen(true); }} className="rounded-full bg-white text-black"><Edit3 className="w-4 h-4" /></Button>
                       <Button size="sm" variant="destructive" onClick={() => { if(confirm("Wissen?")) deleteDoc(doc(firestore, 'artworks', art.id)); }} className="rounded-full"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                 </Card>
               ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-8">
            <div className="flex justify-between items-center"><h2 className="font-headline text-3xl italic opacity-40">Museum Zalen</h2><Button onClick={() => { setEditingRoom(null); setRoomForm({ title: '', slug: '', description: '', order: (rooms?.length || 0) + 1, isPublic: true }); setIsRoomDialogOpen(true); }} className="rounded-full bg-accent text-white"><Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal</Button></div>
            <div className="grid md:grid-cols-3 gap-6">{rooms?.map((room: any) => (<Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white space-y-4"><div><h3 className="font-headline text-2xl italic">{room.title}</h3><p className="text-[10px] font-black uppercase opacity-30">Slug: {room.slug}</p></div><div className="flex gap-2"><Button onClick={() => { setEditingRoom(room); setRoomForm(room); setIsRoomDialogOpen(true); }} variant="outline" className="flex-1 rounded-xl text-[10px] font-black">Bewerken</Button><Button onClick={() => { if(confirm("Zaal verwijderen?")) deleteDoc(doc(firestore, 'rooms', room.id)); }} variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></div></Card>))}</div>
          </TabsContent>

          <TabsContent value="story" className="space-y-12">
             <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-xl border">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent"><LayoutTemplate className="w-8 h-8" /></div>
                      <div><h3 className="font-headline text-2xl italic leading-tight">Story Designer</h3><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Samenstellen van biografie-pagina's (Drag & Drop)</p></div>
                   </div>
                   <div className="flex items-center gap-4">
                      <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
                        <SelectTrigger className="w-[240px] h-14 rounded-2xl bg-black/5 border-none text-sm font-bold uppercase"><SelectValue placeholder="Pagina..." /></SelectTrigger>
                        <SelectContent>{PAGES.filter(p => p.id.includes('beatrijs') || p.id.includes('hanneke') || p.id.includes('peter') || p.id.includes('leo')).map(p => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                      </Select>
                      <Button onClick={handleSaveStory} disabled={isSavingStory} className="h-14 px-8 rounded-2xl bg-primary shadow-lg">{isSavingStory ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Opslaan</Button>
                   </div>
                </div>
                <StoryEditor nodes={storyNodes} onChange={(data) => setStoryNodes(data.nodes)} />
             </div>
          </TabsContent>

          <TabsContent value="translations" className="space-y-12">
             {categories.map(cat => (
               <section key={cat} className="space-y-8">
                 <h2 className="font-headline text-3xl italic opacity-40 border-l-4 border-accent pl-6">{cat}</h2>
                 <div className="grid gap-8">
                   {CONTENT_FIELDS.filter(f => f.category === cat).map(field => (
                     <Card key={field.id} className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white space-y-6">
                       <div className="flex justify-between items-start"><Label className="text-[11px] font-black uppercase text-accent/40">{field.label}</Label><Button size="sm" variant="secondary" onClick={() => handleTranslateField(field.id)} disabled={translatingField === field.id} className="rounded-full px-6">{translatingField === field.id ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} AI Vertaal</Button></div>
                       <div className="space-y-4">
                         <div className="space-y-2"><span className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase">Bron</span>{field.type === 'textarea' ? <Textarea value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} className="bg-black/5 min-h-[140px] rounded-2xl" /> : <Input value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} className="bg-black/5 h-14 rounded-xl" />}</div>
                         <div className="grid md:grid-cols-4 gap-6">{LANGUAGES.filter(l => !l.isSource).map(lang => (<div key={lang.code} className="space-y-2"><span className="text-[9px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full uppercase">{lang.code}</span>{field.type === 'textarea' ? <Textarea value={formData[`${field.id}_${lang.code}`] || ''} onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })} className="border-2 border-black/5 min-h-[100px] rounded-2xl text-xs" /> : <Input value={formData[`${field.id}_${lang.code}`] || ''} onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })} className="border-2 border-black/5 h-12 rounded-xl text-xs" />}</div>))}</div>
                       </div>
                     </Card>
                   ))}
                 </div>
               </section>
             ))}
             <Button onClick={async () => { setIsSavingSettings(true); await updateDoc(settingsRef!, formData); setIsSavingSettings(false); toast({title:"Teksten opgeslagen"}); }} className="w-full h-20 rounded-[2.5rem] bg-primary text-xl font-black uppercase tracking-widest shadow-2xl">Teksten Opslaan</Button>
          </TabsContent>

          <TabsContent value="settings">
             <Card className="p-12 rounded-[3rem] bg-white border-none shadow-xl">
                <form onSubmit={handleSaveSettings} className="space-y-12">
                   <div className="grid md:grid-cols-2 gap-12"><div className="space-y-8"><div className="flex items-center gap-3 opacity-40"><Type className="w-5 h-5" /><h3 className="text-xs font-black uppercase">Typografie</h3></div><div className="grid gap-6"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Body Font</Label><Select name="bodyFont" defaultValue={settings?.bodyFont || 'sans'}><SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sans">Modern</SelectItem><SelectItem value="serif">Klassiek</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Headline Font</Label><Select name="headFont" defaultValue={settings?.headFont || 'serif'}><SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sans">Modern</SelectItem><SelectItem value="serif">Klassiek</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Base Size (px)</Label><Input name="baseFontSize" defaultValue={settings?.baseFontSize || '16px'} className="h-12 rounded-xl bg-black/5 border-none" /></div></div></div><div className="space-y-8"><div className="flex items-center gap-3 opacity-40"><Palette className="w-5 h-5" /><h3 className="text-xs font-black uppercase">Kleuren & Raster</h3></div><div className="grid gap-6"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Accent (HSL)</Label><Input name="accentColor" defaultValue={settings?.accentColor || '142 30% 25%'} className="h-12 rounded-xl bg-black/5 border-none" /></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">BG (HSL)</Label><Input name="bgColor" defaultValue={settings?.bgColor || '40 15% 97%'} className="h-12 rounded-xl bg-black/5 border-none" /></div></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Radius</Label><Input name="radius" defaultValue={settings?.radius || '2rem'} className="h-12 rounded-xl bg-black/5 border-none" /></div></div></div></div>
                   <div className="space-y-8 pt-12 border-t border-black/5"><div className="flex items-center gap-3 opacity-40"><Monitor className="w-5 h-5" /><h3 className="text-xs font-black uppercase">Achtergronden</h3></div><Accordion type="single" collapsible className="w-full"><AccordionItem value="global-bg" className="border-b border-black/5"><AccordionTrigger className="font-bold text-sm uppercase">Globale Achtergrond</AccordionTrigger><AccordionContent className="space-y-8 pt-4 pb-8"><div className="grid md:grid-cols-2 gap-8"><div className="space-y-4"><Label className="text-[10px] uppercase font-black opacity-40">URL</Label><div className="flex gap-2"><Input name="backgroundImageUrl" value={bgSettings.backgroundImageUrl || ''} onChange={e => setBgSettings(p => ({...p, backgroundImageUrl: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" /><Button type="button" onClick={() => openImagePicker('backgroundImageUrl')} size="icon" variant="outline" className="h-12 w-12 rounded-xl"><Library className="w-5 h-5" /></Button></div></div><div className="space-y-4"><div className="flex justify-between items-center"><Label className="text-[10px] uppercase font-black opacity-40">Opacity (%)</Label><span className="text-xs font-bold">{opacities.backgroundOpacity ?? 10}%</span></div><Slider value={[opacities.backgroundOpacity ?? 10]} onValueChange={(v) => setOpacities(p => ({...p, backgroundOpacity: v[0]}))} max={100} step={1} /><input type="hidden" name="backgroundOpacity" value={opacities.backgroundOpacity ?? 10} /></div></div></AccordionContent></AccordionItem>{PAGES.map(page => (<AccordionItem key={page.id} value={page.id} className="border-b border-black/5"><AccordionTrigger className="font-bold text-sm uppercase">{page.label} Override</AccordionTrigger><AccordionContent className="space-y-8 pt-4 pb-8"><div className="grid md:grid-cols-2 gap-8"><div className="space-y-4"><Label className="text-[10px] uppercase font-black opacity-40">URL</Label><div className="flex gap-2"><Input name={`backgroundImageUrl_${page.id}`} value={bgSettings[`backgroundImageUrl_${page.id}`] || ''} onChange={e => setBgSettings(p => ({...p, [`backgroundImageUrl_${page.id}`]: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" /><Button type="button" onClick={() => openImagePicker(`backgroundImageUrl_${page.id}`)} size="icon" variant="outline" className="h-12 w-12 rounded-xl"><Library className="w-5 h-5" /></Button></div></div><div className="space-y-4"><div className="flex justify-between items-center"><Label className="text-[10px] uppercase font-black opacity-40">Opacity (%)</Label><span className="text-xs font-bold">{opacities[`backgroundOpacity_${page.id}`] ?? 10}%</span></div><Slider value={[opacities[`backgroundOpacity_${page.id}`] ?? 10]} onValueChange={(v) => setOpacities(p => ({...p, [`backgroundOpacity_${page.id}`]: v[0]}))} max={100} step={1} /><input type="hidden" name={`backgroundOpacity_${page.id}`} value={opacities[`backgroundOpacity_${page.id}`] ?? 10} /></div></div></AccordionContent></AccordionItem>))}</Accordion></div>
                   <Button type="submit" disabled={isSavingSettings} className="w-full h-20 rounded-[2.5rem] bg-primary text-xl font-black uppercase shadow-2xl">{isSavingSettings ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5 mr-3" />} Stramien Opslaan</Button>
                </form>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Shared Dialogs from earlier versions */}
      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}><DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-10"><DialogHeader><DialogTitle className="font-headline text-3xl italic">Kies uit Archief</DialogTitle></DialogHeader><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 py-8">{filteredAndSortedArtworks.map((art: any) => (<button key={art.id} onClick={() => selectImageFromArchive(art.image)} className="group relative aspect-square rounded-2xl overflow-hidden bg-black/5 border hover:ring-2 ring-accent transition-all">{art.image ? <img src={art.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 mx-auto opacity-10" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-2"><p className="text-[8px] text-white font-bold truncate w-full">{art.displayTitle || art.title}</p></div>}</button>))}</div></DialogContent></Dialog>
      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8"><DialogHeader><DialogTitle className="font-headline text-2xl italic">{editingArtwork ? 'Bewerken' : 'Nieuw'}</DialogTitle></DialogHeader><div className="grid gap-6 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Titel</Label><Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="rounded-xl h-12" /></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Afbeelding URL</Label><Input value={artworkForm.image || ''} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="rounded-xl h-12" /></div></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Zalen</Label><div className="flex flex-wrap gap-2 p-3 bg-black/5 rounded-xl">{rooms?.map((r: any) => (<label key={r.id} className={cn("px-4 py-1.5 rounded-full border text-[10px] font-black uppercase cursor-pointer transition-all", artworkForm.roomIds?.includes(r.id) ? "bg-accent text-white border-accent" : "bg-white border-black/5 opacity-50")}><input type="checkbox" className="hidden" checked={artworkForm.roomIds?.includes(r.id)} onChange={e => setArtworkForm(p => ({ ...p, roomIds: e.target.checked ? [...(p.roomIds || []), r.id] : (p.roomIds || []).filter(id => id !== r.id) }))} />{r.title}</label>))}</div></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Tags</Label><Input value={artworkForm.tags} onChange={e => setArtworkForm({...artworkForm, tags: e.target.value})} className="rounded-xl h-12" /></div></div><DialogFooter><Button onClick={handleSaveArtwork} className="w-full h-14 rounded-2xl bg-primary">Opslaan</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}><DialogContent className="max-w-xl rounded-[2rem] p-8"><DialogHeader><DialogTitle className="font-headline text-2xl italic">Zaal</DialogTitle></DialogHeader><div className="grid gap-6 py-4"><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Titel</Label><Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="rounded-xl h-12" /></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Slug (URL)</Label><Input value={roomForm.slug} onChange={e => setRoomForm({...roomForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="rounded-xl h-12" /></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Volgorde</Label><Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: parseInt(e.target.value, 10)})} className="rounded-xl h-12" /></div></div><DialogFooter><Button onClick={handleSaveRoom} className="w-full h-14 rounded-2xl bg-primary">Zaal Opslaan</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
