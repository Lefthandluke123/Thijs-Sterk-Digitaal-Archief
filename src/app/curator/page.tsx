"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, X, Maximize2, Play } from 'lucide-react';
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
    return artworks.filter(art => {
      return activeTags.every(tag => art.tags?.includes(tag));
    });
  }, [artworks, activeTags]);

  const logInteraction = (type: 'view_artwork' | 'filter_tags', data: any) => {
    if (!firestore || !visitorId) return;
    const logData = {
      visitorId,
      type,
      ...data,
      timestamp: serverTimestamp()
    };
    addDoc(collection(firestore, 'interactions'), logData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'interactions', operation: 'create', requestResourceData: logData }));
      });
  };

  const toggleTag = (tag: string) => {
    const newTags = activeTags.includes(tag) 
      ? activeTags.filter(t => t !== tag) 
      : [...activeTags, tag];
    
    setActiveTags(newTags);
    setShowResults(false);
  };

  const handlePresent = () => {
    if (activeTags.length > 0) {
      setShowResults(true);
      logInteraction('filter_tags', { tags: activeTags });
    }
  };

  const handleReset = () => {
    setActiveTags([]);
    setShowResults(false);
  };

  const handleArtworkClick = (artwork: any) => {
    setSelectedArtwork(artwork);
    logInteraction('view_artwork', { 
      artworkId: artwork.id, 
      artworkTitle: artwork.title 
    });
  };

  return (
    <main className="min-h-screen bg-background pt-14">
      <div className="w-full bg-accent/5 border-b border-border/10 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-6">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-2 block">Uw Persoonlijke Ruimte</span>
          <h1 className="font-headline text-5xl md:text-8xl font-light text-foreground tracking-tighter">
            Uw Eigen <span className="italic">Zaal</span>
          </h1>
          <div className="space-y-4 py-8">
            <p className="text-foreground text-2xl font-light leading-relaxed max-w-2xl mx-auto">
              Klik uw thema&apos;s en klik dan op presenteer selectie.
            </p>
            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.3em] font-black opacity-40">
              De X-knop (Wis Zaal) brengt u terug naar de beginstand.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-12 pb-32">
        <div className="space-y-24">
          <div className="flex flex-col items-center space-y-12">
            <div className="flex flex-wrap justify-center gap-3 md:gap-5 max-w-5xl">
              {allAvailableTags.map(tag => {
                const isPresentInDb = artworks?.some(art => art.tags?.includes(tag));
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm",
                      activeTags.includes(tag) 
                        ? "bg-primary text-primary-foreground border-primary scale-105 shadow-xl" 
                        : "bg-background text-muted-foreground border-border hover:border-accent hover:text-accent",
                      !isPresentInDb && "opacity-20 grayscale pointer-events-none"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-8">
              <Button 
                onClick={handleReset} 
                variant="ghost" 
                size="lg"
                className="rounded-full h-16 px-10 text-[11px] uppercase font-black tracking-[0.3em] text-accent/60 hover:text-accent border border-accent/20 transition-all hover:bg-accent/5"
              >
                <X className="w-5 h-5 mr-3" /> Wis Zaal
              </Button>
              
              <Button 
                onClick={handlePresent}
                disabled={activeTags.length === 0}
                size="lg"
                className="rounded-full h-16 px-16 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl transition-all active:scale-95"
              >
                <Play className="w-5 h-5 mr-3 fill-white" /> Presenteer Selectie
              </Button>
            </div>
          </div>

          <div className={cn("pt-24 border-t border-border/10 transition-all duration-1000", showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none")}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent/40" />
              </div>
            ) : filteredArtworks.length > 0 && showResults ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-12">
                {filteredArtworks.map((item) => (
                  <div key={item.id} className="group relative cursor-pointer" onClick={() => handleArtworkClick(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-lg">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-[1.05]" 
                        style={{
                          clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                          filter: `brightness(${item.brightness || 1})`
                        }}
                      />
                      <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : showResults ? (
              <div className="py-20 text-center opacity-40">
                <p className="text-lg font-light italic">Geen werken gevonden met deze combinatie van thema&apos;s.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background/98 backdrop-blur-3xl border-none rounded-none overflow-hidden">
          <div className="relative h-[67vh] w-full flex items-center justify-center overflow-hidden bg-black/5">
            {selectedArtwork && (
              <img 
                src={selectedArtwork.imageUrl} 
                alt={selectedArtwork.title} 
                className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all duration-700" 
                style={{
                  clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`,
                  filter: `brightness(${selectedArtwork.brightness || 1})`
                }}
              />
            )}
            <DialogClose className="absolute top-10 right-10 z-50 p-4 bg-background/10 backdrop-blur-md rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-8 h-8 opacity-40" />
            </DialogClose>
          </div>

          <div className="h-[33vh] w-full bg-background/95 backdrop-blur-md py-16 px-12 border-t border-border/10 shadow-2xl flex flex-col items-center justify-center overflow-y-auto">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-10">
              <DialogTitle className="font-headline text-6xl md:text-8xl font-light text-foreground tracking-tighter leading-tight uppercase">
                {selectedArtwork?.title}
              </DialogTitle>
              
              <div className="text-[14px] md:text-[16px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-6 justify-center items-center opacity-80">
                <span>{selectedArtwork?.series}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.year}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.medium}</span>
              </div>
              
              <Button variant="outline" size="lg" className="rounded-full text-[12px] font-black uppercase tracking-[0.4em] px-20 h-16 border-primary/20 mt-8 hover:bg-accent hover:text-white hover:border-accent transition-all shadow-xl active:scale-95">
                Interesse in dit werk?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
