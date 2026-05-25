"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser, Share2, Copy, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MUSEUM_TAGS } from '@/lib/museum-utils';

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
    if (!firestore) return;
    if (filteredArtworks.length === 0) return;

    setIsSharing(true);
    const roomsCollection = collection(firestore, 'shared_rooms');
    const newRoomRef = doc(roomsCollection);
    const roomId = newRoomRef.id;
    const url = `${window.location.origin}/shared/${roomId}`;

    const roomData = {
      title: roomTitle || "Mijn Expositie",
      description: `Een samengestelde selectie door een bezoeker van Het Digitale Retrospectief.`,
      artworkIds: filteredArtworks.map(a => (a as any).id),
      createdAt: serverTimestamp(),
      lang: language
    };

    setDoc(newRoomRef, roomData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newRoomRef.path,
          operation: 'create',
          requestResourceData: roomData
        }));
      });

    setShareDialog(url);
    setIsSharing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link gekopieerd!" });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-48 px-6">
      <div className="container mx-auto max-w-5xl text-center space-y-16">
        <div className="space-y-6 animate-subtle-fade">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Expositie Samenstellen</span>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-tight">
            {t('curator_subtitle')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-4xl mx-auto italic px-4">
            {t('curator_title')}
          </p>
        </div>

        <div className="grid gap-16 text-left max-w-4xl mx-auto pt-12 border-t border-black/5 animate-subtle-fade" style={{ animationDelay: '0.2s' }}>
          {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
            <div key={cat} className="space-y-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-accent/60 border-b border-accent/10 pb-3">{cat}</h2>
              <div className="flex flex-wrap gap-3">
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
                        "px-6 py-3 rounded-2xl text-[12px] font-bold uppercase transition-all border-2", 
                        active 
                          ? "bg-accent text-accent-foreground border-accent scale-105 shadow-xl" 
                          : "bg-white hover:border-accent/40 text-foreground/70"
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

        <div className="flex flex-col items-center gap-10 pt-16 animate-subtle-fade" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap justify-center gap-6">
            <Button onClick={() => { setActiveTags([]); setShowResults(false); }} variant="outline" className="rounded-full h-16 px-12 uppercase font-black text-[11px] tracking-widest border-2">
              <Eraser className="w-4 h-4 mr-3" /> {t('curator_clear')}
            </Button>
            <Button 
              onClick={() => setShowResults(true)} 
              disabled={activeTags.length === 0} 
              className="rounded-full h-16 px-16 bg-primary text-primary-foreground uppercase font-black text-[11px] tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 mr-3 fill-current" /> {t('curator_open')}
            </Button>
            {showResults && filteredArtworks.length > 0 && (
              <Button onClick={() => setShareDialog("")} className="rounded-full h-16 px-12 bg-accent text-accent-foreground uppercase font-black text-[11px] tracking-widest shadow-2xl animate-in zoom-in duration-500">
                <Share2 className="w-4 h-4 mr-3" /> Deel Selectie
              </Button>
            )}
          </div>
          
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/40">
            {filteredArtworks.length} werken gevonden in uw selectie
          </p>
        </div>

        {showResults && (
          <div className="mt-32 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {filteredArtworks.map((item: any) => (
              <div key={item.id} className="group cursor-pointer space-y-4" onClick={() => setSelectedArtwork(item)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-black/[0.02] shadow-md transition-all duration-700 group-hover:shadow-2xl flex items-center justify-center p-4 border border-black/5">
                  <img 
                    src={item.image || item.imageUrl} 
                    className="max-w-full max-h-full object-contain transition-transform duration-[1.5s] group-hover:scale-110" 
                    style={{ filter: `brightness(${item.brightness || 1})` }} 
                    alt={item.title}
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-500">
                    <div className="p-3 rounded-full bg-white/30 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform duration-500">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-headline text-lg italic text-foreground/80 group-hover:text-accent transition-colors truncate px-2">
                    {item.displayTitle || item.title}
                  </h3>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{item.year}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={shareDialog !== null} onOpenChange={(open) => !open && setShareDialog(null)}>
        <DialogContent className="max-w-md rounded-[3rem] p-12 border-none shadow-2xl glass-panel">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic text-accent">Collectie Delen</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-[0.25em] font-black opacity-40 pt-2">
              Uw persoonlijke expositie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 pt-8">
            {shareDialog === "" ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest ml-3 opacity-60 font-black">Titel van uw zaal</Label>
                  <Input 
                    value={roomTitle} 
                    onChange={(e) => setRoomTitle(e.target.value)} 
                    placeholder="Bijv. Noord-Hollandse Luchten" 
                    className="h-16 rounded-2xl bg-black/5 border-none focus:ring-accent text-lg px-6" 
                  />
                </div>
                <Button 
                  onClick={handleShare} 
                  disabled={isSharing} 
                  className="w-full h-20 rounded-[2rem] bg-accent text-accent-foreground font-black uppercase tracking-widest text-[12px] shadow-2xl hover:scale-[1.02] transition-all"
                >
                  {isSharing ? <Loader2 className="animate-spin" /> : "Link Genereren"}
                </Button>
              </div>
            ) : shareDialog ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                 <div className="p-8 bg-black/5 rounded-3xl break-all font-mono text-[12px] border border-black/5 leading-relaxed text-accent/80 text-center">
                   {shareDialog}
                 </div>
                 <Button 
                    onClick={() => copyToClipboard(shareDialog)} 
                    className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-widest text-[12px] shadow-2xl"
                 >
                   <Copy className="w-5 h-5 mr-3" /> Kopieer Link
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
