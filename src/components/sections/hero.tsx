"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Maximize2, Sparkles, Layout, BookOpen } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import Link from 'next/link';

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const featuredQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'artworks'), where('featured', '==', true), limit(1));
  }, [firestore, mounted]);

  const { data: featured } = useCollection(featuredQuery);
  const artwork = featured?.[0];
  
  const heroImage = artwork?.image || artwork?.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  const heroTitle = (mounted && language !== 'nl' && siteSettings?.[`homeHeroTitle_${language}`]) 
    ? siteSettings[`homeHeroTitle_${language}`] 
    : siteSettings?.homeHeroTitle || 'Een leven gewijd aan Licht, Ruimte en Water';

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden" aria-labelledby="hero-heading">
      <div className="container mx-auto z-10 text-center">
        <h1 id="hero-heading" className="font-headline text-3xl md:text-5xl font-medium tracking-tight text-foreground mb-12 max-w-4xl mx-auto leading-[1.1]">
          {heroTitle.split(' ').map((word, i, arr) => 
            i >= arr.length - 3 ? <span key={i} className="italic text-accent">{word} </span> : word + ' '
          )}
        </h1>
        
        <div className="flex flex-col items-center justify-center gap-10">
          <Button size="lg" variant="ghost" className="rounded-full px-12 text-accent/60 hover:text-accent font-bold uppercase tracking-[0.25em] text-[10px] h-10 transition-all" asChild>
            <Link href="#about">
              <BookOpen className="mr-2 w-3 h-3" aria-hidden="true" />
              Introductie
            </Link>
          </Button>

          <div className="flex flex-col items-center justify-center gap-6 w-full max-w-sm">
            <Button variant="outline" size="lg" className="w-full rounded-full px-10 border-2 border-accent/30 text-accent hover:bg-accent/5 font-bold uppercase tracking-[0.25em] text-[11px] h-14 transition-all shadow-sm" asChild>
              <Link href="/gallery">
                <Sparkles className="mr-2 w-4 h-4" aria-hidden="true" />
                {t('hero_start_walk')}
              </Link>
            </Button>

            <div className="w-full flex flex-col items-center gap-4">
              <Button size="lg" className="w-full rounded-full px-10 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase tracking-[0.25em] text-[12px] h-16 shadow-xl transition-all scale-105 active:scale-95" asChild>
                <Link href="/curator">
                  <Layout className="mr-3 w-5 h-5" aria-hidden="true" />
                  {t('hero_your_room')}
                </Link>
              </Button>
              
              <div className="animate-in fade-in slide-in-from-top-2 duration-1000 mt-2">
                 <p className="text-sm font-medium text-accent opacity-80 leading-relaxed max-w-xs mx-auto italic">
                   Kies uw eigen thema&apos;s en word de conservator van uw eigen archief-expositie.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-20 z-10 px-4 max-w-6xl">
        <button 
          className="relative aspect-[21/9] w-full rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] border-2 border-white/20 cursor-pointer group focus-visible:ring-4 focus-visible:ring-accent"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht" })}
          aria-label={`Bekijk werk: ${artwork?.displayTitle || artwork?.title || 'Maannacht'}`}
        >
          <Image
            src={heroImage}
            alt={artwork?.displayTitle || artwork?.title || 'Monumentaal werk van Thijs Sterk'}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white w-10 h-10 drop-shadow-2xl" aria-hidden="true" />
          </div>
        </button>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}