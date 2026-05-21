"use client";

import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Loader2, MousePointer2, ChevronLeft, ChevronRight, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';

function ExhibitionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const seriesParam = searchParams.get('series');
  
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const firestore = useFirestore();

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);
  const hiddenSeries = useMemo(() => siteSettings?.hiddenSeries || [], [siteSettings]);

  const translateTerm = (text: string, category: 'series' | 'tag') => {
    if (language === 'nl' || !siteSettings) return text;
    const map = category === 'series' ? siteSettings.seriesTranslations : siteSettings.tagTranslations;
    return map?.[language]?.[text] || text;
  };

  const allArtworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);
  const { data: allArtworks } = useCollection(allArtworksQuery);

  const availableSeries = useMemo(() => {
    if (!allArtworks) return [];
    const counts: Record<string, number> = {};
    allArtworks.forEach(art => {
      const name = art.series || "Geen zaal";
      if (!hiddenSeries.includes(name) && name !== "Nieuwe Uploads") {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name, 
        count,
        translatedName: translateTerm(name, 'series')
      }))
      .sort((a, b) => a.translatedName.localeCompare(b.translatedName));
  }, [allArtworks, hiddenSeries, language, siteSettings]);

  const currentIndex = useMemo(() => {
    if (!seriesParam) return -1;
    return availableSeries.findIndex(s => s.name === seriesParam);
  }, [seriesParam, availableSeries]);

  const prevSeries = currentIndex > 0 ? availableSeries[currentIndex - 1] : (currentIndex === 0 ? { name: "Alles", translatedName: t('all_works') } : null);
  const nextSeries = currentIndex === -1 ? (availableSeries[0] || null) : (currentIndex < availableSeries.length - 1 ? availableSeries[currentIndex + 1] : null);

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'artworks'));
    if (seriesParam) {
      q = query(collection(firestore, 'artworks'), where('series', '==', seriesParam));
    }
    return q;
  }, [firestore, seriesParam]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    const unique dbArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    return [...unique].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  useEffect(() => {
    setScrollX(0);
  }, [seriesParam]);

  const handleStep = useCallback((delta: number) => {
    setScrollX(prev => Math.max(0, prev + delta));
  }, []);

  const navigateViewer = useCallback((direction: 'next' | 'prev') => {
    if (!selectedArtwork || !artworks.length) return;
    const idx = artworks.findIndex(art => art.id === selectedArtwork.id);
    if (idx === -1) return;
    
    let nextIdx = direction === 'next' 
      ? (idx + 1) % artworks.length 
      : (idx - 1 + artworks.length) % artworks.length;
    
    setSelectedArtwork(artworks[nextIdx]);
  }, [selectedArtwork, artworks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArtwork) {
        if (e.key === 'ArrowRight') navigateViewer('next');
        if (e.key === 'ArrowLeft') navigateViewer('prev');
        if (e.key === 'Escape') setSelectedArtwork(null);
      } else {
        if (e.key === 'ArrowRight') handleStep(600);
        if (e.key === 'ArrowLeft') handleStep(-600);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, handleStep, navigateViewer]);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (selectedArtwork) return;
      setScrollX(prev => {
        const next = prev + e.deltaY + e.deltaX;
        return Math.max(0, next);
      });
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [selectedArtwork]);

  const handleSeriesChange = (name: string) => {
    if (name === "Alles") {
      router.push('/exhibition');
    } else {
      router.push(`/exhibition?series=${encodeURIComponent(name)}`);
    }
  };

  if (loading && artworks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-white overflow-hidden flex flex-col relative pt-16 md:pt-32">
      <div className="absolute inset-0 bg-[#fafafa] pointer-events-none" />
      
      <div className="absolute top-4 md:top-10 left-0 right-0 z-40 flex justify-center px-6">
        <div className="flex items-center gap-2">
          {prevSeries && (
            <button 
              onClick={() => handleSeriesChange(prevSeries.name)}
              className="p-3 rounded-full bg-white/80 backdrop-blur-md border border-black/10 hover:bg-white transition-all shadow-md group"
              title={t('prev_room')}
            >
              <ArrowLeft className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
            </button>
          )}

          <div className="bg-white/80 backdrop-blur-md border border-black/10 rounded-full px-8 py-3 flex items-center gap-8 shadow-md hover:shadow-xl transition-all max-w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-3 border-r border-black/10 pr-6 mr-2 hidden md:flex">
              <Layers className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('viewer_room')}</span>
            </div>
            <button 
              onClick={() => handleSeriesChange("Alles")}
              className={cn(
                "text-[11px] md:text-[13px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors",
                !seriesParam ? "text-accent" : "text-black/50 hover:text-black"
              )}
            >
              {t('all_works')}
            </button>
            {availableSeries.map(s => (
              <button 
                key={s.name}
                onClick={() => handleSeriesChange(s.name)}
                className={cn(
                  "text-[11px] md:text-[13px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors",
                  seriesParam === s.name ? "text-accent" : "text-black/50 hover:text-black"
                )}
              >
                {s.translatedName} <span className="opacity-30 text-[9px] ml-1">[{s.count}]</span>
              </button>
            ))}
          </div>

          {nextSeries && (
            <button 
              onClick={() => handleSeriesChange(nextSeries.name)}
              className="p-3 rounded-full bg-white/80 backdrop-blur-md border border-black/10 hover:bg-white transition-all shadow-md group"
              title={t('next_room')}
            >
              <ArrowRight className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="absolute top-24 md:top-40 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none opacity-90 w-full px-4">
        <span className="text-accent font-black tracking-[0.4em] uppercase text-[10px] md:text-[12px] block mb-2">{t('hero_subtitle')}</span>
        <h1 className="text-black/70 font-headline text-3xl md:text-5xl lg:text-6xl font-medium italic leading-tight tracking-tight">
          {seriesParam ? translateTerm(seriesParam, 'series') : t('all_works')}
        </h1>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <div 
          className="relative w-full h-full flex items-center transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(${-scrollX}px)` }}
        >
          <div className="absolute bottom-0 left-[-10000px] right-[-10000px] h-[32vh] bg-[#f9f9f9] z-0">
             <div className="absolute top-0 left-0 right-0 h-px bg-black/[0.03]" />
             <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
             <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/[0.02] to-transparent" />
          </div>

          <div className="flex gap-[40vw] px-[50vw] items-center pt-8">
            {artworks.map((art) => (
              <div 
                key={art.id} 
                className="relative group shrink-0"
              >
                <div 
                  className="relative flex flex-col bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.05)] border border-black/[0.03] cursor-pointer transition-all duration-700 hover:scale-[1.01] hover:shadow-xl"
                  onClick={() => setSelectedArtwork(art)}
                >
                  <div className="p-8 pb-4">
                    <img 
                      src={art.imageUrl} 
                      alt={art.displayTitle || art.title}
                      className="max-h-[45vh] md:max-h-[50vh] w-auto object-contain block mx-auto"
                      style={{
                        clipPath: `inset(${art.cropTop || 0}% ${art.cropRight || 0}% ${art.cropBottom || 0}% ${art.cropLeft || 0}%)`,
                        filter: `brightness(${art.brightness || 1})`
                      }}
                    />
                  </div>
                  
                  <div className="px-8 py-6 border-t border-black/[0.03] bg-white">
                    <h3 className="text-black text-[9px] font-black uppercase tracking-[0.2em] mb-1 truncate">{art.displayTitle || art.title}</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-accent text-[8px] font-bold uppercase tracking-widest">{art.year}</span>
                       <span className="w-1 h-1 rounded-full bg-black/10" />
                       <span className="text-black/30 text-[8px] font-bold uppercase tracking-widest">{art.medium}</span>
                       <span className="w-1 h-1 rounded-full bg-black/10" />
                       <span className="text-black/10 text-[7px] font-bold uppercase tracking-[0.2em]">{art.title}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-10 left-10 right-10 h-4 bg-black/[0.02] blur-xl rounded-full" />
              </div>
            ))}

            <div className="shrink-0 w-[50vw] flex flex-col items-center justify-center text-center opacity-40 group hover:opacity-100 transition-opacity">
               <div className="w-px h-24 bg-black/10 mb-6" />
               <h4 className="text-[11px] font-black uppercase tracking-[0.5em]">{t('end_of_room')}</h4>
               <p className="text-[8px] mt-2 uppercase tracking-widest">{t('footer_rights')}</p>
               
               {nextSeries && (
                 <button 
                  onClick={() => handleSeriesChange(nextSeries.name)}
                  className="mt-12 px-10 py-4 rounded-full bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-[0.25em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                 >
                   {t('next_room')}: {nextSeries.translatedName} <ArrowRight className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 z-30 flex flex-col items-center gap-6 pointer-events-none">
        <div className="flex items-center gap-12 md:gap-24 pointer-events-auto">
          <button 
            onClick={() => handleStep(-1000)}
            className="p-6 md:p-10 rounded-full bg-white/40 backdrop-blur-md border border-black/5 text-black/30 hover:text-accent hover:border-accent/20 transition-all active:scale-90 shadow-xl group"
          >
            <ChevronLeft className="w-12 h-12 md:w-20 md:h-20 transition-transform group-hover:-translate-x-1" />
          </button>
          
          <div className="flex flex-col items-center gap-2">
             <div className="flex items-center gap-2 text-black/20">
                <MousePointer2 className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em]">{t('viewer_unknown')}</span>
             </div>
             <div className="w-48 h-0.5 bg-black/5 relative overflow-hidden rounded-full">
                <div 
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, (scrollX / Math.max(1, artworks.length * 700)) * 100)}%` }}
                />
             </div>
          </div>

          <button 
            onClick={() => handleStep(1000)}
            className="p-6 md:p-10 rounded-full bg-white/40 backdrop-blur-md border border-black/5 text-black/30 hover:text-accent hover:border-accent/20 transition-all active:scale-90 shadow-xl group"
          >
            <ChevronRight className="w-12 h-12 md:w-20 md:h-20 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
        onPrev={() => navigateViewer('prev')}
        onNext={() => navigateViewer('next')}
      />
    </main>
  );
}

export default function ExhibitionPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>}>
      <ExhibitionContent />
    </Suspense>
  );
}