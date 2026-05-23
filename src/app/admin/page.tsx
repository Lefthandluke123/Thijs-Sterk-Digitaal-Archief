"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, deleteDoc, query, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Search,
  Palette,
  Star,
  LifeBuoy,
  CheckSquare,
  X,
  Lock,
  Tag as TagIcon,
  Crop,
  Sun,
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';
import { verifyAdminPassword } from '@/lib/admin-actions';

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

export default function AdminPage() {
  const firestore = useFirestore();
  const { t } = useLanguage();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
      toast({ variant: "destructive", title: "Toegang geweigerd", description: "Onjuist wachtwoord." });
    }
    setIsVerifying(false);
  };

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore, isAuthorized]);

  const { data: rawArtworks } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!rawArtworks) return [];
    return [...rawArtworks].sort(sortArtworksByTitle);
  }, [rawArtworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art: any) => {
      const displayTitle = art.displayTitle || art.title || "";
      const series = art.series || "";
      return displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
             series.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [artworks, searchQuery]);

  const groupedArtworks = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const groupsMap: Record<string, any[]> = {};

    filteredArtworks.forEach((art: any) => {
      const series = art.series || "Nog in te delen";
      if (!groupsMap[series]) groupsMap[series] = [];
      groupsMap[series].push(art);
    });

    const sortedLabels = Object.keys(groupsMap).sort((a, b) => {
      if (a === "Nog in te delen") return 1;
      if (b === "Nog in te delen") return -1;
      return a.localeCompare(b);
    });

    sortedLabels.forEach(label => {
      groups.push({ label, items: groupsMap[label] });
    });

    return groups;
  }, [filteredArtworks]);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, isAuthorized]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const handleAddNew = async () => {
    if (!firestore) return;
    setIsCreating(true);
    try {
      const newDoc = await addDoc(collection(firestore, 'artworks'), {
        title: 'Nieuw Werk',
        displayTitle: '',
        series: 'Nog in te delen',
        year: '',
        imageUrl: '',
        brightness: 1,
        cropTop: 0,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        tags: [],
        createdAt: serverTimestamp()
      });
      setEditingId(newDoc.id);
      toast({ title: "Schilderij toegevoegd", description: "U kunt nu de details invullen." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' }));
    });
  };

  const editingArtwork = useMemo(() => artworks.find(a => a.id === editingId), [artworks, editingId]);

  const toggleTag = (tag: string) => {
    if (!editingId || !editingArtwork) return;
    const currentTags = editingArtwork.tags || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    updateArtworkField(editingId, 'tags', newTags);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                 <Lock className="w-10 h-10 text-accent" />
              </div>
              <h1 className="font-headline text-3xl font-light italic">Beheer Toegang</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-40">Beveiligd Archief</p>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase tracking-widest font-black opacity-60 ml-2">Toegangscode</Label>
                 <Input 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)}
                   className={cn("h-14 rounded-2xl bg-black/5 border-none text-center text-lg tracking-[0.5em]", authError && "ring-2 ring-destructive")}
                   autoFocus
                   disabled={isVerifying}
                 />
              </div>
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl">
                 {isVerifying ? <Loader2 className="animate-spin w-4 h-4" /> : "Ontgrendel"}
              </Button>
           </form>
           <Link href="/" className="block text-center text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-3 h-3 inline mr-2" /> Terug naar website
           </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14 md:pt-32">
      <header className="h-16 md:h-32 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 md:top-0 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4">
            <img src={siteSettings?.logoUrl || "/logo.png"} className="h-10 md:h-20 w-auto" alt="Logo" />
            <div className="flex flex-col leading-none border-l border-border/40 pl-4">
              <h1 className="font-headline text-lg md:text-3xl font-medium text-foreground">{siteSettings?.siteTitle || "Digitaal Museum"}</h1>
              <span className="text-[7px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Curator Edition</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/" className="text-[10px] md:text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2">
             <ArrowLeft className="w-3.5 h-3.5" /> Naar Website
           </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto flex flex-wrap justify-center h-auto border border-black/5">
            <TabsTrigger value="archive" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest">Schilderijen</TabsTrigger>
            <TabsTrigger value="help" className="rounded-full px-6 text-[11px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"><LifeBuoy className="w-3 h-3 mr-2" /> Gids</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-12">
            <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input 
                    placeholder="Doorzoek de collectie..." 
                    className="pl-12 h-12 bg-white/50 border-none rounded-full shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="flex gap-2">
                 <Button 
                   onClick={handleAddNew} 
                   disabled={isCreating}
                   className="rounded-full h-12 px-6 bg-accent text-accent-foreground uppercase font-bold tracking-widest text-[10px]"
                 >
                   {isCreating ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />} 
                   Nieuw Schilderij
                 </Button>
                 <Button 
                  variant={isSelectionMode ? "accent" : "outline"} 
                  onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                  className="rounded-full h-12 px-6 uppercase font-bold tracking-widest text-[10px]"
                 >
                   {isSelectionMode ? <X className="w-4 h-4 mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />} 
                   {isSelectionMode ? "Annuleer" : "Selecteer Groep"}
                 </Button>
               </div>
            </div>

            <div className="space-y-16">
              {groupedArtworks.map((group) => (
                <div key={group.label} className="space-y-6">
                  <div className="flex items-center gap-4 border-l-4 border-accent pl-4 py-1 sticky top-[136px] md:top-[208px] z-30 bg-background/80 backdrop-blur-md -mx-4 px-4 rounded-r-xl">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-accent">{group.label}</h3>
                    <div className="h-px bg-accent/20 flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {group.items.map((art: any) => {
                      const isSelected = selectedIds.includes(art.id);
                      return (
                        <Card 
                          key={art.id} 
                          className={cn(
                            "overflow-hidden cursor-pointer transition-all relative border-none shadow-md group",
                            isSelected ? "ring-4 ring-accent" : "hover:ring-2 hover:ring-accent/50",
                            isSelectionMode && "scale-95"
                          )} 
                          onClick={() => isSelectionMode ? (setSelectedIds(prev => prev.includes(art.id) ? prev.filter(i => i !== art.id) : [...prev, art.id])) : setEditingId(art.id)}
                        >
                          {art.featured && <Star className="absolute top-2 left-2 w-3 h-3 text-accent fill-accent z-10" />}
                          <div className="aspect-square bg-muted/20">
                            {art.imageUrl ? (
                              <img src={art.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={art.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <Palette className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-2 text-center bg-white">
                            <h4 className="text-[9px] font-bold uppercase truncate">{art.displayTitle || art.title}</h4>
                            {art.series && (
                              <p className="text-[7px] uppercase font-bold mt-1 opacity-40">{art.series}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent 
          className="max-w-none w-screen h-screen p-0 flex flex-col bg-background border-none rounded-none overflow-hidden fixed inset-0 translate-x-0 translate-y-0 z-[100] outline-none shadow-none"
        >
          <DialogTitle className="sr-only">Editor - {editingArtwork?.title}</DialogTitle>
          <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Linker paneel: Preview area - Robust centering */}
            <div className="flex-1 flex flex-col bg-black/5 relative border-r border-black/5 overflow-hidden">
               {/* Fixed Header in Preview */}
               <div className="h-16 md:h-20 border-b border-black/5 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-20">
                  <button onClick={() => setEditingId(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  <div className="flex flex-col items-center text-center px-4 overflow-hidden">
                    <h2 className="text-sm font-bold uppercase tracking-widest truncate w-full">{editingArtwork?.displayTitle || editingArtwork?.title}</h2>
                    {editingArtwork?.series && (
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">{editingArtwork.series}</span>
                    )}
                  </div>
                  <div className="w-10" />
               </div>
               
               {/* Image Container - Grid centering is most stable */}
               <div className="flex-1 grid place-items-center p-8 md:p-20 overflow-hidden relative">
                  {editingArtwork?.imageUrl ? (
                    <div className="relative max-w-full max-h-full shadow-2xl bg-white p-2 md:p-4 rounded-sm border border-black/5 overflow-hidden">
                      <img 
                        src={editingArtwork.imageUrl} 
                        className="max-h-[70vh] md:max-h-[75vh] w-auto h-auto object-contain block transition-all" 
                        alt="Preview" 
                        style={{ 
                          filter: `brightness(${editingArtwork.brightness || 1})`,
                          clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-4 opacity-30">
                      <Palette className="w-20 h-20 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Voeg een afbeelding URL toe</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Rechter paneel: Controls */}
            <div className="w-full md:w-[450px] bg-white flex flex-col shadow-2xl overflow-y-auto z-10 h-full">
              {editingArtwork && (
                <div className="p-8 space-y-12 pb-32">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                       <Palette className="w-4 h-4 text-accent" />
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Identiteit & Locatie</h3>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Afbeelding URL (Storage)</Label>
                         <Input defaultValue={editingArtwork.imageUrl || ''} onBlur={(e) => updateArtworkField(editingId!, 'imageUrl', e.target.value)} className="h-12 rounded-xl" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Publieke Titel</Label>
                         <Input defaultValue={editingArtwork.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Zaal / Collectie</Label>
                         <Input defaultValue={editingArtwork.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} className="h-12 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold opacity-40">Jaartal</Label>
                           <Input 
                             defaultValue={editingArtwork.year || ''} 
                             onBlur={(e) => updateArtworkField(editingId!, 'year', e.target.value)} 
                             className="h-12 rounded-xl" 
                             placeholder="bijv. 1954" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold opacity-40">Techniek/Medium</Label>
                           <Input defaultValue={editingArtwork.medium || ''} onBlur={(e) => updateArtworkField(editingId!, 'medium', e.target.value)} className="h-12 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Afmetingen</Label>
                         <Input defaultValue={editingArtwork.dimensions || ''} onBlur={(e) => updateArtworkField(editingId!, 'dimensions', e.target.value)} className="h-12 rounded-xl" placeholder="bijv. 60 x 80 cm" />
                      </div>
                    </div>
                  </div>

                  {/* Visuele Instellingen: Crop & Brightness */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                       <Crop className="w-4 h-4 text-accent" />
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Beelduitsnede & Licht</h3>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center px-1">
                           <Label className="text-[10px] uppercase font-bold opacity-40">Helderheid</Label>
                           <Sun className="w-3 h-3 opacity-30" />
                         </div>
                         <Slider 
                           value={[editingArtwork.brightness || 1]} 
                           min={0.5} 
                           max={1.5} 
                           step={0.05} 
                           onValueChange={([val]) => updateArtworkField(editingId!, 'brightness', val)} 
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-8 pt-4">
                         <div className="space-y-3">
                           <Label className="text-[9px] uppercase font-black opacity-30">Uitsnede Boven</Label>
                           <Slider value={[editingArtwork.cropTop || 0]} max={50} step={1} onValueChange={([val]) => updateArtworkField(editingId!, 'cropTop', val)} />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[9px] uppercase font-black opacity-30">Uitsnede Onder</Label>
                           <Slider value={[editingArtwork.cropBottom || 0]} max={50} step={1} onValueChange={([val]) => updateArtworkField(editingId!, 'cropBottom', val)} />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[9px] uppercase font-black opacity-30">Uitsnede Links</Label>
                           <Slider value={[editingArtwork.cropLeft || 0]} max={50} step={1} onValueChange={([val]) => updateArtworkField(editingId!, 'cropLeft', val)} />
                         </div>
                         <div className="space-y-3">
                           <Label className="text-[9px] uppercase font-black opacity-30">Uitsnede Rechts</Label>
                           <Slider value={[editingArtwork.cropRight || 0]} max={50} step={1} onValueChange={([val]) => updateArtworkField(editingId!, 'cropRight', val)} />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags Sectie voor Uw Zaal (Curator Pagina) */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                       <TagIcon className="w-4 h-4 text-accent" />
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Uw Zaal Categorieën</h3>
                    </div>
                    
                    <div className="space-y-6">
                      {Object.entries(TAG_CATEGORIES).map(([cat, tags]) => (
                        <div key={cat} className="space-y-3">
                           <Label className="text-[9px] uppercase font-black tracking-widest opacity-40 block ml-2">{cat}</Label>
                           <div className="flex flex-wrap gap-1.5">
                              {tags.map(tag => {
                                const isActive = editingArtwork.tags?.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                      isActive 
                                        ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                                        : "bg-white text-muted-foreground border-black/5 hover:border-accent/40"
                                    )}
                                  >
                                    {tag}
                                  </button>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-black/5 space-y-4">
                       <Label className="text-[9px] uppercase font-black tracking-widest opacity-40 block ml-2">Geactiveerde Tags</Label>
                       <div className="flex flex-wrap gap-2">
                          {editingArtwork.tags?.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 flex items-center gap-2 bg-accent/10 text-accent border-none text-[9px] font-bold">
                              {tag}
                              <button onClick={() => toggleTag(tag)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                            </Badge>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-black/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                       <span className="text-[10px] font-bold uppercase opacity-40">Hoofdcollectie / Featured</span>
                       <Switch checked={editingArtwork.featured || false} onCheckedChange={(val) => updateArtworkField(editingId!, 'featured', val)} />
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full rounded-2xl h-14 uppercase font-bold tracking-widest text-[10px]"
                      onClick={() => {
                        if (confirm('Weet u zeker dat u dit werk wilt verwijderen uit het archief?')) {
                          const ref = doc(firestore!, 'artworks', editingId!);
                          deleteDoc(ref).then(() => setEditingId(null));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Verwijder uit Archief
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}