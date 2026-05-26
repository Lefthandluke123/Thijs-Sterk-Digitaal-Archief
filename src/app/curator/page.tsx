"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser, Share2, Copy, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MUSEUM_TAGS, normalizeArtwork } from '@/lib/museum-utils';

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
    return collection(firestore, 'artworks');
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    return dbArtworks.map(a => normalizeArtwork(a.id, a));
  }, [dbArtworks]);

  const filteredArtworks = useMemo(() => {
    if (activeTags.length === 0) return artworks;
    
    return artworks.filter((art: any) => {
      const artTags = (art.tags || []).map((t: string) => t.toLowerCase());
      return activeTags.every(tag => artTags.includes(tag.toLowerCase()));
    });
  }, [artworks, activeTags]);

  const resultCount = filteredArtworks.length;
  const hasNoResults = activeTags.length > 0 && resultCount === 0;

  const navigateArtwork = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || filteredArtworks.length === 0) return;
    const currentIndex = filteredArtworks.findIndex((a: any) => a.id === selectedArtwork.id);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setSelectedArtwork(filteredArtworks[nextIndex]);
  }, [selectedArtwork, filteredArtworks]);

  const toggleTag = (tag: string) => {
    const isActive = activeTags.includes(tag);
    if (!isActive && activeTags.length >= 4) {
      toast({ 
        variant: "destructive", 
        title: t('curator_limit_reached'),
        description: "U kunt maximaal 4 filters tegelijk combineren."
      });
      return;
    }

    setActiveTags(p => isActive ? p.filter(t => t !== tag) : [...p, tag]);
    setShowResults(false);
  };

  const handleShare = () => {
    if (!firestore || filteredArtworks.length === 0) return;

    setIsSharing(true);
    const roomsCollection = collection(firestore, 'shared_rooms');
    const newRoomRef = doc(roomsCollection);
    const roomId = newRoomRef.id;
    const url = `${window.location.origin}/shared/${roomId}`;

    const roomData = {
      title: roomTitle || "Mijn Expositie",
      description: `Een samengestelde selectie door een bezoeker van Het Digitale Retrospectief.`,
      artworkIds: filteredArtworks.map(a => a.id),
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
    <main className="min-h-screen bg-background pt-24 md:pt-32 pb-48 px-6">
      <div className="container mx-auto max-w-4xl space-y-8 md:space-y-12">
        {/* HEADER SECTION - COMPACTED */}
        <div className="text-center space-y-6 md:space-y-8 animate-subtle-fade">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl md:text-5xl font-medium tracking-tight text-foreground leading-tight">
              {t('curator_subtitle')}
            </h1>
            <p className="font-headline text-lg md:text-2xl italic text-muted-foreground opacity-60">
              Maak 1, 2, 3 of 4 keuzes
            </p>
          </div>

          {/* PRIMARY ACTION BUTTONS - TOP POSITION */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={() => setShowResults(true)} 
                disabled={activeTags.length === 0 || hasNoResults}
                className="rounded-full h-14 md:h-16 px-8 md:px-12 bg-primary text-primary-foreground uppercase font-black text-[10px] md:text-[11px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
              >
                <Play className="w-4 h-4 mr-3 fill-current" /> {t('curator_open')}
              </Button>
              <Button 
                onClick={() => { setActiveTags([]); setShowResults(false); }} 
                variant="outline" 
                className="rounded-full h-14 md:h-16 px-8 md:px-12 uppercase font-black text-[10px] md:text-[11px] tracking-widest border-2 hover:bg-black/5"
              >
                <Eraser className="w-4 h-4 mr-3" /> {t('curator_clear')}
              </Button>
            </div>

            {/* LIVE FEEDBACK COUNTER */}
            <div className="min-h-[24px]">
               {activeTags.length > 0 ? (
                 <div className="flex flex-col items-center gap-2 animate-in fade-in duration-500">
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                      hasNoResults ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                    )}>
                      {hasNoResults ? (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          Geen resultaten gevonden
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {resultCount} {resultCount === 1 ? 'schilderij' : 'schilderijen'} gevonden
                        </>
                      )}
                    </div>
                    {hasNoResults && (
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Probeer een andere combinatie</p>
                    )}
                 </div>
               ) : (
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent opacity-40">
                   {t('curator_counter').replace('{count}', '0')}
                 </p>
               )}
            </div>
          </div>
        </div>

        {/* TAGS SELECTION BLOCK - MUCH COMPACTER */}
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/60 shadow-lg space-y-10 md:space-y-12 animate-subtle-fade">
          {Object.entries(MUSEUM_TAGS).map(([cat, tags]) => (
            <div key={cat} className="space-y-4 md:space-y-6">
              <h2 className="font-headline text-2xl md:text-3xl italic text-foreground/70 border-l-4 border-accent/20 pl-5 leading-none">
                {cat}
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const active = activeTags.includes(tag);
                  const atLimit = activeTags.length >= 4 && !active;
                  return (
                    <button 
                      key={tag} 
                      onClick={() => toggleTag(tag)} 
                      disabled={atLimit}
                      className={cn(
                        "px-4 md:px-5 py-2.5 md:py-3 rounded-xl text-[10px] md:text-[11px] font-bold uppercase transition-all border-2", 
                        active 
                          ? "bg-accent text-accent-foreground border-accent shadow-md scale-105" 
                          : "bg-white border-black/5 text-foreground/50 hover:border-accent/30",
                        atLimit && "opacity-20 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {active && <CheckCircle2 className="w-3 h-3" />}
                        {tag}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* RESULTS GRID - ONLY SHOW IF COUNT > 0 */}
        {showResults && !hasNoResults && (
          <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {filteredArtworks.map((item: any) => (
              <div key={item.id} className="group cursor-pointer space-y-3 md:space-y-4" onClick={() => setSelectedArtwork(item)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl md:rounded-[2rem] bg-black/[0.02] shadow-md transition-all duration-[1000ms] group-hover:shadow-xl flex items-center justify-center p-3 border border-black/5">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      className="max-w-full max-h-full object-contain transition-transform duration-[1000ms] group-hover:scale-110" 
                      style={{ filter: `brightness(${item.brightness || 1})` }} 
                      alt={item.title}
                    />
                  ) : (
                    <Filter className="w-10 h-10 opacity-10" />
                  )}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-500">
                    <div className="p-3 rounded-full bg-white/30 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform duration-500">
                      <Maximize2 className="text-white w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-headline text-sm md:text-base italic text-foreground/80 group-hover:text-accent transition-colors truncate px-2">
                    {item.displayTitle || item.title}
                  </h3>
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-40">{item.year}</p>
                </div>
              </div>
            ))}

            <div className="col-span-full pt-8 flex justify-center">
               <Button onClick={() => setShareDialog("")} className="rounded-full h-14 md:h-16 px-10 md:px-12 bg-accent text-accent-foreground uppercase font-black text-[10px] md:text-[11px] tracking-widest shadow-xl animate-in zoom-in duration-500">
                  <Share2 className="w-4 h-4 mr-3" /> Deel Selectie
               </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={shareDialog !== null} onOpenChange={(open) => !open && setShareDialog(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 md:p-12 border-none shadow-2xl glass-panel">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic text-accent">Collectie Delen</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-[0.25em] font-black opacity-40 pt-2">
              Uw persoonlijke expositie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 md:space-y-8 pt-6 md:pt-8">
            {shareDialog === "" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest ml-3 opacity-60 font-black">Titel van uw zaal</Label>
                  <Input 
                    value={roomTitle} 
                    onChange={(e) => setRoomTitle(e.target.value)} 
                    placeholder="Bijv. Noord-Hollandse Luchten" 
                    className="h-14 md:h-16 rounded-2xl bg-black/5 border-none focus:ring-accent text-base md:text-lg px-6" 
                  />
                </div>
                <Button 
                  onClick={handleShare} 
                  disabled={isSharing} 
                  className="w-full h-16 md:h-20 rounded-[2rem] bg-accent text-accent-foreground font-black uppercase tracking-widest text-[11px] md:text-[12px] shadow-xl hover:scale-[1.02] transition-all"
                >
                  {isSharing ? <Loader2 className="animate-spin" /> : "Link Genereren"}
                </Button>
              </div>
            ) : shareDialog ? (
              <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
                 <div className="p-6 md:p-8 bg-black/5 rounded-3xl break-all font-mono text-[11px] md:text-[12px] border border-black/5 leading-relaxed text-accent/80 text-center">
                   {shareDialog}
                 </div>
                 <Button 
                    onClick={() => copyToClipboard(shareDialog)} 
                    className="w-full h-16 md:h-20 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] md:text-[12px] shadow-xl"
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
