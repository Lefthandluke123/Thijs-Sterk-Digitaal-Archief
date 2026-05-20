
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

function GalleryContent() {
  const searchParams = useSearchParams();
  const initialSeriesFromUrl = searchParams.get('series');
  
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(initialSeriesFromUrl);
  const firestore = useFirestore();
  
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const hiddenSeries = useMemo(() => siteSettings?.hiddenSeries || [], [siteSettings]);

  const parseTitleForSort = (title: string) => {
    if (!title) return { romanVal: 999, num: 999, suffix: '' };
    const romanMatch = title.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/i);
    const numMatch = title.match(/(\d+)([a-z]*)?/i);
    return {
      romanVal: romanMatch ? (ROMAN_VALUES[romanMatch[1].toUpperCase()] || 999) : 999,
      num: numMatch ? parseInt(numMatch[1], 10) : 999,
      suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
    };
  };

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    
    const seen = new Set();
    const unique = dbArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    return [...unique].sort((a: any, b: any) => {
      const pA = parseTitleForSort(a.title || '');
      const pB = parseTitleForSort(b.title || '');
      if (pA.romanVal !== pB.romanVal) return pA.romanVal - pB.romanVal;
      if (pA.num !== pB.num) return pA.num - pB.num;
      return pA.suffix.localeCompare(pB.suffix);
    });
  }, [dbArtworks]);

  const seriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    artworks.forEach(art => {
      const name = art.series || "Geen zaal";
      if (!hiddenSeries.includes(name)) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artworks, hiddenSeries]);

  useEffect(() => {
    const s = searchParams.get('series');
    if (s) {
      if (hiddenSeries.includes(s)) {
        setActiveSeries(seriesWithCounts.length > 0 ? seriesWithCounts[0].name : null);
      } else {
        setActiveSeries(s);
      }
    } else if (seriesWithCounts.length > 0 && !activeSeries) {
      setActiveSeries(seriesWithCounts[0].name);
    }
  }, [searchParams, seriesWithCounts, activeSeries, hiddenSeries]);

  const filteredArtworks = useMemo(() => {
    if (!activeSeries || hiddenSeries.includes(activeSeries)) return [];
    return artworks.filter(art => (art.series || "Geen zaal") === activeSeries);
  }, [artworks, activeSeries, hiddenSeries]);

  const navigateGallery = useCallback((direction: 'next' | 'prev') => {
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
      if (e.key === 'ArrowRight') navigateGallery('next');
      if (e.key === 'ArrowLeft') navigateGallery('prev');
      if (e.key === 'Escape') setSelectedArtwork(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, navigateGallery]);

  return (
    <main className="min-h-screen bg-background pt-14">
      <div className="w-full bg-secondary/5 border-b border-border/10 py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <h1 className="font-headline text-[14px] md:text-[16px] font-light text-foreground text-center tracking-tight uppercase">
            <span className="italic">{activeSeries || (loading ? "Laden..." : "Selecteer een zaal")}</span>
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 pb-32">
        {loading && artworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-accent/40" /></div>
        ) : (
          <>
            <div className="bg-background/80 backdrop-blur-md sticky top-14 z-30 border-b border-border/10 py-6 mb-12">
              <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                <div className="flex gap-10 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 justify-center">
                  {seriesWithCounts.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setActiveSeries(s.name)}
                      className={cn(
                        "text-[9px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap pb-2 border-b-2 flex items-center gap-2",
                        activeSeries === s.name ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.name} <span className="opacity-30 text-[7px]">[{s.count}]</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
              {filteredArtworks.map((item) => (
                <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedArtwork(item)}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
                    <img 
                      src={item.imageUrl} 
                      alt={item.displayTitle || item.title} 
                      className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-[1.05]"
                      style={{
                        clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)`,
                        filter: `brightness(${item.brightness || 1})`
                      }}
                    />
                    <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white w-6 h-6 drop-shadow-2xl" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{item.displayTitle || item.title}</h3>
                    <p className="text-[7px] uppercase opacity-20 tracking-widest mt-1">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredArtworks.length === 0 && !loading && (
              <div className="text-center py-32 opacity-20 uppercase font-black text-[11px] tracking-widest">Deze zaal is momenteel gesloten</div>
            )}
          </>
        )}
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onPrev={() => navigateGallery('prev')}
        onNext={() => navigateGallery('next')}
      />
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>}>
      <GalleryContent />
    </Suspense>
  );
}
