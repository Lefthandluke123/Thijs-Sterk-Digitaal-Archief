"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Monumentaal", "Glas in lood"],
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
  const { t, language } = useLanguage();
  
  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const translateTerm = (text: string, category: 'tag' | 'tagcat' | 'series') => {
    if (language === 'nl' || !siteSettings) return text;
    const mapField = category === 'series' ? 'seriesTranslations' : (category === 'tag' ? 'tagTranslations' : 'tagCatTranslations');
    const map = siteSettings[mapField];
    return map?.[language]?.[text] || text;
  };

  useEffect(() => {
    let vid = typeof window !== 'undefined' ? localStorage.getItem('ts_visitor_id') : null;
    if (!vid) {
      vid = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ts_visitor_id', vid);
        } catch (e) {
          console.warn("Storage restricted in private mode");
        }
      }
    }
    setVisitorId(vid || "anonymous");
  }, []);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    return dbArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [dbArtworks]);

  const otherTags = useMemo(() => {
    const dbTags = new Set<string>();
    artworks.forEach((art: any) => {
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
    return artworks.filter((art: any) => activeTags.every(tag => art.tags?.includes(tag)));
  }, [artworks, activeTags]);

  const navigateResults = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !filteredArtworks.length) return;
    const currentIndex = filteredArtworks.findIndex(art => (art as any).id === selectedArtwork.id);
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
    addDoc(collection(firestore, 'interactions'), logData).catch(() => {});
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    setShowResults(false);
  };

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-32">
      <div className="w-full bg-secondary/10 border-b border-border/20 py-12 md:py-20">
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-4">
          <h1 className="font-headline text-4xl md:text-6xl font-medium text-foreground tracking-tight leading-none uppercase">
            {t('curator_title').split(' ').map((word, i, arr) => 
              i === arr.length - 1 ? <span key={i} className="italic text-accent">{word}</span> : word + ' '
            )}
          </h1>
          <p className="text-[10px] md:text-[13px] font-bold uppercase tracking-[0.4em] text-accent/60 pt-4">{t('curator_subtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-12 pb-48">
        <div className="flex flex-col items-center space-y-12">
          
          <div className="w-full max-w-5xl space-y-10">
            {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent whitespace-nowrap">{translateTerm(category, 'tag')}</h2>
                  <div className="h-px bg-border flex-1 opacity-40" />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {tags.map(tag => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-5 py-2.5 rounded-lg text-[13px] md:text-[15px] font-bold uppercase tracking-wider transition-all border-2",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                            : "bg-background text-foreground border-border hover:border-accent hover:bg-accent/5"
                        )}
                      >
                        {translateTerm(tag, 'tag')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {otherTags.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 whitespace-nowrap">{t('curator_other')}</h2>
                  <div className="h-px bg-border flex-1 opacity-20" />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {otherTags.map(tag => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-5 py-2.5 rounded-lg text-[13px] md:text-[15px] font-bold uppercase tracking-wider transition-all border-2",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary shadow-md" 
                            : "bg-background text-foreground border-border hover:border-accent"
                        )}
                      >
                        {translateTerm(tag, 'tag')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setActiveTags([])} 
                variant="outline" 
                className="rounded-full h-12 px-8 text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-border hover:bg-accent/5 transition-all"
              >
                <Eraser className="w-3 h-3 mr-3" /> {t('curator_clear')}
              </Button>
              <Button 
                onClick={() => { setShowResults(true); logInteraction('filter_tags', { tags: activeTags }); }} 
                disabled={activeTags.length === 0} 
                className="rounded-full h-12 px-12 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.2em] border-2 border-primary shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-20"
              >
                <Play className="w-3 h-3 mr-3" /> {t('curator_open')}
              </Button>
            </div>
            {activeTags.length > 0 && !showResults && (
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent animate-pulse">
                Klik op "{t('curator_open')}" om {filteredArtworks.length} werken te bekijken
              </p>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-20 pt-16 border-t border-border/30 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {loading && artworks.length === 0 ? (
              <div className="flex justify-center py-24"><Loader2 className="animate-spin opacity-30 w-8 h-8" /></div>
            ) : filteredArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {filteredArtworks.map((item: any) => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md group-hover:shadow-xl transition-all duration-700">
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
                        <Maximize2 className="text-white w-6 h-6 drop-shadow-2xl" />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50 group-hover:text-accent transition-all leading-relaxed">
                        {item.displayTitle || item.title}
                      </h3>
                      <p className="text-[7px] uppercase tracking-widest opacity-30 mt-1">{item.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center uppercase tracking-[0.4em] opacity-30 text-[11px] font-bold">
                {t('curator_no_results')}
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
