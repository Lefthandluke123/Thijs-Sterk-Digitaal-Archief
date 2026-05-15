
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, X, Maximize2, Play, Eraser, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const STANDARD_TAGS = [
  "Groet", "Schoorl", "Hargen", "Amsterdam", "Frankrijk", 
  "Griekenland", "Olieverf", "Aquarel", "Monumentaal", "Glas in lood",
  "Bloemen", "Dieren", "Water", "Portretten"
];

export default function CuratorPage() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [visitorId, setVisitorId] = useState<string>("");
  const firestore = useFirestore();
  
  useEffect(() => {
    let vid = localStorage.getItem('ts_visitor_id');
    if (!vid) {
      vid = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('ts_visitor_id', vid);
    }
    setVisitorId(vid);
  }, []);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const allAvailableTags = useMemo(() => {
    const dbTags = new Set<string>();
    artworks?.forEach(art => {
      art.tags?.forEach((tag: string) => dbTags.add(tag));
    });
    const combined = new Set([...STANDARD_TAGS, ...Array.from(dbTags)]);
    return Array.from(combined).sort();
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    if (!artworks || activeTags.length === 0) return [];
    return artworks.filter(art => activeTags.every(tag => art.tags?.includes(tag)));
  }, [artworks, activeTags]);

  const navigateResults = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !filteredArtworks.length) return;
    const currentIndex = filteredArtworks.findIndex(art => art.id === selectedArtwork.id);
    let nextIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredArtworks.length 
      : (currentIndex - 1 + filteredArtworks.length) % filteredArtworks.length;
    setSelectedArtwork(filteredArtworks[nextIndex]);
  }, [selectedArtwork, filteredArtworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedArtwork) return;
      if (e.key === 'ArrowRight') navigateResults('next');
      if (e.key === 'ArrowLeft') navigateResults('prev');
      if (e.key === 'Escape') setSelectedArtwork(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, navigateResults]);

  const logInteraction = (type: 'view_artwork' | 'filter_tags', data: any) => {
    if (!firestore || !visitorId) return;
    const logData = { visitorId, type, ...data, timestamp: serverTimestamp() };
    addDoc(collection(firestore, 'interactions'), logData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'interactions', operation: 'create', requestResourceData: logData }));
    });
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    setShowResults(false);
  };

  return (
    <main className="min-h-screen bg-background pt-14">
      <div className="w-full bg-accent/10 border-b border-black/10 py-16 md:py-20">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 block">Uw Persoonlijke Ruimte</span>
          <h1 className="font-headline text-xl md:text-3xl font-light text-black tracking-tighter leading-tight">
            Uw Eigen <span className="italic">Zaal</span>
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-16 pb-48">
        <div className="flex flex-col items-center space-y-16">
          <div className="flex flex-wrap justify-center gap-3 max-w-5xl">
            {allAvailableTags.map(tag => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border-2 border-black",
                    isActive ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4">
            <Button onClick={() => setActiveTags([])} variant="outline" className="rounded-full h-12 px-8 text-[10px] font-black uppercase tracking-widest border-2 border-black"><Eraser className="w-3.5 h-3.5 mr-2" /> Wis</Button>
            <Button onClick={() => { setShowResults(true); logInteraction('filter_tags', { tags: activeTags }); }} disabled={activeTags.length === 0} className="rounded-full h-12 px-12 bg-black text-white text-[10px] font-black uppercase tracking-widest border-2 border-black disabled:opacity-20"><Play className="w-3.5 h-3.5 mr-2" /> Presenteer</Button>
          </div>
        </div>

        {showResults && (
          <div className="mt-24 pt-16 border-t-2 border-black">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
                {filteredArtworks.map(item => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-xl">
                      <img src={item.imageUrl} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-[1.05]" style={{ clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`, filter: `brightness(${item.brightness || 1})` }} />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 text-center"><h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{item.title}</h3></div>
                  </div>
                ))}
              </div>
            ) : <div className="py-20 text-center uppercase tracking-widest opacity-40">Geen werken gevonden.</div>}
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Viewer (85/15)</DialogTitle>
          <div className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden bg-black/5 group">
            {selectedArtwork && (
              <img src={selectedArtwork.imageUrl} className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all" style={{ clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`, filter: `brightness(${selectedArtwork.brightness || 1})` }} />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <button onClick={() => navigateResults('prev')} className="p-4 rounded-full bg-white/20 backdrop-blur-md pointer-events-auto hover:bg-white/40"><ChevronLeft className="w-8 h-8 text-black" /></button>
              <button onClick={() => navigateResults('next')} className="p-4 rounded-full bg-white/20 backdrop-blur-md pointer-events-auto hover:bg-white/40"><ChevronRight className="w-8 h-8 text-black" /></button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-white/80 rounded-full border-2 border-black hover:bg-white"><X className="w-5 h-5" /></DialogClose>
          </div>
          <div className="h-[15vh] w-full bg-white py-4 px-12 border-t-2 border-black flex flex-col items-center justify-center overflow-y-auto">
            <h2 className="font-headline text-[14px] md:text-[16px] font-light uppercase tracking-tight">{selectedArtwork?.title}</h2>
            <div className="text-[9px] md:text-[11px] uppercase font-black tracking-[0.3em] flex gap-8 opacity-90 mt-1">
              <span>{selectedArtwork?.series}</span>
              <span className="w-1 h-1 rounded-full bg-black self-center" />
              <span>{selectedArtwork?.year}</span>
              <span className="w-1 h-1 rounded-full bg-black self-center" />
              <span>{selectedArtwork?.medium}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
