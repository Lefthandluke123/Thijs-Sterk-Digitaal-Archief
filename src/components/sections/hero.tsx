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
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-32 pb-24 px-4 overflow-hidden" aria-labelledby="hero-heading">
      <div className="container max-w-5xl mx-auto z-10 text-center space-y-12">
        <div className="space-y-6 animate-subtle-fade">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
            <BookOpen className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Het Digitale Retrospectief</span>
          </div>
          <h1 id="hero-heading" className="font-headline text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
            {heroTitle.split(' ').map((word, i, arr) => 
              i >= arr.length - 3 ? <span key={i} className="italic text-accent">{word} </span> : word + ' '
            )}
          </h1>
        </div>
        
        <div className="flex flex-col items-center gap-10 animate-subtle-fade" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl">
            <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[240px] h-16 rounded-full border-2 border-accent/20 text-accent hover:bg-accent/5 font-black uppercase tracking-[0.2em] text-[11px] transition-all" asChild>
              <Link href="/gallery">
                <Sparkles className="mr-3 w-4 h-4" />
                {t('hero_start_walk')}
              </Link>
            </Button>

            <Button size="lg" className="w-full sm:w-auto min-w-[240px] h-16 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all hover:scale-105 active:scale-95" asChild>
              <Link href="/curator">
                <Layout className="mr-3 w-4 h-4" />
                {t('hero_your_room')}
              </Link>
            </Button>
          </div>
          
          <p className="text-sm font-medium text-accent/60 leading-relaxed max-w-sm mx-auto italic px-6">
            Kies uw eigen thema&apos;s en word de conservator van uw eigen archief-expositie.
          </p>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto mt-24 z-10 px-4 animate-subtle-fade" style={{ animationDelay: '0.4s' }}>
        <button 
          className="relative aspect-[21/10] md:aspect-[21/9] w-full rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-white/20 cursor-pointer group focus-visible:ring-4 focus-visible:ring-accent"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht" })}
          aria-label={`Bekijk werk: ${artwork?.displayTitle || artwork?.title || 'Maannacht'}`}
        >
          <Image
            src={heroImage}
            alt={artwork?.displayTitle || artwork?.title || 'Monumentaal werk van Thijs Sterk'}
            fill
            className="object-cover transition-transform duration-[2s] group-hover:scale-110"
            priority
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center">
            <div className="p-5 rounded-full bg-white/30 backdrop-blur-xl border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-500">
              <Maximize2 className="text-white w-10 h-10 drop-shadow-2xl" />
            </div>
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
