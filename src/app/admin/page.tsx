
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
  LayoutTemplate,
  Languages,
  RotateCcw,
  X,
  CheckCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  Tags as TagsIcon,
  Archive,
  MoreVertical,
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sortArtworksByTitle, sanitizeArtwork, normalizeArtwork, MUSEUM_TAGS, slugify } from '@/lib/museum-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { translateMuseumText } from '@/ai/flows/translate-flow';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  
  // Persistent selection across tabs
  const [selectedArtIds, setSelectedArtIds] = useState<string[]>([]);
  
  const [editorState, setEditorState] = useState<Record<string, any>>({});
  const isInitialized = useRef(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  // Bulk State
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

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
      toast({ title: "Instellingen opgeslagen" });
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
    const count = selectedArtIds.length;
    const targetRoom = rooms?.find(r => r.id === roomId);
    const roomTitle = targetRoom?.title || "Geselecteerde Zaal";

    try {
      selectedArtIds.forEach((id) => {
        const art = rawArtworks?.find(a => a.id === id);
        if (!art) return;
        const currentRooms = art.roomIds || [];
        const nextRooms = action === 'add' 
          ? Array.from(new Set([...currentRooms, roomId]))
          : currentRooms.filter((r: string) => r !== roomId);
        
        const updateData = { 
          roomIds: nextRooms, 
          updatedAt: serverTimestamp() 
        };

        updateDoc(doc(firestore, 'artworks', id), updateData)
          .catch(async (serverError) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `artworks/${id}`,
              operation: 'update',
              requestResourceData: updateData
            }));
          });
      });
      
      toast({ 
        title: action === 'add' ? "Werken toegevoegd" : "Werken verwijderd", 
        description: `${count} werken ${action === 'add' ? 'toegevoegd aan' : 'verwijderd uit'} ${roomTitle}.` 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk update mislukt" });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleRemoveFromRoom = async (artId: string, roomId: string) => {
    if (!firestore) return;
    try {
      const art = rawArtworks?.find(a => a.id === artId);
      if (!art) return;
      const currentRooms = art.roomIds || [];
      const nextRooms = currentRooms.filter((r: string) => r !== roomId);
      
      const updateData = { roomIds: nextRooms, updatedAt: serverTimestamp() };
      
      updateDoc(doc(firestore, 'artworks', artId), updateData)
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `artworks/${artId}`,
            operation: 'update',
            requestResourceData: updateData
          }));
        });

      toast({ title: "1 werk verwijderd uit zaal" });
    } catch (e) {
      toast({ variant: "destructive", title: "Verwijderen mislukt" });
    }
  };

  const handleBulkTagUpdate = async (action: 'add' | 'remove') => {
    if (!firestore || selectedArtIds.length === 0) return;
    const tagsToProcess = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tagsToProcess.length === 0) return;

    setIsProcessingBulk(true);
    const count = selectedArtIds.length;
    try {
      selectedArtIds.forEach((id) => {
        const art = rawArtworks?.find(a => a.id === id);
        if (!art) return;
        const currentTags = art.tags || [];
        const nextTags = action === 'add'
          ? Array.from(new Set([...currentTags, ...tagsToProcess]))
          : currentTags.filter((t: string) => !tagsToProcess.includes(t));
        
        const updateData = { tags: nextTags, updatedAt: serverTimestamp() };
        
        updateDoc(doc(firestore, 'artworks', id), updateData)
          .catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `artworks/${id}`,
              operation: 'update',
              requestResourceData: updateData
            }));
          });
      });
      
      toast({ 
        title: "Tags bijgewerkt", 
        description: `${tagsToProcess.length} tags ${action === 'add' ? 'toegevoegd aan' : 'verwijderd van'} ${count} werken.` 
      });
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
    const count = selectedArtIds.length;
    if (!confirm(`Weet u zeker dat u deze ${count} werken definitief wilt verwijderen uit het archief?`)) return;

    setIsProcessingBulk(true);
    try {
      selectedArtIds.forEach(id => {
        deleteDoc(doc(firestore, 'artworks', id)).catch(err => console.error(err));
      });
      toast({ title: "Verwijderen verwerkt", description: `${count} werken zijn uit het archief gewist.` });
      setSelectedArtIds([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Verwijderen mislukt" });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!firestore || !room?.id) return;
    
    const confirmed = window.confirm(`Weet u zeker dat u zaal "${room.title}" wilt verwijderen? Alle verwijzingen in kunstwerken worden ook opgeschoond uit de database.`);
    if (!confirmed) return;
    
    try {
      // 1. Zoek alle kunstwerken die in deze zaal zitten
      const artworksInRoom = rawArtworks?.filter(a => a.roomIds?.includes(room.id)) || [];
      
      // 2. Verwijder de zaal-ID uit al deze kunstwerken (non-blocking)
      artworksInRoom.forEach(art => {
        const nextRooms = (art.roomIds || []).filter((id: string) => id !== room.id);
        const updateData = { roomIds: nextRooms, updatedAt: serverTimestamp() };
        
        updateDoc(doc(firestore, 'artworks', art.id), updateData)
          .catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `artworks/${art.id}`,
              operation: 'update',
              requestResourceData: updateData
            }));
          });
      });

      // 3. Verwijder de zaal zelf
      await deleteDoc(doc(firestore, 'rooms', room.id));
      
      toast({ 
        title: "Zaal succesvol verwijderd", 
        description: `Zaal "${room.title}" is gewist en ${artworksInRoom.length} kunstwerk-koppelingen zijn opgeschoond.` 
      });
    } catch (e: any) {
      console.error("Delete room error:", e);
      toast({ variant: "destructive", title: "Fout bij verwijderen van zaal" });
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
      {/* Background Sync for Admin */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-6 h-6 text-accent" />
            <h1 className="font-headline text-2xl italic">Museum Beheer</h1>
          </div>
          {selectedArtIds.length > 0 && (
            <div className="flex items-center gap-2 bg-accent/10 text-accent px-5 py-2 rounded-full animate-in fade-in zoom-in duration-300 shadow-sm border border-accent/20">
               <span className="text-[11px] font-black uppercase tracking-widest">{selectedArtIds.length} geselecteerd</span>
               <button onClick={() => setSelectedArtIds([])} className="ml-1 hover:text-foreground p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
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
              <Archive className="w-4 h-4 mr-2" /> Archief
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-13 uppercase font-black text-[10px] tracking-widest shrink-0">
              <Layers className="w-4 h-4 mr-2" /> Zalen & Collecties
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
            {/* 1. ARTWORKS TAB */}
            <TabsContent value="artworks" className="space-y-8 mt-0 relative">
               <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border sticky top-24 z-30 shadow-sm">
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
                  
                  {selectedArtIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground p-2 px-6 rounded-full shadow-lg animate-in slide-in-from-top-4 border-2 border-white/20">
                       <div className="mr-4 pr-4 border-r border-white/10 flex flex-col justify-center">
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{selectedArtIds.length}</span>
                          <span className="text-[7px] font-bold uppercase opacity-60">klaar voor actie</span>
                       </div>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="sm" className="hover:bg-white/10 text-[10px] font-black uppercase h-9 rounded-full px-4"><Layers className="w-3.5 h-3.5 mr-2" /> Zaal</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2 shadow-2xl">
                             <DropdownMenuLabel className="text-[9px] uppercase font-black opacity-40 px-3 py-2">Toevoegen aan...</DropdownMenuLabel>
                             {rooms?.map(room => (
                               <DropdownMenuItem key={room.id} onClick={() => handleBulkRoomUpdate(room.id, 'add')} className="rounded-xl cursor-pointer p-3 text-xs font-bold uppercase tracking-wider">
                                  {room.title}
                               </DropdownMenuItem>
                             ))}
                             <DropdownMenuSeparator />
                             <DropdownMenuLabel className="text-[9px] uppercase font-black opacity-40 px-3 py-2 text-destructive">Verwijderen uit...</DropdownMenuLabel>
                             {rooms?.map(room => (
                               <DropdownMenuItem key={room.id} onClick={() => handleBulkRoomUpdate(room.id, 'remove')} className="rounded-xl cursor-pointer p-3 text-xs font-bold uppercase tracking-wider text-destructive">
                                  {room.title}
                               </DropdownMenuItem>
                             ))}
                          </DropdownMenuContent>
                       </DropdownMenu>
                       <Button variant="ghost" size="sm" onClick={() => setIsBulkTagDialogOpen(true)} className="hover:bg-white/10 text-[10px] font-black uppercase h-9 rounded-full px-4"><TagsIcon className="w-3.5 h-3.5 mr-2" /> Tags</Button>
                       <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="hover:bg-destructive text-[10px] font-black uppercase h-9 rounded-full px-4"><Trash2 className="w-3.5 h-3.5 mr-2" /> Wis</Button>
                    </div>
                  )}

                  <Button onClick={() => { setEditingArtwork(null); setArtworkForm({ title: '', displayTitle: '', slug: '', image: '', roomIds: [], year: '', medium: '', description: '', featured: false, inShop: false, tags: '' }); setIsArtworkDialogOpen(true); }} className="rounded-full px-8 h-12 bg-accent text-white"><Plus className="w-4 h-4 mr-2" /> Nieuw Werk</Button>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {filteredAndSortedArtworks.map((art: any) => (
                    <Card key={art.id} className={cn("p-4 rounded-2xl border-none shadow-md group relative bg-white/80 backdrop-blur-sm transition-all hover:scale-[1.02]", selectedArtIds.includes(art.id) && "ring-2 ring-accent bg-accent/5")}>
                       <button onClick={() => setSelectedArtIds(p => p.includes(art.id) ? p.filter(i => i !== art.id) : [...p, art.id])} className={cn("absolute top-3 left-3 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", selectedArtIds.includes(art.id) ? "bg-accent border-accent text-white" : "bg-white border-black/10 opacity-0 group-hover:opacity-100 shadow-md")}><CheckSquare className="w-4 h-4" /></button>
                       <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-4 flex items-center justify-center">
                         {art.image ? <img src={art.image} className="w-full h-full object-cover" alt={art.title} /> : <ImageIcon className="w-8 h-8 opacity-10" />}
                       </div>
                       <h3 className="font-bold text-xs truncate px-1">{art.displayTitle || art.title}</h3>
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-2xl">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingArtwork(art); setArtworkForm({ ...art, tags: (art.tags || []).join(', ') }); setIsArtworkDialogOpen(true); }} className="rounded-full bg-white text-black hover:bg-white/80 w-10 h-10"><Edit3 className="w-4 h-4" /></Button>
                       </div>
                    </Card>
                  ))}
               </div>
            </TabsContent>

            {/* 2. ROOMS TAB */}
            <TabsContent value="rooms" className="space-y-10 mt-0">
              <div className="flex justify-between items-center bg-white/50 p-6 rounded-[2.5rem] border">
                <div className="space-y-1">
                  <h2 className="font-headline text-3xl italic opacity-60">Zalen & Collecties</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Beheer schilderijen per thematische kamer</p>
                </div>
                <Button onClick={() => { setEditingRoom(null); setRoomForm({ title: '', slug: '', description: '', order: (rooms?.length || 0) + 1, isPublic: true }); setIsRoomDialogOpen(true); }} className="rounded-full bg-accent text-white h-12 px-8">
                  <Plus className="w-4 h-4 mr-2" /> Nieuwe Zaal
                </Button>
              </div>

              <div className="space-y-4">
                {rooms?.map((room: any) => {
                  const roomArtworks = filteredAndSortedArtworks.filter(art => art.roomIds?.includes(room.id));
                  return (
                    <div key={room.id} className="border bg-white/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden group">
                       <div className="flex items-center justify-between px-8 py-8">
                          <div className="flex items-center gap-6 flex-1">
                             <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center text-accent">
                                <Layers className="w-5 h-5" />
                             </div>
                             <div className="flex-1">
                                <h3 className="font-headline text-2xl italic leading-none">{room.title}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mt-2">{roomArtworks.length} werken &bull; /{room.slug}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             <Button size="sm" variant="ghost" onClick={() => { setEditingRoom(room); setRoomForm(room); setIsRoomDialogOpen(true); }} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100">Hernoemen</Button>
                             <Button 
                               size="sm" 
                               variant="ghost" 
                               onClick={() => handleDeleteRoom(room)} 
                               className="h-9 w-9 p-0 rounded-xl text-destructive hover:bg-destructive/10 transition-all z-20"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                             <div className="w-px h-6 bg-black/5 mx-2" />
                             <Accordion type="single" collapsible className="border-none">
                                <AccordionItem value={room.id} className="border-none">
                                   <AccordionTrigger className="p-0 hover:no-underline border-none">
                                      <span className="sr-only">Details</span>
                                   </AccordionTrigger>
                                </AccordionItem>
                             </Accordion>
                          </div>
                       </div>

                       <Accordion type="single" collapsible>
                          <AccordionItem value={room.id} className="border-none">
                             <AccordionContent className="px-8 pb-10 pt-4 space-y-8 border-t border-black/5 mt-0">
                                <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Inhoud van de zaal</h4>
                                      <p className="text-[9px] font-bold opacity-30">{roomArtworks.length} schilderijen momenteel in collectie</p>
                                   </div>
                                   {selectedArtIds.length > 0 && (
                                     <div className="flex gap-2 animate-in slide-in-from-right-4">
                                       <Button size="sm" onClick={() => handleBulkRoomUpdate(room.id, 'add')} className="h-10 px-6 rounded-full bg-accent text-white text-[9px] font-black uppercase tracking-widest shadow-md">
                                          <Plus className="w-3.5 h-3.5 mr-2" /> Plaats {selectedArtIds.length} geselecteerde werken
                                       </Button>
                                       <Button size="sm" variant="outline" onClick={() => handleBulkRoomUpdate(room.id, 'remove')} className="h-10 px-6 rounded-full text-[9px] font-black uppercase tracking-widest border-2">
                                          <MinusCircle className="w-3.5 h-3.5 mr-2" /> Wis selectie uit deze zaal
                                       </Button>
                                     </div>
                                   )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                   {roomArtworks.length === 0 ? (
                                     <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl opacity-20 italic">Deze zaal is momenteel leeg</div>
                                   ) : (
                                     roomArtworks.map(art => (
                                       <div key={art.id} className="relative aspect-square rounded-2xl overflow-hidden group/art border border-black/5">
                                          <img src={art.image} className="w-full h-full object-cover" alt={art.title} />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
                                             <button onClick={() => handleRemoveFromRoom(art.id, room.id)} title="Verwijderen uit deze zaal" className="p-2 bg-white rounded-full text-destructive shadow-lg hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
                                          </div>
                                       </div>
                                     ))
                                   )}
                                </div>
                             </AccordionContent>
                          </AccordionItem>
                       </Accordion>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* 3. STORY TAB */}
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

            {/* 4. TRANSLATIONS TAB */}
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

            {/* 5. SETTINGS TAB */}
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

      {/* Create/Edit Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-md p-8">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">{editingRoom ? 'Zaal Aanpassen' : 'Nieuwe Zaal'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40">Naam</Label><Input value={roomForm.title} onChange={e => setRoomForm({...roomForm, title: e.target.value})} className="rounded-xl h-12" /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40">Slug (URL-naam)</Label><Input value={roomForm.slug} onChange={e => setRoomForm({...roomForm, slug: e.target.value})} className="rounded-xl h-12" /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40">Volgorde (Nummer)</Label><Input type="number" value={roomForm.order} onChange={e => setRoomForm({...roomForm, order: Number(e.target.value)})} className="rounded-xl h-12" /></div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
               // Ensure slug is always kebab-case
               const finalSlug = slugify(roomForm.slug || roomForm.title);
               const clean = { ...roomForm, slug: finalSlug, updatedAt: serverTimestamp() };
               
               if(editingRoom) await updateDoc(doc(firestore!, 'rooms', editingRoom.id), clean);
               else await addDoc(collection(firestore!, 'rooms'), { ...clean, createdAt: serverTimestamp() });
               
               setIsRoomDialogOpen(false); 
               toast({title:"Zaal bewaard"});
            }} className="w-full h-14 rounded-2xl bg-primary">Zaal Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
