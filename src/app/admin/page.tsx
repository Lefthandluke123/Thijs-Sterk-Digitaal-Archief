"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Palette,
  Plus,
  LayoutDashboard,
  Layers,
  Edit3,
  Sparkles,
  Save,
  CheckSquare,
  Search,
  ImageIcon,
  Settings,
  Monitor,
  Type,
  Library,
  LayoutTemplate,
  Languages,
  RotateCcw,
  X,
  CheckCircle,
  MinusCircle
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
import { cn } from '@/lib/utils';
import { sortArtworksByTitle, sanitizeArtwork, normalizeArtwork } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { translateMuseumText } from '@/ai/flows/translate-flow';

const PAGES = [
  { id: 'home', label: 'Homepage' },
  { id: 'gallery', label: 'Alle Schilderijen' },
  { id: 'curator', label: 'Curator (Zelf Samenstellen)' },
  { id: 'shop', label: 'Museumwinkel' },
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
  { id: 'homeHeroBadge', label: 'Hero Badge (boven titel)', type: 'input', category: 'Homepage' },
  { id: 'homeHeroTitle', label: 'Hero Hoofdtitel', type: 'input', category: 'Homepage' },
  { id: 'homeHeroSubtitle', label: 'Hero Ondertitel', type: 'textarea', category: 'Homepage' },
  { id: 'homeIntroBadge', label: 'Introductie Badge (boven sectie)', type: 'input', category: 'Homepage' },
  { id: 'homeIntroTitle', label: 'Introductie Titel', type: 'input', category: 'Homepage' },
  { id: 'homeIntroSubtitle', label: 'Introductie Ondertitel', type: 'input', category: 'Homepage' },
  { id: 'homeRoomsBadge', label: 'Zalen Badge (boven sectie)', type: 'input', category: 'Homepage' },
  { id: 'homeRoomsTitle', label: 'Zalen Sectie Titel', type: 'input', category: 'Homepage' },
  { id: 'homeRoomsSubtitle', label: 'Zalen Sectie Ondertitel', type: 'input', category: 'Homepage' },
  { id: 'homeBioBadge', label: 'Biografie Badge (boven sectie)', type: 'input', category: 'Homepage' },
  { id: 'homeBioTitle', label: 'Biografie Titel', type: 'input', category: 'Homepage' },
  { id: 'homeBio', label: 'Biografie Tekst', type: 'textarea', category: 'Homepage' },
  { id: 'homePortfolioTitle', label: 'Portfolio Sectie Titel', type: 'input', category: 'Homepage' },
  { id: 'gallery_title', label: 'Zalen Overzicht Titel', type: 'input', category: 'Zalen' },
  { id: 'gallery_select', label: 'Zalen Instructie', type: 'input', category: 'Zalen' },
  { id: 'curator_title', label: 'Curator Titel', type: 'input', category: 'Curator' },
  { id: 'curator_subtitle', label: 'Curator Ondertitel', type: 'input', category: 'Curator' },
  { id: 'shopIntro', label: 'Winkel Introductie', type: 'textarea', category: 'Winkel' },
  { id: 'contactTitle', label: 'Contact Titel', type: 'input', category: 'Contact' },
  { id: 'contactIntro', label: 'Contact Introductie', type: 'textarea', category: 'Contact' },
  { id: 'contactQuote', label: 'Contact Quote', type: 'textarea', category: 'Contact' },
];

const AutonomousSlider = ({ label, field, value, onChange, min = 0, max = 100, step = 1, unit = "%" }: any) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-[10px] uppercase font-black opacity-40">{label}</Label>
        <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
          {value}{unit}
        </span>
      </div>
      <input 
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? 0}
        onChange={(e) => {
          const val = Number(e.target.value);
          onChange(field, val);
        }}
        className="w-full h-1.5 bg-black/5 rounded-full appearance-none cursor-pointer accent-accent"
      />
    </div>
  );
};

