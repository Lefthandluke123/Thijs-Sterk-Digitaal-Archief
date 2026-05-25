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
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-40 pb-32 px-6 overflow-hidden bg-background" aria-labelledby="hero-heading">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      
      <div className="container max-w-5xl mx-auto z-10 text-center space-y-16">
        <div className="space-y-8 animate-subtle-fade">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-accent/5 border border-accent/10 mx-auto shadow-sm">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-accent">Mondiaal Retrospectief</span>
          </div>
          <h1 id="hero-heading" className="font-headline text-5xl md:text-8xl font-medium tracking-tight text-foreground leading-[1.05]">
            {heroTitle.split(' ').map((word, i, arr) => 
              i >= arr.length - 3 ? <span key={i} className="italic text-accent font-light"> {word}</span> : word + ' '
            )}
          </h1>
        </div>
        
        <div className="flex flex-col items-center gap-12 animate-subtle-fade" style={{ animationDelay: '0.3s' }}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-2xl">
            <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[280px] h-20 rounded-full border-2 border-accent/20 text-accent hover:bg-accent/5 font-black uppercase tracking-[0.25em] text-[12px] transition-all shadow-md hover:shadow-xl" asChild>
              <Link href="/gallery">
                <Sparkles className="mr-4 w-5 h-5" />
                {t('hero_start_walk')}
              </Link>
            </Button>

            <Button size="lg" className="w-full sm:w-auto min-w-[280px] h-20 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-[0.25em] text-[12px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.03] active:scale-95" asChild>
              <Link href="/curator">
                <Layout className="mr-4 w-5 h-5" />
                {t('hero_your_room')}
              </Link>
            </Button>
          </div>
          
          <p className="text-lg md:text-xl font-light text-accent/70 leading-relaxed max-w-xl mx-auto italic px-10 border-l-2 border-accent/10">
            Ontdek de verstilde kracht van het Noord-Hollandse landschap door de ogen van een meester.
          </p>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto mt-32 z-10 px-6 animate-subtle-fade" style={{ animationDelay: '0.6s' }}>
        <button 
          className="relative aspect-[21/10] md:aspect-[21/8] w-full rounded-[4rem] overflow-hidden shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)] border border-white/60 cursor-pointer group focus-visible:ring-4 focus-visible:ring-accent"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht" })}
          aria-label={`Bekijk werk: ${artwork?.displayTitle || artwork?.title || 'Maannacht'}`}
        >
          <Image
            src={heroImage}
            alt={artwork?.displayTitle || artwork?.title || 'Monumentaal werk van Thijs Sterk'}
            fill
            className="object-cover transition-transform duration-[3s] group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 flex items-center justify-center">
            <div className="p-8 rounded-full bg-white/20 backdrop-blur-2xl border border-white/40 scale-90 group-hover:scale-100 transition-transform duration-700">
              <Maximize2 className="text-white w-12 h-12 drop-shadow-2xl" />
            </div>
          </div>
          <div className="absolute bottom-10 left-10 text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Highlight</p>
             <h3 className="font-headline text-2xl italic">{artwork?.displayTitle || artwork?.title || "Maannacht"}</h3>
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
