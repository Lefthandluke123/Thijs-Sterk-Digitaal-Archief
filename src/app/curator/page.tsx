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
    let vid = typeof window !== 'undefined' ? localStorage.getItem('ts_visitor_id') : null;
    if (!vid) {
      vid = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      if (typeof window !== 'undefined') localStorage.setItem('ts_visitor_id', vid);
    }
    setVisitorId(vid);
  }, []);

  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  // Deduplicatie op basis van imageUrl: Toon alleen unieke database-werken
  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    return dbArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [dbArtworks]);

  const allAvailableTags = useMemo(() => {
    const dbTags = new Set<string>();
    artworks.forEach(art => {
      art.tags?.forEach((tag: string) => dbTags.add(tag));
    });
    const combined = new Set([...STANDARD_TAGS, ...Array.from(dbTags)]);
    return Array.from(combined).sort();
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    if (activeTags.length === 0) return [];
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
      <div className="w-full bg-accent/5 border-b border-black/5 py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-2">
          <h1 className="font-headline text-[14px] md:text-[16px] font-light text-black tracking-tight leading-tight uppercase">
            Uw Eigen <span className="italic">Zaal</span>
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-12 pb-48">
        <div className="flex flex-col items-center space-y-12">
          <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl">
            {allAvailableTags.map(tag => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 border-black",
                    isActive ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4">
            <Button onClick={() => setActiveTags([])} variant="outline" className="rounded-full h-10 px-6 text-[9px] font-black uppercase tracking-widest border-2 border-black"><Eraser className="w-3 h-3 mr-2" /> Wis</Button>
            <Button onClick={() => { setShowResults(true); logInteraction('filter_tags', { tags: activeTags }); }} disabled={activeTags.length === 0} className="rounded-full h-10 px-10 bg-black text-white text-[9px] font-black uppercase tracking-widest border-2 border-black disabled:opacity-20"><Play className="w-3 h-3 mr-2" /> Presenteer</Button>
          </div>
        </div>

        {showResults && (
          <div className="mt-20 pt-12 border-t border-black/10">
            {loading && artworks.length === 0 ? <div className="flex justify-center py-20"><Loader2 className="animate-spin opacity-30" /></div> : filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {filteredArtworks.map(item => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/10 shadow-lg">
                      <img src={item.imageUrl} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-[1.05]" style={{ clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`, filter: `brightness(${item.brightness || 1})` }} />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 text-center"><h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">{item.title}</h3></div>
                  </div>
                ))}
              </div>
            ) : <div className="py-20 text-center uppercase tracking-widest opacity-30 text-[10px] font-bold">Geen werken gevonden voor deze selectie.</div>}
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Viewer (75/25)</DialogTitle>
          <div className="relative h-[75vh] w-full flex items-center justify-center overflow-hidden bg-black/5 group">
            {selectedArtwork && (
              <img src={selectedArtwork.imageUrl} className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all" style={{ clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`, filter: `brightness(${selectedArtwork.brightness || 1})` }} />
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <button onClick={() => navigateResults('prev')} className="p-4 rounded-full bg-white/20 backdrop-blur-md pointer-events-auto hover:bg-white/40"><ChevronLeft className="w-8 h-8 text-black" /></button>
              <button onClick={() => navigateResults('next')} className="p-4 rounded-full bg-white/20 backdrop-blur-md pointer-events-auto hover:bg-white/40"><ChevronRight className="w-8 h-8 text-black" /></button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-black/20 hover:bg-white/20 transition-all"><X className="w-5 h-5 opacity-40" /></DialogClose>
          </div>
          <div className="h-[25vh] w-full bg-background/95 backdrop-blur-md py-8 px-12 border-t border-black/5 flex flex-col items-center justify-center overflow-y-auto text-center">
            <h2 className="text-[10px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 mb-4">{selectedArtwork?.title}</h2>
            <div className="text-[12px] md:text-[14px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-4 justify-center items-center opacity-100">
              <span className="bg-accent/10 px-6 py-1.5 rounded-sm">Zaal: {selectedArtwork?.series}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.year}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.medium}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}