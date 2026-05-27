"use client";

import React, { useMemo } from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { IntroductionGallery } from '@/components/sections/introduction-gallery';
import { Toaster } from '@/components/ui/toaster';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

/**
 * @fileOverview Homepage van Thijs Sterk Retrospectief.
 * Geoptimaliseerd voor stabiele rendering en robuuste navigatie.
 */
export default function Home() {
  const firestore = useFirestore();
  const { t } = useLanguage();

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: rooms, loading } = useCollection(roomsQuery);

  return (
    <main className="min-h-screen bg-transparent pt-16 md:pt-32 relative">
      <Hero />
      <IntroductionGallery />

      <section className="py-24 px-4 bg-secondary/5" aria-labelledby="rooms-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20 space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
                {t('homeRoomsBadge') || 'De Rondleiding'}
              </span>
            </div>
            <h2 id="rooms-heading" className="font-headline text-4xl md:text-5xl font-light italic text-foreground">
              {t('homeRoomsTitle') || 'Thematische Zalen'}
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              {t('homeRoomsSubtitle') || 'Wandel door de zorgvuldig samengestelde collecties.'}
            </p>
          </div>

          <div className="min-h-[420px]">
            {loading ? (
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-10 rounded-[2.5rem] border border-black/5 bg-white/40 backdrop-blur-sm animate-pulse h-[280px]"
                  >
                    <div className="h-10 w-2/3 bg-black/5 rounded-xl mb-6" />
                    <div className="space-y-3 mb-8">
                      <div className="h-4 bg-black/5 rounded-lg" />
                      <div className="h-4 bg-black/5 rounded-lg w-5/6" />
                    </div>
                    <div className="h-3 w-24 bg-black/5 rounded-full" />
                  </div>
                ))}
              </div>
            ) : rooms && rooms.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {rooms.map((room: any) => (
                  <Link 
                    key={room.id} 
                    href={`/room/${room.slug || room.id}`}
                    className="group p-10 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-black/5 hover:bg-white hover:shadow-2xl transition-all hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-accent"
                  >
                    <h3 className="font-headline text-3xl mb-4 italic group-hover:text-accent transition-colors">{room.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-light">{room.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                      Betreed Zaal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-[3rem] opacity-20 italic">
                 Geen zalen gevonden in de collectie.
              </div>
            )}
          </div>
        </div>
      </section>

      <PortfolioGrid />
      <ArtistBio />
      <ContactForm />
      
      <Toaster />
    </main>
  );
}
