"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser, Share2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Litho", "Pentekening"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

export default function CuratorPage() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDialog, setShareDialog] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState("");
  
  const firestore = useFirestore();
  const { t, language } = useLanguage();
  
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    return dbArtworks.filter(art => {
      const url = (art as any).image || (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [dbArtworks]);

  const filteredArtworks = useMemo(() => {
    if (activeTags.length === 0) return [];
    return artworks.filter((art: any) => activeTags.every(tag => art.tags?.includes(tag)));
  }, [artworks, activeTags]);

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || filteredArtworks.length === 0) return;
    const currentIndex = filteredArtworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setSelectedArtwork(filteredArtworks[nextIndex]);
  }, [selectedArtwork, filteredArtworks]);

  const handleShare = () => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Systeemfout", description: "Database niet verbonden." });
      return;
    }
    
    if (filteredArtworks.length === 0) {
      toast({ variant: "destructive", title: "Lege selectie", description: "Kies eerst enkele werken om te delen." });
      return;
    }

    setIsSharing(true);
    
    const roomsCollection = collection(firestore, 'shared_rooms');
    const newRoomRef = doc(roomsCollection);
    const roomId = newRoomRef.id;
    const url = `${window.location.origin}/shared/${roomId}`;

    const roomData = {
      title: roomTitle || "Mijn Expositie",
      description: `Een gecureerde selectie door een bezoeker van Het Digitale Retrospectief.`,
      artworkIds: filteredArtworks.map(a => (a as any).id),
      createdAt: serverTimestamp(),
      lang: language
    };

    setDoc(newRoomRef, roomData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newRoomRef.path,
          operation: 'create',
          requestResourceData: roomData
        }));
      });

    setShareDialog(url);
    setIsSharing(false);
    toast({ title: t('curator_link_ready') || "Privékamer gereed!", description: "De link is direct gegenereerd." });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link gekopieerd!", description: "U kunt deze nu delen op social media." });
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-32 px-6">
      <div className="container mx-auto max-w-4xl text-center space-y-10">
        <div className="space-y-4">
          <h1 className="font-headline text-3xl md:text-5xl font-light italic text-accent">{t('curator_title')}</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-40">{t('curator_subtitle')}</p>
        </div>

        <div className="grid gap-8 text-left">
          {Object.entries(TAG_CATEGORIES).map(([cat, tags]) => (
            <div key={cat} className="space-y-4">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/60 border-b border-accent/10 pb-2">{cat}</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const active = activeTags.includes(tag);
                  return (
                    <button 
                      key={tag} 
                      onClick={() => { 
                        setActiveTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]); 
                        setShowResults(false); 
                      }} 
                      className={cn(
                        "px-4 py-2 rounded-lg text-[12px] font-bold uppercase transition-all border-2", 
                        active ? "bg-accent text-accent-foreground border-accent scale-105 shadow-md" : "bg-white hover:border-accent/40"
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

        <div className="flex flex-col items-center gap-8 pt-10">
          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={() => { setActiveTags([]); setShowResults(false); }} variant="outline" className="rounded-full h-12 px-8 uppercase font-black text-[10px]">
              <Eraser className="w-3.5 h-3.5 mr-2" /> {t('curator_clear')}
            </Button>
            <Button 
              onClick={() => setShowResults(true)} 
              disabled={activeTags.length === 0} 
              className="rounded-full h-12 px-12 bg-primary text-primary-foreground uppercase font-black text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 mr-2" /> {t('curator_open')}
            </Button>
            {showResults && filteredArtworks.length > 0 && (
              <Button onClick={() => setShareDialog("")} className="rounded-full h-12 px-8 bg-accent text-accent-foreground uppercase font-black text-[10px] shadow-lg animate-in zoom-in duration-300">
                <Share2 className="w-3.5 h-3.5 mr-2" /> Deel Expositie
              </Button>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredArtworks.map((item: any) => (
              <div key={item.id} className="group cursor-pointer space-y-3" onClick={() => setSelectedArtwork(item)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted/20 shadow-md transition-all duration-700 group-hover:shadow-xl flex items-center justify-center p-2">
                  <img 
                    src={item.image || item.imageUrl} 
                    className="max-w-full max-h-full object-contain transition-transform duration-1000 group-hover:scale-110" 
                    style={{ 
                      filter: `brightness(${item.brightness || 1})`, 
                    }} 
                    alt={item.title}
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <Maximize2 className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity truncate">
                    {item.displayTitle || item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={shareDialog !== null} onOpenChange={(open) => !open && setShareDialog(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Expositie Delen</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest font-bold opacity-60">
              Creëer een unieke link naar uw selectie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {shareDialog === "" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest ml-2 opacity-40">Titel van uw kamer</Label>
                  <Input 
                    value={roomTitle} 
                    onChange={(e) => setRoomTitle(e.target.value)} 
                    placeholder="Bijv. Licht over de Polder" 
                    className="h-12 rounded-xl bg-black/5 border-none focus:ring-accent" 
                  />
                </div>
                <Button 
                  onClick={handleShare} 
                  disabled={isSharing} 
                  className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-black uppercase tracking-widest text-[10px]"
                >
                  {isSharing ? <Loader2 className="animate-spin" /> : "Link Genereren"}
                </Button>
              </div>
            ) : shareDialog ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="p-5 bg-black/5 rounded-xl break-all font-mono text-[10px] border border-black/5 leading-relaxed text-accent">
                   {shareDialog}
                 </div>
                 <Button 
                    onClick={() => copyToClipboard(shareDialog)} 
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px]"
                 >
                   <Copy className="w-3.5 h-3.5 mr-2" /> Kopieer Link
                 </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onNext={() => navigateArtwork('next')}
        onPrev={() => navigateArtwork('prev')}
      />
    </main>
  );
}
