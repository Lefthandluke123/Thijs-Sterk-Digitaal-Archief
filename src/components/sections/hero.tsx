
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
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto z-10 text-center">
        <div className="inline-block animate-fade-in-up">
          <span className="text-accent font-black tracking-[0.4em] uppercase text-[14px] md:text-[16px] mb-6 block border-b border-accent/20 pb-2">
            {t('hero_subtitle')} &bull; Thijs Sterk (1913-1982)
          </span>
        </div>
        
        <h1 className="font-headline text-xl md:text-3xl lg:text-4xl font-light tracking-tight text-foreground mb-8 max-w-4xl mx-auto leading-[1.2] animate-fade-in-up delay-100">
          {heroTitle.split(' ').map((word, i, arr) => 
            i >= arr.length - 3 ? <span key={i} className="italic">{word} </span> : word + ' '
          )}
        </h1>
        
        <div className="max-w-3xl mx-auto mb-12 space-y-6 animate-fade-in-up delay-200">
          <div className="text-muted-foreground text-base md:text-lg leading-relaxed font-light whitespace-pre-line">
            {heroIntro}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-300">
          <Button size="lg" className="rounded-full px-10 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-[0.2em] text-[10px] h-12 shadow-xl border-2 border-black/5" asChild>
            <a href="/exhibition">
              <Sparkles className="mr-2 w-4 h-4" />
              {t('hero_start_walk')}
            </a>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-10 border-black/20 text-foreground hover:bg-black/5 font-black uppercase tracking-[0.2em] text-[10px] h-12 group transition-all" asChild>
            <a href="/curator">
              <Layout className="mr-2 w-4 h-4" />
              {t('hero_your_room')}
            </a>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-20 z-10 px-4 animate-fade-in-up delay-500 max-w-5xl">
        <div 
          className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-2xl border border-border/10 cursor-pointer group"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht", displayTitle: "Maannacht", series: "Hoofdcollectie", year: "1954", medium: "Olieverf op doek" })}
        >
          <Image
            src={heroImage}
            alt={artwork?.displayTitle || artwork?.title || "Representatief werk van Thijs Sterk"}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
            priority
            data-ai-hint="atmospheric landscape painting"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20">
              <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
            </div>
          </div>
          <div className="absolute bottom-6 left-6 z-20">
            <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em] bg-black/40 px-3 py-1.5 rounded-sm backdrop-blur-md">
              Focus: {artwork?.displayTitle || "Atmosfeer"}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}