const BackgroundEditorSection = ({ pageId, label, state, onChange, onPick }: any) => {
  const isGlobal = pageId === 'global';
  const prefix = isGlobal ? '' : `_${pageId}`;
  const urlField = `backgroundImageUrl${prefix}`;
  const opacityField = `backgroundOpacity${prefix}`;
  const blurField = `backgroundBlur${prefix}`;
  const scaleField = `backgroundScale${prefix}`;
  const brightnessField = `backgroundBrightness${prefix}`;

  return (
    <AccordionItem value={pageId} className="border-b border-black/5">
      <AccordionTrigger className="font-bold text-sm uppercase">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 opacity-30" />
          {label}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-8 pt-6 pb-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-black opacity-40">Afbeelding Kiezen</Label>
              <div className="flex gap-2">
                <Input 
                  value={state[urlField] || ''} 
                  onChange={e => onChange(urlField, e.target.value)} 
                  className="h-12 rounded-xl bg-black/5 border-none text-xs" 
                  placeholder="URL of kies uit archief..."
                />
                <button type="button" onClick={() => onPick(urlField)} className="h-12 w-12 rounded-xl border border-black/10 flex items-center justify-center bg-white hover:bg-black/5 transition-colors"><Library className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <AutonomousSlider label="Doorzichtigheid" field={opacityField} value={state[opacityField] ?? 10} onChange={onChange} />
              <AutonomousSlider label="Vervaging" field={blurField} value={state[blurField] ?? 0} max={40} unit="px" onChange={onChange} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <AutonomousSlider label="Zoom / Schaal" field={scaleField} value={state[scaleField] ?? 100} min={100} max={150} unit="%" onChange={onChange} />
              <AutonomousSlider label="Helderheid" field={brightnessField} value={state[brightnessField] ?? 100} min={0} max={200} unit="%" onChange={onChange} />
            </div>

            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                onChange(urlField, '');
                onChange(opacityField, 10);
                onChange(blurField, 0);
                onChange(scaleField, 100);
                onChange(brightnessField, 100);
              }}
              className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 p-0 h-auto"
            >
              <RotateCcw className="w-3 h-3 mr-2" /> Reset deze pagina
            </Button>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] uppercase font-black opacity-40">Lokaal Preview Paneel</Label>
            <div className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-black/5 group">
              <div 
                className="absolute inset-0 transition-all duration-200 pointer-events-none"
                style={{ 
                  backgroundImage: state[urlField] ? `url("${state[urlField]}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: (state[opacityField] ?? 10) / 100,
                  filter: `blur(${state[blurField] ?? 0}px) brightness(${state[brightnessField] ?? 100}%)`,
                  transform: `scale(${(state[scaleField] ?? 100) / 100})`,
                  backgroundColor: "transparent"
                }}
              />
              {!state[urlField] && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-black/5">
                Stramien Preview
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [activeTab, setActiveTab] = useState('artworks');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAccordionItem, setActiveAccordionItem] = useState('global');

  const [editorState, setEditorState] = useState<Record<string, any>>({});
  const isInitialized = useRef(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  // Bulk State
  const [selectedArtIds, setSelectedArtIds] = useState<string[]>([]);
  const [isBulkRoomDialogOpen, setIsBulkRoomDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Activeer beheerder status voor de Inline Editor bij het bezoeken van deze pagina
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_auth', 'true');
    }
  }, []);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'artworks');
  }, [firestore]);
  const { data: rawArtworks } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: settings } = useDoc(settingsRef);

  useEffect(() => {
    if (settings && !isInitialized.current) {
      setEditorState(settings as Record<string, any>);
      setFormData(settings as Record<string, any>);
      isInitialized.current = true;
    }
  }, [settings]);

  const computedPreview = useMemo(() => {
    const pageKey = activeAccordionItem === 'global' ? '' : `_${activeAccordionItem}`;
    
    return {
      image: editorState[`backgroundImageUrl${pageKey}`] || editorState.backgroundImageUrl || '',
      opacity: editorState[`backgroundOpacity${pageKey}`] ?? editorState.backgroundOpacity ?? 10,
      blur: editorState[`backgroundBlur${pageKey}`] ?? editorState.backgroundBlur ?? 0,
      scale: editorState[`backgroundScale${pageKey}`] ?? editorState.backgroundScale ?? 100,
      brightness: editorState[`backgroundBrightness${pageKey}`] ?? editorState.backgroundBrightness ?? 100,
    };
  }, [editorState, activeAccordionItem]);

  const updateEditorField = (field: string, value: any) => {
    setEditorState(prev => ({ ...prev, [field]: value }));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settingsRef) return;
    setIsSavingSettings(true);
    try {
      await updateDoc(settingsRef, { ...editorState, ...formData, updatedAt: serverTimestamp() });
      toast({ title: "Stramien instellingen opgeslagen" });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const selectImageFromArchive = (imageUrl: string | null) => {
    if (pickerTarget && imageUrl) updateEditorField(pickerTarget, imageUrl);
    setIsImagePickerOpen(false);
    setPickerTarget(null);
  };

  const handleBulkRoomUpdate = async (roomId: string, action: 'add' | 'remove') => {
    if (!firestore || selectedArtIds.length === 0) return;
    setIsProcessingBulk(true);
    try {
      const updates = selectedArtIds.map(async (id) => {
        const art = rawArtworks?.find(a => a.id === id);
        if (!art) return;
        const currentRooms = art.roomIds || [];
        const nextRooms = action === 'add' 
          ? Array.from(new Set([...currentRooms, roomId]))
          : currentRooms.filter((r: string) => r !== roomId);
        await updateDoc(doc(firestore, 'artworks', id), { roomIds: nextRooms, updatedAt: serverTimestamp() });
      });
      await Promise.all(updates);
      toast({ title: `${selectedArtIds.length} werken bijgewerkt` });
      setSelectedArtIds([]);
      setIsBulkRoomDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk update mislukt" });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkTagUpdate = async (action: 'add' | 'remove') => {
    if (!firestore || selectedArtIds.length === 0) return;
    const tagsToProcess = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tagsToProcess.length === 0) return;

    setIsProcessingBulk(true);
    try {
      const updates = selectedArtIds.map(async (id) => {
        const art = rawArtworks?.find(a => a.id === id);
        if (!art) return;
        const currentTags = art.tags || [];
        const nextTags = action === 'add'
          ? Array.from(new Set([...currentTags, ...tagsToProcess]))
          : currentTags.filter((t: string) => !tagsToProcess.includes(t));
        await updateDoc(doc(firestore, 'artworks', id), { tags: nextTags, updatedAt: serverTimestamp() });
      });
      await Promise.all(updates);
      toast({ title: "Tags bijgewerkt" });
      setSelectedArtIds([]);
      setIsBulkTagDialogOpen(false);
      setBulkTagInput('');
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk update mislukt" });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedArtIds.length === 0) return;
    if (!confirm(`Weet u zeker dat u ${selectedArtIds.length} werken wilt verwijderen uit het archief?`)) return;

    setIsProcessingBulk(true);
    try {
      const deletes = selectedArtIds.map(id => deleteDoc(doc(firestore, 'artworks', id)));
      await Promise.all(deletes);
      toast({ title: "Werken verwijderd" });
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Verwijderen mislukt" });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const [selectedStoryId, setSelectedStoryId] = useState<string>('beatrijs');
  const [storyNodes, setStoryNodes] = useState<StoryNode[]>([]);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ title: '', slug: '', description: '', order: 0, isPublic: true });
  const [isArtworkDialogOpen, setIsArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [artworkForm, setArtworkForm] = useState({ 
    title: '', displayTitle: '', slug: '', image: '', roomIds: [] as string[],
    year: '', medium: '', description: '', featured: false, inShop: false, tags: ''
  });

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

  return (
    <div className="min-h-screen pt-32 px-8 bg-transparent">
      <div 
        key={JSON.stringify(computedPreview)}
        className="fixed inset-0 pointer-events-none transition-all duration-200"
        style={{
          zIndex: -1,
          opacity: computedPreview.opacity / 100,
          filter: `blur(${computedPreview.blur}px) brightness(${computedPreview.brightness}%)`,
          backgroundImage: computedPreview.image ? `url("${computedPreview.image}")` : 'none',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: `scale(${computedPreview.scale / 100})`,
          backgroundColor: "transparent"
        }}
      />

      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-6 h-6 text-accent" />
            <h1 className="font-headline text-2xl italic">Museum Beheer</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-accent transition-colors">
              <ArrowLeft className="w-3 h-3" /> Naar Website
           </Link>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto space-y-12 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-xl flex flex-nowrap overflow-x-auto no-scrollbar">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Palette className="w-4 h-4 mr-2" /> Archief
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="story" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <LayoutTemplate className="w-4 h-4 mr-2" /> Story Designer
            </TabsTrigger>
            <TabsTrigger value="translations" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Languages className="w-4 h-4 mr-2" /> Teksten
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Settings className="w-4 h-4 mr-2" /> Stramien & Kleuren
            </TabsTrigger>
          </TabsList>

          <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/60 shadow-2xl">
            <TabsContent value="artworks" className="space-y-8 mt-0 relative">
               <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border sticky top-24 z-30 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                     <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                        <Input placeholder="Schilderij zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-full bg-white border-none shadow-inner" />
                     </div>
                     <Button 
                      variant="outline" 
                      onClick={() => setSelectedArtIds(selectedArtIds.length === filteredAndSortedArtworks.length ? [] : filteredAndSortedArtworks.map(a => a.id))} 
                      className="rounded-full h-12 text-[10px] font-black uppercase tracking-widest"
                     >
                        {selectedArtIds.length === filteredAndSortedArtworks.length ? 'Deselecteer Alles' : 'Selecteer Alles'}
                     </Button>
                  </div>
                  <Button onClick={() => { setEditingArtwork(null); setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', roomIds: [], year: '', medium: '', description: '', featured: false, inShop: false, tags: '' }); setIsArtworkDialogOpen(true); }} className="rounded-full px-8 h-12 bg-primary"><Plus className="w-4 h-4 mr-2" /> Nieuw Werk</Button>
               </div>

               {/* Bulk Actions Toolbar (Bovenaan) */}
               {selectedArtIds.length > 0 && (
                 <div className="flex items-center gap-4 bg-primary text-primary-foreground p-4 px-8 rounded-[2rem] shadow-xl animate-in fade-in slide-in-from-top-4 border border-white/10 backdrop-blur-xl mb-8 sticky top-[184px] z-20">
                    <span className="text-[10px] font-black uppercase tracking-widest shrink-0">{selectedArtIds.length} geselecteerd</span>
                    <div className="w-px h-6 bg-white/20 mx-2 shrink-0" />
                    
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsBulkRoomDialogOpen(true)} className="hover:bg-white/10 text-[10px] font-black uppercase h-10 rounded-full px-6">
                         <Layers className="w-4 h-4 mr-2" /> Zaal
                      </Button>
                      
                      <Button variant="ghost" size="sm" onClick={() => setIsBulkTagDialogOpen(true)} className="hover:bg-white/10 text-[10px] font-black uppercase h-10 rounded-full px-6">
                         <Sparkles className="w-4 h-4 mr-2" /> Tags
                      </Button>
                      
                      <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="hover:bg-destructive text-[10px] font-black uppercase h-10 rounded-full px-6">
                         <Trash2 className="w-4 h-4 mr-2" /> Wis
                      </Button>
                    </div>
                    
                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedArtIds([])} className="opacity-50 hover:opacity-100 p-2 rounded-full hover:bg-white/10">
                         <X className="w-4 h-4" />
                      </Button>
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {filteredAndSortedArtworks.map((art: any) => (
                    <Card key={art.id} className={cn("p-4 rounded-2xl border-none shadow-md group relative bg-white/80 backdrop-blur-sm transition-all", selectedArtIds.includes(art.id) && "ring-2 ring-accent scale-[0.98]")}>
                       <button onClick={() => setSelectedArtIds(p => p.includes(art.id) ? p.filter(i => i !== art.id) : [...p, art.id])} className={cn("absolute top-4 left-4 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", selectedArtIds.includes(art.id) ? "bg-accent border-accent text-white" : "bg-white/80 border-black/10 opacity-0 group-hover:opacity-100 shadow-md")}><CheckSquare className="w-4 h-4" /></button>
                       <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center">
                         {art.image ? <img src={art.image} className="w-full h-full object-cover" alt={art.title} /> : <ImageIcon className="w-8 h-8 opacity-10" />}
                       </div>
                       <h3 className="font-bold text-sm truncate">{art.displayTitle || art.title}</h3>
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-2xl">
                          <Button size="sm" onClick={() => { setEditingArtwork(art); setArtworkForm({ ...art, tags: (art.tags || []).join(', ') }); setIsArtworkDialogOpen(true); }} className="rounded-full bg-white text-black"><Edit3 className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => { if(confirm("Wissen uit archief?")) deleteDoc(doc(firestore!, 'artworks', art.id)); }} className="rounded-full"><Trash2 className="w-4 h-4" /></Button>
                       </div>
                    </Card>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="rooms" className="space-y-8 mt-0">
              <div className="flex justify-between items-center"><h2 className="font-headline text-3xl italic opacity-40">Museumzalen</h2><Button onClick={() => { setEditingRoom(null); setRoomForm({ title: '', slug: '', description: '', order: (rooms?.length || 0) + 1, isPublic: true }); setIsRoomDialogOpen(true); }} className="rounded-full bg-accent text-white"><Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal</Button></div>
              <div className="grid md:grid-cols-3 gap-6">{rooms?.map((room: any) => (<Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white/90 space-y-4"><div><h3 className="font-headline text-2xl italic">{room.title}</h3><p className="text-[10px] font-black uppercase opacity-30">Slug: {room.slug}</p></div><div className="flex gap-2"><Button onClick={() => { setEditingRoom(room); setRoomForm(room); setIsRoomDialogOpen(true); }} variant="outline" className="flex-1 rounded-xl text-[10px] font-black">Naam Wijzigen</Button><Button onClick={() => { if(confirm("Zaal verwijderen?")) deleteDoc(doc(firestore!, 'rooms', room.id)); }} variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></div></Card>))}</div>
            </TabsContent>

            <TabsContent value="story" className="space-y-12 mt-0">
               <div className="space-y-12">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/90 p-8 rounded-[3rem] shadow-xl border">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent"><LayoutTemplate className="w-8 h-8" /></div>
                        <div><h3 className="font-headline text-2xl italic leading-tight">Story Designer</h3><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Visuele compositie van biografie-pagina's</p></div>
                     </div>
                     <div className="flex items-center gap-4">
                        <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
                          <SelectTrigger className="w-[240px] h-14 rounded-2xl bg-black/5 border-none text-sm font-bold uppercase"><SelectValue placeholder="Pagina..." /></SelectTrigger>
                          <SelectContent>{PAGES.filter(p => p.id.includes('beatrijs') || p.id.includes('hanneke') || p.id.includes('peter') || p.id.includes('leo')).map(p => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                        </Select>
                        <Button onClick={async () => { setIsSavingStory(true); await setDoc(doc(firestore!, 'stories', selectedStoryId), { nodes: storyNodes, updatedAt: serverTimestamp() }, { merge: true }); setIsSavingStory(false); toast({title:"Layout opgeslagen"}); }} disabled={isSavingStory} className="h-14 px-8 rounded-2xl bg-primary shadow-lg">{isSavingStory ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Opslaan</Button>
                     </div>
                  </div>
                  <StoryEditor nodes={storyNodes} onChange={(data) => setStoryNodes(data.nodes)} />
               </div>
            </TabsContent>

            <TabsContent value="translations" className="space-y-12 mt-0">
               {Array.from(new Set(CONTENT_FIELDS.map(f => f.category))).map(cat => (
                 <section key={cat} className="space-y-8">
                   <h2 className="font-headline text-3xl italic opacity-40 border-l-4 border-accent pl-6">{cat}</h2>
                   <div className="grid gap-8">
                     {CONTENT_FIELDS.filter(f => f.category === cat).map(field => (
                       <Card key={field.id} className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white/90 space-y-6">
                         <div className="flex justify-between items-start"><Label className="text-[11px] font-black uppercase text-accent/40">{field.label}</Label><Button size="sm" variant="secondary" onClick={async () => {
                           setTranslatingField(field.id);
                           const sourceText = formData[field.id];
                           if(!sourceText) return;
                           const newTrans = { ...formData };
                           for(const l of LANGUAGES.filter(l => !l.isSource)) {
                             const res = await translateMuseumText({ text: sourceText, targetLanguage: l.label });
                             newTrans[`${field.id}_${l.code}`] = res.translatedText;
                           }
                           setFormData(newTrans);
                           setTranslatingField(null);
                         }} disabled={translatingField === field.id} className="rounded-full px-6">{translatingField === field.id ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} AI Vertaal</Button></div>
                         <div className="space-y-4">
                           <div className="space-y-2"><span className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase">Bron (NL)</span>{field.type === 'textarea' ? <Textarea value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} className="bg-black/5 min-h-[140px] rounded-2xl" /> : <Input value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} className="bg-black/5 h-14 rounded-xl" />}</div>
                           <div className="grid md:grid-cols-4 gap-6">{LANGUAGES.filter(l => !l.isSource).map(lang => (<div key={lang.code} className="space-y-2"><span className="text-[9px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full uppercase">{lang.code}</span>{field.type === 'textarea' ? <Textarea value={formData[`${field.id}_${lang.code}`] || ''} onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })} className="border-2 border-black/5 min-h-[100px] rounded-2xl text-xs" /> : <Input value={formData[`${field.id}_${lang.code}`] || ''} onChange={e => setFormData({ ...formData, [`${field.id}_${lang.code}`]: e.target.value })} className="border-2 border-black/5 h-12 rounded-xl text-xs" />}</div>))}</div>
                         </div>
                       </Card>
                     ))}
                   </div>
                 </section>
               ))}
               <Button onClick={async () => { setIsSavingSettings(true); await updateDoc(settingsRef!, formData); setIsSavingSettings(false); toast({title:"Teksten opgeslagen"}); }} className="w-full h-20 rounded-[2.5rem] bg-primary text-xl font-black uppercase tracking-widest shadow-2xl">Teksten Opslaan</Button>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
               <Card className="p-12 rounded-[3rem] bg-white/95 backdrop-blur-xl border-none shadow-xl">
                  <form onSubmit={(e) => handleSaveSettings(e)} className="space-y-12">
                     <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                           <div className="flex items-center gap-3 opacity-40"><Type className="w-5 h-5" /><h3 className="text-xs font-black uppercase">Typografie</h3></div>
                           <div className="grid gap-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Hoofd Font</Label><Select name="bodyFont" value={formData.bodyFont} onValueChange={v => setFormData(p => ({...p, bodyFont: v}))}><SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sans">Modern (Sans)</SelectItem><SelectItem value="serif">Klassiek (Serif)</SelectItem></SelectContent></Select></div>
                                 <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Kop Font</Label><Select name="headFont" value={formData.headFont} onValueChange={v => setFormData(p => ({...p, headFont: v}))}><SelectTrigger className="h-12 rounded-xl bg-black/5 border-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sans">Modern (Sans)</SelectItem><SelectItem value="serif">Klassiek (Serif)</SelectItem></SelectContent></Select></div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black opacity-40">Basis Tekstgrootte</Label>
                                <Input value={formData.baseFontSize || ''} onChange={e => setFormData(p => ({...p, baseFontSize: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" />
                              </div>
                              <div className="pt-4 border-t border-black/5">
                                 <AutonomousSlider 
                                  label="Koptekst Schaal (Heading Size)" 
                                  field="headingScale" 
                                  value={formData.headingScale ?? 1.25} 
                                  onChange={updateEditorField}
                                  min={0.5}
                                  max={2.0}
                                  step={0.05}
                                  unit="x"
                                 />
                                 <p className="text-[8px] font-bold uppercase opacity-30 mt-2">Past de grootte van alle titels (H1, H2, H3) proportioneel aan.</p>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-8">
                           <div className="flex items-center gap-3 opacity-40"><Palette className="w-5 h-5" /><h3 className="text-xs font-black uppercase">Visuele Identiteit</h3></div>
                           <div className="grid gap-6">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Accent Kleur</Label><Input value={formData.accentColor || ''} onChange={e => setFormData(p => ({...p, accentColor: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" /></div>
                                 <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Achtergrond Kleur</Label><Input value={formData.bgColor || ''} onChange={e => setFormData(p => ({...p, bgColor: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" /></div>
                              </div>
                              <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Radius (Rondingen)</Label><Input value={formData.radius || ''} onChange={e => setFormData(p => ({...p, radius: e.target.value}))} className="h-12 rounded-xl bg-black/5 border-none" /></div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8 pt-12 border-t border-black/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 opacity-40">
                            <Monitor className="w-5 h-5" />
                            <h3 className="text-xs font-black uppercase">Achtergrond & Stramien</h3>
                          </div>
                        </div>

                        <Accordion 
                          type="single" 
                          collapsible 
                          value={activeAccordionItem}
                          onValueChange={(val) => val && setActiveAccordionItem(val)}
                          className="w-full space-y-4"
                        >
                           <BackgroundEditorSection 
                            pageId="global" 
                            label="Globaal Stramien (Basis)" 
                            state={editorState}
                            onChange={updateEditorField}
                            onPick={(f: string) => { setPickerTarget(f); setIsImagePickerOpen(true); }}
                           />
                           <div className="pt-4 pb-2 border-b border-black/5 px-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Pagina-specifieke Overrides</p>
                           </div>
                           {PAGES.map(page => (
                             <BackgroundEditorSection 
                              key={page.id} 
                              pageId={page.id} 
                              label={`${page.label} Sfeer`}
                              state={editorState}
                              onChange={updateEditorField}
                              onPick={(f: string) => { setPickerTarget(f); setIsImagePickerOpen(true); }}
                             />
                           ))}
                        </Accordion>
                     </div>

                     <Button type="submit" disabled={isSavingSettings} className="w-full h-20 rounded-[2.5rem] bg-primary text-xl font-black uppercase shadow-2xl group">
                        {isSavingSettings ? <Loader2 className="animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />} 
                        Alle Instellingen Opslaan
                     </Button>
                  </form>
               </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Kies uit Archief</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 py-8">
            {filteredAndSortedArtworks.map((art: any) => (
              <button 
                key={art.id} 
                type="button"
                onClick={() => selectImageFromArchive(art.image)} 
                className="group relative aspect-square rounded-2xl overflow-hidden bg-black/5 border hover:ring-2 ring-accent transition-all"
              >
                {art.image ? (
                  <img src={art.image} className="w-full h-full object-cover" alt={art.title} />
                ) : (
                  <ImageIcon className="w-6 h-6 mx-auto opacity-10" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isArtworkDialogOpen} onOpenChange={setIsArtworkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">{editingArtwork ? 'Werk Bewerken' : 'Nieuw Kunstwerk'}</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Titel (Systeem)</Label><Input value={artworkForm.title} onChange={e => setArtworkForm({...artworkForm, title: e.target.value})} className="rounded-xl h-12" /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Afbeelding URL</Label><Input value={artworkForm.image || ''} onChange={e => setArtworkForm({...artworkForm, image: e.target.value})} className="rounded-xl h-12" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-40">Toewijzen aan Zalen</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-black/5 rounded-xl">
                {rooms?.map((r: any) => (
                  <label key={r.id} className={cn("px-4 py-1.5 rounded-full border text-[10px] font-black uppercase cursor-pointer transition-all", artworkForm.roomIds?.includes(r.id) ? "bg-accent text-white border-accent" : "bg-white border-black/5 opacity-50")}>
                    <input type="checkbox" className="hidden" checked={artworkForm.roomIds?.includes(r.id)} onChange={e => setArtworkForm(p => ({ ...p, roomIds: e.target.checked ? [...(p.roomIds || []), r.id] : (p.roomIds || []).filter(id => id !== r.id) }))} />
                    {r.title}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] uppercase font-black opacity-40">Metadata Tags (komma gescheiden)</Label><Input value={artworkForm.tags} onChange={e => setArtworkForm({...artworkForm, tags: e.target.value})} className="rounded-xl h-12" /></div>
          </div>
          <DialogFooter><Button onClick={async () => {
            const clean = sanitizeArtwork({...artworkForm, tags: artworkForm.tags.split(',').map(t => t.trim()).filter(Boolean)});
            if(editingArtwork) await updateDoc(doc(firestore!, 'artworks', editingArtwork.id), clean);
            else await addDoc(collection(firestore!, 'artworks'), { ...clean, createdAt: serverTimestamp() });
            setIsArtworkDialogOpen(false); toast({title:"Opgeslagen in archief"});
          }} className="w-full h-14 rounded-2xl bg-primary">Opslaan in Archief</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Room Dialog */}
      <Dialog open={isBulkRoomDialogOpen} onOpenChange={setIsBulkRoomDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-lg p-8">
           <DialogHeader>
              <DialogTitle className="font-headline text-2xl italic">Bulk Zaal Beheer</DialogTitle>
              <DialogDescription className="text-xs uppercase font-black tracking-widest opacity-40">Toewijzen voor {selectedArtIds.length} geselecteerde werken</DialogDescription>
           </DialogHeader>
           <div className="py-8 space-y-6">
              <p className="text-sm font-light text-muted-foreground leading-relaxed">Kies een zaal om de selectie aan toe te voegen of juist uit te verwijderen.</p>
              <div className="grid grid-cols-1 gap-4">
                 {rooms?.map((room: any) => (
                    <div key={room.id} className="p-5 rounded-2xl bg-black/5 border flex items-center justify-between group">
                       <span className="font-headline text-lg italic">{room.title}</span>
                       <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            disabled={isProcessingBulk}
                            onClick={() => handleBulkRoomUpdate(room.id, 'add')}
                            className="bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest px-4"
                          >
                             <CheckCircle className="w-3.5 h-3.5 mr-2" /> Voeg Toe
                          </Button>
                          <Button 
                            size="sm" 
                            disabled={isProcessingBulk}
                            variant="outline"
                            onClick={() => handleBulkRoomUpdate(room.id, 'remove')}
                            className="rounded-xl text-[9px] font-black uppercase tracking-widest px-4"
                          >
                             <MinusCircle className="w-3.5 h-3.5 mr-2" /> Verwijder
                          </Button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={isBulkTagDialogOpen} onOpenChange={setIsBulkTagDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-lg p-8">
           <DialogHeader>
              <DialogTitle className="font-headline text-2xl italic">Bulk Tags Beheer</DialogTitle>
              <DialogDescription className="text-xs uppercase font-black tracking-widest opacity-40">Update tags voor {selectedArtIds.length} werken</DialogDescription>
           </DialogHeader>
           <div className="py-8 space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-black opacity-40 ml-2">Tags (komma gescheiden)</Label>
                 <Input 
                   value={bulkTagInput} 
                   onChange={e => setBulkTagInput(e.target.value)} 
                   placeholder="Bijv. Olieverf, Polder, 60-70"
                   className="h-14 rounded-2xl bg-black/5 border-none px-6"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <Button 
                   disabled={isProcessingBulk || !bulkTagInput} 
                   onClick={() => handleBulkTagUpdate('add')}
                   className="h-16 rounded-2xl bg-accent text-accent-foreground font-black uppercase tracking-widest text-[11px]"
                 >
                    <CheckCircle className="w-4 h-4 mr-2" /> Voeg Tags Toe
                 </Button>
                 <Button 
                   disabled={isProcessingBulk || !bulkTagInput} 
                   onClick={() => handleBulkTagUpdate('remove')}
                   variant="outline"
                   className="h-16 rounded-2xl font-black uppercase tracking-widest text-[11px]"
                 >
                    <MinusCircle className="w-4 h-4 mr-2" /> Verwijder Tags
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
