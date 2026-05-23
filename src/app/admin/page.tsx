
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, deleteDoc, query, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  Plus,
  Upload,
  Mic,
  Languages,
  Image as ImageIcon,
  Users,
  LayoutDashboard
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
  "Techniek": ["Olieverf", "Aquarel", "Gouache"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' }
];

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState<string | null>(null);

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
        audioUrls: {},
        createdAt: serverTimestamp()
      });
      setEditingId(newDoc.id);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, artworkId: string) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !artworkId) return;

    setIsUploading(true);
    try {
      const fileRef = ref(storage, `artworks/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      updateArtworkField(artworkId, 'imageUrl', downloadURL);
      toast({ title: "Bestand geüpload" });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, artworkId: string, lang: string) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !artworkId) return;

    setIsUploadingAudio(lang);
    try {
      const fileRef = ref(storage, `audio/${artworkId}_${lang}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      const art = artworks.find(a => a.id === artworkId);
      const currentAudios = art?.audioUrls || {};
      updateArtworkField(artworkId, 'audioUrls', { ...currentAudios, [lang]: downloadURL });
      
      toast({ title: `Audio (${lang.toUpperCase()}) geüpload` });
    } catch (error) {
      console.error("Audio upload error:", error);
    } finally {
      setIsUploadingAudio(null);
    }
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
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Beheer Toegang</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" disabled={isVerifying} />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground">
                 {isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendel"}
              </Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-32">
      <header className="h-32 border-b border-border bg-background/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-40 px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4">
          <img src={siteSettings?.logoUrl || "/logo.png"} className="h-20 w-auto" alt="Logo" />
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <h1 className="font-headline text-3xl font-medium">{siteSettings?.siteTitle || "Digitaal Museum"}</h1>
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Curator Edition</span>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/admin/team" className="text-[11px] font-black uppercase tracking-widest text-accent flex items-center gap-2 bg-accent/10 px-6 py-3 rounded-full hover:bg-accent hover:text-accent-foreground transition-all">
            <Users className="w-4 h-4" /> Team Hub
          </Link>
          <Link href="/" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> Website
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 items-center mb-12">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <Input placeholder="Doorzoek de collectie..." className="pl-12 h-12 rounded-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
           </div>
           <div className="flex gap-2">
             <Button onClick={handleAddNew} disabled={isCreating} className="rounded-full h-12 px-8 bg-accent text-accent-foreground font-bold uppercase tracking-widest text-[10px]">
               {isCreating ? <Loader2 className="animate-spin w-4" /> : <Plus className="w-4 h-4 mr-2" />} Nieuw Schilderij
             </Button>
           </div>
        </div>

        <div className="space-y-16">
          {groupedArtworks.map((group) => (
            <div key={group.label} className="space-y-6">
              <div className="flex items-center gap-4 border-l-4 border-accent pl-4 py-1 sticky top-[136px] z-30 bg-background/80 backdrop-blur-md">
                <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-accent">{group.label}</h3>
                <div className="h-px bg-accent/20 flex-1" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {group.items.map((art: any) => (
                  <Card key={art.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all border-none shadow-md group" onClick={() => setEditingId(art.id)}>
                    <div className="aspect-square bg-muted/20 relative">
                      {art.imageUrl ? <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Palette className="w-8 h-8" /></div>}
                      {art.audioUrls && Object.keys(art.audioUrls).length > 0 && <Mic className="absolute top-2 right-2 w-3 h-3 text-accent" />}
                    </div>
                    <CardContent className="p-2 text-center bg-white">
                      <h4 className="text-[10px] font-bold uppercase truncate">{art.displayTitle || art.title}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-none w-screen h-screen p-0 flex flex-col bg-background border-none rounded-none fixed inset-0 z-[100]">
          <DialogTitle className="sr-only">Editor</DialogTitle>
          <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
            <div className="flex-1 flex flex-col bg-black/5 relative border-r border-black/5 overflow-hidden">
               <div className="h-20 border-b border-black/5 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
                  <button onClick={() => setEditingId(null)} className="p-2 hover:bg-black/5 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                  <h2 className="text-sm font-bold uppercase tracking-widest">{editingArtwork?.displayTitle || editingArtwork?.title}</h2>
                  <div className="w-10" />
               </div>
               
               <div className="flex-1 grid place-items-center p-8 overflow-hidden relative">
                  {editingArtwork?.imageUrl ? (
                    <div className="relative shadow-2xl bg-white p-4 rounded-sm border border-black/5 max-h-full">
                      <img 
                        src={editingArtwork.imageUrl} 
                        className="max-h-[75vh] w-auto object-contain block" 
                        style={{ 
                          filter: `brightness(${editingArtwork.brightness || 1})`,
                          clipPath: `inset(${editingArtwork.cropTop || 0}% ${editingArtwork.cropRight || 0}% ${editingArtwork.cropBottom || 0}% ${editingArtwork.cropLeft || 0}%)`
                        }}
                      />
                    </div>
                  ) : <div className="text-center opacity-30"><ImageIcon className="w-20 h-20 mx-auto" /><p className="text-[10px] mt-4 uppercase tracking-widest">Selecteer afbeelding</p></div>}
               </div>
            </div>

            <div className="w-full md:w-[450px] bg-white flex flex-col shadow-2xl overflow-y-auto h-full">
              {editingArtwork && (
                <div className="p-8 space-y-12 pb-32">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><Palette className="w-4 h-4 text-accent" /><h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Identiteit</h3></div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold opacity-40">Afbeelding</Label>
                         <div className="flex gap-2">
                           <Input defaultValue={editingArtwork.imageUrl || ''} onBlur={(e) => updateArtworkField(editingId!, 'imageUrl', e.target.value)} className="h-12 rounded-xl flex-1" placeholder="URL..." />
                           <div className="relative">
                             <input type="file" id="art-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, editingId!)} disabled={isUploading} />
                             <Button asChild variant="outline" className="h-12 w-12 rounded-xl p-0 cursor-pointer">{isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <label htmlFor="art-upload" className="cursor-pointer"><Upload className="w-4 h-4 text-accent" /></label>}</Button>
                           </div>
                         </div>
                      </div>
                      <Input defaultValue={editingArtwork.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} className="h-12 rounded-xl" placeholder="Publieke Titel" />
                      <Input defaultValue={editingArtwork.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} className="h-12 rounded-xl" placeholder="Zaal / Collectie" />
                      <div className="grid grid-cols-2 gap-4">
                        <Input defaultValue={editingArtwork.year || ''} onBlur={(e) => updateArtworkField(editingId!, 'year', e.target.value)} className="h-12 rounded-xl" placeholder="Jaartal" />
                        <Input defaultValue={editingArtwork.medium || ''} onBlur={(e) => updateArtworkField(editingId!, 'medium', e.target.value)} className="h-12 rounded-xl" placeholder="Techniek" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><Mic className="w-4 h-4 text-accent" /><h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Audio Narratief (5 Talen)</h3></div>
                    <div className="grid gap-3">
                      {LANGUAGES.map(lang => (
                        <div key={lang.code} className="flex items-center gap-3 bg-black/5 p-3 rounded-xl border border-black/5">
                          <span className="text-[10px] font-black w-8 text-accent">{lang.code.toUpperCase()}</span>
                          <div className="flex-1 truncate">
                             {editingArtwork.audioUrls?.[lang.code] ? <span className="text-[9px] opacity-40 italic">Audio beschikbaar</span> : <span className="text-[9px] opacity-20 italic">Geen audio</span>}
                          </div>
                          <div className="relative">
                            <input type="file" id={`audio-${lang.code}`} className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, editingId!, lang.code)} />
                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">{isUploadingAudio === lang.code ? <Loader2 className="animate-spin w-3 h-3" /> : <label htmlFor={`audio-${lang.code}`} className="cursor-pointer"><Mic className="w-3.5 h-3.5 text-accent" /></label>}</Button>
                          </div>
                          {editingArtwork.audioUrls?.[lang.code] && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive rounded-full" onClick={() => {
                              const audios = { ...editingArtwork.audioUrls };
                              delete audios[lang.code];
                              updateArtworkField(editingId!, 'audioUrls', audios);
                            }}><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><Crop className="w-4 h-4 text-accent" /><h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Beelduitsnede</h3></div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                       {['Top', 'Bottom', 'Left', 'Right'].map(side => (
                         <div key={side} className="space-y-3">
                            <Label className="text-[9px] uppercase font-black opacity-30">Uitsnede {side}</Label>
                            <Slider value={[editingArtwork[`crop${side}`] || 0]} max={50} step={1} onValueChange={([val]) => updateArtworkField(editingId!, `crop${side}`, val)} />
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-accent pl-4"><TagIcon className="w-4 h-4 text-accent" /><h3 className="text-[11px] font-bold uppercase tracking-widest text-accent">Zaal Tags (Curator)</h3></div>
                    <div className="space-y-6">
                      {Object.entries(TAG_CATEGORIES).map(([cat, tags]) => (
                        <div key={cat} className="space-y-3">
                           <Label className="text-[9px] uppercase font-black tracking-widest opacity-40 block ml-2">{cat}</Label>
                           <div className="flex flex-wrap gap-1.5">
                              {tags.map(tag => {
                                const isActive = editingArtwork.tags?.includes(tag);
                                return (
                                  <button key={tag} onClick={() => toggleTag(tag)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border", isActive ? "bg-accent text-accent-foreground border-accent" : "bg-white text-muted-foreground border-black/5 hover:border-accent/40")}>{tag}</button>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-black/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2"><span className="text-[10px] font-bold uppercase opacity-40">Hoofdcollectie</span><Switch checked={editingArtwork.featured || false} onCheckedChange={(val) => updateArtworkField(editingId!, 'featured', val)} /></div>
                    <Button variant="destructive" className="w-full rounded-2xl h-14 uppercase font-bold text-[10px]" onClick={() => { if (confirm('Verwijderen?')) deleteDoc(doc(firestore!, 'artworks', editingId!)).then(() => setEditingId(null)); }}><Trash2 className="w-4 h-4 mr-2" /> Verwijder uit Archief</Button>
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
