"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Maximize2, Sparkles, Layout } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';

export function Hero() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  // Haal settings op voor de tekst
  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const featuredQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), where('featured', '==', true), limit(1));
  }, [firestore]);

  const { data: featured } = useCollection(featuredQuery);
  const artwork = featured?.[0];
  
  const heroImage = artwork?.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  // Gebruik vertalingen indien beschikbaar
  const heroTitle = (language !== 'nl' && siteSettings?.[`homeHeroTitle_${language}`]) 
    ? siteSettings[`homeHeroTitle_${language}`] 
    : siteSettings?.homeHeroTitle || 'Een leven gewijd aan Licht, Ruimte en Water';

  const heroIntro = (language !== 'nl' && siteSettings?.[`homeHeroIntro_${language}`])
    ? siteSettings[`homeHeroIntro_${language}`]
    : siteSettings?.homeHeroIntro || `Dwaal hier op uw eigen tempo door de verschillende zalen en laat u meevoeren door de atmosfeer van de polders, de havens van Bretagne en Griekenland, en de verstilde dorpsgezichten.`;

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto z-10 text-center">
        <div className="inline-block mb-8">
          <span className="text-accent font-bold tracking-[0.4em] uppercase text-[15px] md:text-[18px] block border-b-2 border-accent/30 pb-2">
            {t('hero_subtitle')} &bull; Thijs Sterk (1913-1982)
          </span>
        </div>
        
        <h1 className="font-headline text-2xl md:text-4xl lg:text-6xl font-medium tracking-tight text-foreground mb-8 max-w-5xl mx-auto leading-[1.15]">
          {heroTitle.split(' ').map((word, i, arr) => 
            i >= arr.length - 3 ? <span key={i} className="italic font-normal">{word} </span> : word + ' '
          )}
        </h1>
        
        <div className="max-w-3xl mx-auto mb-14 space-y-6">
          <div className="text-foreground/80 text-lg md:text-xl leading-relaxed font-normal whitespace-pre-line">
            {heroIntro}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <Button size="lg" className="rounded-full px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-[0.2em] text-[12px] h-14 shadow-2xl border-2 border-white/10" asChild>
            <a href="/exhibition">
              <Sparkles className="mr-3 w-5 h-5" />
              {t('hero_start_walk')}
            </a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-12 border-2 border-foreground/20 text-foreground hover:bg-black/5 font-bold uppercase tracking-[0.2em] text-[12px] h-14 transition-all" asChild>
            <a href="/curator">
              <Layout className="mr-3 w-5 h-5" />
              {t('hero_your_room')}
            </a>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-24 z-10 px-4 max-w-6xl">
        <div 
          className="relative aspect-[21/9] w-full rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-2 border-white/10 cursor-pointer group"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht", displayTitle: "Maannacht", series: "Hoofdcollectie", year: "1954", medium: "Olieverf op doek" })}
        >
          <Image
            src={heroImage}
            alt={artwork?.displayTitle || artwork?.title || "Representatief werk van Thijs Sterk"}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
            data-ai-hint="atmospheric landscape painting"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-xl p-6 rounded-full border-2 border-white/30 shadow-2xl">
              <Maximize2 className="text-white w-10 h-10 drop-shadow-2xl" />
            </div>
          </div>
          <div className="absolute bottom-8 left-8 z-20">
            <span className="text-white font-bold text-[11px] uppercase tracking-[0.3em] bg-black/60 px-6 py-2.5 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
              Focus: {artwork?.displayTitle || "Atmosfeer"}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}