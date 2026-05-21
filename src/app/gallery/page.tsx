"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { Maximize2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { sortArtworksByTitle } from '@/lib/museum-utils';

function GalleryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
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

  const translateTerm = (text: string, category: 'series' | 'tag') => {
    if (language === 'nl' || !siteSettings) return text;
    const map = category === 'series' ? siteSettings.seriesTranslations : siteSettings.tagTranslations;
    return map?.[language]?.[text] || text;
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
    return [...unique].sort(sortArtworksByTitle);
  }, [dbArtworks]);

  const seriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    artworks.forEach(art => {
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
  }, [artworks, hiddenSeries, language, siteSettings]);

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

  const currentIndex = useMemo(() => {
    return seriesWithCounts.findIndex(s => s.name === activeSeries);
  }, [activeSeries, seriesWithCounts]);

  const prevSeries = currentIndex > 0 ? seriesWithCounts[currentIndex - 1] : null;
  const nextSeries = currentIndex < seriesWithCounts.length - 1 ? seriesWithCounts[currentIndex + 1] : null;

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

  const handleSeriesChange = (name: string) => {
    setActiveSeries(name);
    router.push(`/gallery?series=${encodeURIComponent(name)}`);
  };

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-32">
      <div className="w-full bg-secondary/5 border-b border-border/10 py-12 md:py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <h1 className="font-headline text-3xl md:text-5xl lg:text-6xl font-medium text-foreground text-center tracking-tight uppercase leading-none italic opacity-80">
            {activeSeries ? translateTerm(activeSeries, 'series') : (loading ? "Laden..." : t('gallery_select'))}
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 pb-32">
        {loading && artworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-accent/40" /></div>
        ) : (
          <>
            <div className="bg-background/90 backdrop-blur-xl sticky top-16 md:top-32 z-30 border-b border-border/20 py-8 mb-12 shadow-sm">
              <div className="flex flex-row items-center justify-center gap-6 md:gap-12">
                
                {prevSeries && (
                  <button 
                    onClick={() => handleSeriesChange(prevSeries.name)}
                    className="p-3 rounded-full hover:bg-black/5 text-accent transition-all hover:scale-110"
                    title={t('prev_room')}
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}

                <div className="flex gap-8 md:gap-12 overflow-x-auto no-scrollbar pb-2 justify-center flex-1 max-w-4xl">
                  {seriesWithCounts.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleSeriesChange(s.name)}
                      className={cn(
                        "text-[14px] md:text-[20px] font-bold uppercase tracking-[0.25em] transition-all whitespace-nowrap pb-3 border-b-2 flex items-center gap-2",
                        activeSeries === s.name ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.translatedName} <span className="opacity-40 text-[12px] md:text-[14px]">[{s.count}]</span>
                    </button>
                  ))}
                </div>

                {nextSeries && (
                  <button 
                    onClick={() => handleSeriesChange(nextSeries.name)}
                    className="p-3 rounded-full hover:bg-black/5 text-accent transition-all hover:scale-110"
                    title={t('next_room')}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
              {filteredArtworks.map((item) => (
                <article 
                  key={item.id} 
                  className="group relative cursor-pointer" 
                  onClick={() => setSelectedArtwork(item)}
                  aria-label={`Bekijk kunstwerk ${item.displayTitle || item.title}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-md">
                    <img 
                      src={item.imageUrl} 
                      alt={`Schilderij: ${item.displayTitle || item.title} - Thijs Sterk`} 
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
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors truncate">{item.displayTitle || item.title}</h3>
                    <p className="text-[7px] uppercase opacity-20 tracking-widest mt-1">{item.year || 'Zonder jaartal'}</p>
                  </div>
                </article>
              ))}
            </div>
            {filteredArtworks.length === 0 && !loading && (
              <div className="text-center py-32 opacity-20 uppercase font-bold text-[11px] tracking-widest">{t('gallery_closed')}</div>
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
    <Suspense fallback={<div className="min-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>}>
      <GalleryContent />
    </Suspense>
  );
}
