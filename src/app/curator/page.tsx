"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ArtworkViewer } from '@/components/artwork-viewer';

const TAG_CATEGORIES = {
  "Techniek": ["Olieverf", "Aquarel", "Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

const FLAT_STANDARD_TAGS = Object.values(TAG_CATEGORIES).flat();

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

  const otherTags = useMemo(() => {
    const dbTags = new Set<string>();
    artworks.forEach(art => {
      art.tags?.forEach((tag: string) => {
        if (!FLAT_STANDARD_TAGS.includes(tag)) {
          dbTags.add(tag);
        }
      });
    });
    return Array.from(dbTags).sort();
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
      <div className="w-full bg-secondary/10 border-b border-border/20 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-4">
          <h1 className="font-headline text-3xl md:text-5xl font-light text-foreground tracking-tight leading-tight uppercase">
            Uw Eigen <span className="italic">Zaal</span>
          </h1>
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-accent/80">Stel uw persoonlijke selectie samen uit het oeuvre</p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-16 pb-48">
        <div className="flex flex-col items-center space-y-20">
          
          <div className="w-full max-w-5xl space-y-16">
            {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category} className="space-y-6">
                <div className="flex items-center gap-6">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-accent whitespace-nowrap">{category}</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {tags.map(tag => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-7 py-3.5 rounded-xl text-[13px] md:text-[15px] font-bold uppercase tracking-wider transition-all border-2",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                            : "bg-background text-foreground border-border hover:border-accent hover:bg-accent/5"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {otherTags.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-40 whitespace-nowrap">Overig</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {otherTags.map(tag => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-7 py-3.5 rounded-xl text-[13px] md:text-[15px] font-bold uppercase tracking-wider transition-all border-2",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                            : "bg-background text-foreground border-border hover:border-accent hover:bg-accent/5"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-10">
            <div className="flex flex-col sm:flex-row gap-6">
              <Button 
                onClick={() => setActiveTags([])} 
                variant="outline" 
                className="rounded-full h-14 px-10 text-[11px] font-black uppercase tracking-[0.2em] border-2 border-border hover:bg-accent/5 transition-all"
              >
                <Eraser className="w-4 h-4 mr-3" /> Wis Selectie
              </Button>
              <Button 
                onClick={() => { setShowResults(true); logInteraction('filter_tags', { tags: activeTags }); }} 
                disabled={activeTags.length === 0} 
                className="rounded-full h-14 px-14 bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-[0.2em] border-2 border-primary shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-20"
              >
                <Play className="w-4 h-4 mr-3" /> Open Uw Zaal
              </Button>
            </div>
            {activeTags.length > 0 && !showResults && (
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent animate-pulse">
                Klik op &quot;Open Uw Zaal&quot; om {filteredArtworks.length} werken te bekijken
              </p>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-32 pt-20 border-t border-border/30 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {loading && artworks.length === 0 ? (
              <div className="flex justify-center py-32"><Loader2 className="animate-spin opacity-30 w-10 h-10" /></div>
            ) : filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-12">
                {filteredArtworks.map(item => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-xl group-hover:shadow-2xl transition-all duration-700">
                      <img 
                        src={item.imageUrl} 
                        className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-[1.1]" 
                        style={{ 
                          clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`, 
                          filter: `brightness(${item.brightness || 1})` 
                        }} 
                        alt={item.displayTitle || item.title}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50 group-hover:text-accent transition-all leading-relaxed">
                        {item.displayTitle || item.title}
                      </h3>
                      <p className="text-[8px] uppercase tracking-widest opacity-30 mt-1">{item.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center uppercase tracking-[0.4em] opacity-30 text-[12px] font-bold">
                Geen werken gevonden voor deze unieke combinatie.
              </div>
            )}
          </div>
        )}
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onPrev={() => navigateResults('prev')}
        onNext={() => navigateResults('next')}
      />
    </main>
  );
}
