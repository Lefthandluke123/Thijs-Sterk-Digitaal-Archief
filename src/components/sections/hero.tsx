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

  const heroTitle = (language !== 'nl' && siteSettings?.[`homeHeroTitle_${language}`]) 
    ? siteSettings[`homeHeroTitle_${language}`] 
    : siteSettings?.homeHeroTitle || 'Een leven gewijd aan Licht, Ruimte en Water';

  const heroIntro = (language !== 'nl' && siteSettings?.[`homeHeroIntro_${language}`])
    ? siteSettings[`homeHeroIntro_${language}`]
    : siteSettings?.homeHeroIntro || `Dwaal hier op uw eigen tempo door de verschillende zalen en laat u meevoeren door de atmosfeer van de polders, de havens van Bretagne en Griekenland, en de verstilde dorpsgezichten.`;

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-32 pb-16 px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-accent/40 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[160px]" />
      </div>

      <div className="container mx-auto z-10 text-center">
        <div className="inline-block mb-10">
          <span className="text-accent font-black tracking-[0.5em] uppercase text-[16px] md:text-[20px] block border-b-2 border-accent/40 pb-3">
            {t('hero_subtitle')} &bull; Thijs Sterk (1913-1982)
          </span>
        </div>
        
        <h1 className="font-headline text-4xl md:text-7xl lg:text-8xl font-medium tracking-tight text-foreground mb-10 max-w-6xl mx-auto leading-[1.05]">
          {heroTitle.split(' ').map((word, i, arr) => 
            i >= arr.length - 3 ? <span key={i} className="italic font-normal text-accent">{word} </span> : word + ' '
          )}
        </h1>
        
        <div className="max-w-4xl mx-auto mb-16 space-y-6">
          <div className="text-foreground/90 text-xl md:text-2xl leading-relaxed font-light whitespace-pre-line">
            {heroIntro}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <Button size="lg" className="rounded-full px-16 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-[0.25em] text-[13px] h-16 shadow-2xl border-2 border-white/10 hover:scale-105 transition-all" asChild>
            <a href="/exhibition">
              <Sparkles className="mr-3 w-6 h-6" />
              {t('hero_start_walk')}
            </a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-16 border-2 border-foreground/30 text-foreground hover:bg-black/5 font-bold uppercase tracking-[0.25em] text-[13px] h-16 transition-all hover:scale-105" asChild>
            <a href="/curator">
              <Layout className="mr-3 w-6 h-6" />
              {t('hero_your_room')}
            </a>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-24 z-10 px-4 max-w-7xl">
        <div 
          className="relative aspect-[21/9] w-full rounded-[3rem] overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.4)] border-2 border-white/20 cursor-pointer group"
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
            <div className="bg-white/20 backdrop-blur-2xl p-8 rounded-full border-2 border-white/40 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-700">
              <Maximize2 className="text-white w-12 h-12 drop-shadow-2xl" />
            </div>
          </div>
          <div className="absolute bottom-10 left-10 z-20">
            <span className="text-white font-black text-[12px] uppercase tracking-[0.4em] bg-black/70 px-8 py-3.5 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl">
              Focus: {artwork?.displayTitle || "Atmosfeer"}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}