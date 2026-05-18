
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Maximize2, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function GalleryContent() {
  const searchParams = useSearchParams();
  const initialSeriesFromUrl = searchParams.get('series');
  
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(initialSeriesFromUrl);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const firestore = useFirestore();
  
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const hiddenSeries = useMemo(() => siteSettings?.hiddenSeries || [], [siteSettings]);

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
                <div key={item.id} className="group relative cursor-pointer" onClick={() => { setSelectedArtwork(item); setIsFullScreen(false); }}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
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
                      <Maximize2 className="text-white w-6 h-6 drop-shadow-2xl" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{item.title}</h3>
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

      <Dialog open={!!selectedArtwork} onOpenChange={(open) => { if (!open) setSelectedArtwork(null); }}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Viewer</DialogTitle>
          <div 
            className={cn(
              "relative w-full flex items-center justify-center overflow-hidden bg-black/5 group transition-all duration-500 cursor-pointer",
              isFullScreen ? "h-[100vh]" : "h-[75vh]"
            )}
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
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
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all shadow-xl">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }} className="p-4 rounded-full bg-background/20 backdrop-blur-md pointer-events-auto hover:bg-background/40 transition-all shadow-xl">
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl" onClick={(e) => e.stopPropagation()}>
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>

          <div className={cn(
            "w-full bg-background/95 backdrop-blur-md py-8 px-12 border-t border-border/10 shadow-2xl flex flex-col items-center justify-center overflow-y-auto transition-all duration-500",
            isFullScreen ? "h-0 opacity-0 pointer-events-none py-0 px-0" : "h-[25vh] opacity-100"
          )}>
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-4">
              <h2 className="text-[10px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 leading-tight">
                {selectedArtwork?.title}
              </h2>
              <div className="text-[12px] md:text-[14px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-4 justify-center items-center">
                <span className="bg-accent/10 px-6 py-1.5 rounded-sm">Zaal: {selectedArtwork?.series}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.year}</span>
                <span className="hidden md:inline w-2 h-2 rounded-full bg-accent/40" />
                <span>{selectedArtwork?.medium}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
