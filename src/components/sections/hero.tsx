"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Maximize2, Sparkles, Layout } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc, orderBy } from 'firebase/firestore';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import Link from 'next/link';

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
  
  const heroImage = artwork?.image || artwork?.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  const heroTitle = (language !== 'nl' && siteSettings?.[`homeHeroTitle_${language}`]) 
    ? siteSettings[`homeHeroTitle_${language}`] 
    : siteSettings?.homeHeroTitle || 'Een leven gewijd aan Licht, Ruimte en Water';

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-32 pb-16 px-4 overflow-hidden">
      <div className="container mx-auto z-10 text-center">
        <h1 className="font-headline text-4xl md:text-7xl lg:text-8xl font-medium tracking-tight text-foreground mb-10 max-w-6xl mx-auto leading-[1.05]">
          {heroTitle.split(' ').map((word, i, arr) => 
            i >= arr.length - 3 ? <span key={i} className="italic text-accent">{word} </span> : word + ' '
          )}
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <Button size="lg" className="rounded-full px-16 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-[0.25em] text-[13px] h-16 shadow-2xl transition-all" asChild>
            <Link href="/gallery">
              <Sparkles className="mr-3 w-6 h-6" />
              {t('hero_start_walk')}
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-16 border-2 border-foreground/30 text-foreground hover:bg-black/5 font-bold uppercase tracking-[0.25em] text-[13px] h-16 transition-all" asChild>
            <Link href="/curator">
              <Layout className="mr-3 w-6 h-6" />
              {t('hero_your_room')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto mt-24 z-10 px-4 max-w-7xl">
        <div 
          className="relative aspect-[21/9] w-full rounded-[3rem] overflow-hidden shadow-2xl border-2 border-white/20 cursor-pointer group"
          onClick={() => setSelectedArtwork(artwork || { imageUrl: heroImage, title: "Maannacht" })}
        >
          <Image
            src={heroImage}
            alt="Hero Image"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white w-12 h-12" />
          </div>
        </div>
      </div>

      <ArtworkViewer 
        artwork={selectedArtwork} 
        onClose={() => setSelectedArtwork(null)} 
      />
    </section>
  );
}
