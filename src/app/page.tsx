
"use client";

import React, { useState, useEffect } from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { IntroductionGallery } from '@/components/sections/introduction-gallery';
import { Toaster } from '@/components/ui/toaster';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { ChevronRight, Layers, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

/**
 * @fileOverview Homepage van Thijs Sterk Retrospectief.
 * Bevat de secties Hero, Introductie, Zalen, Portfolio en Biografie.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gebruik useMemoFirebase om de query stabiel te houden en afhankelijk te maken van hydration
  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, mounted]);

  // Hook onvoorwaardelijk aanroepen; useCollection handelt null query intern af
  const roomsResult = useCollection(roomsQuery);
  const rooms = roomsResult.data || [];

  // Debugging logs zoals gevraagd in de prompt
  useEffect(() => {
    if (mounted) {
      console.log("firestore", firestore);
      console.log("roomsQuery", roomsQuery);
      console.log("rooms", rooms);
    }
  }, [mounted, firestore, roomsQuery, rooms]);

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

          <div className="grid md:grid-cols-3 gap-8">
            {!mounted || roomsResult.loading ? (
               <div className="col-span-full flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-accent/20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Zalen laden...</p>
               </div>
            ) : rooms.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[3rem] opacity-20 italic">
                 Geen zalen gevonden in de collectie.
              </div>
            ) : (
              rooms.map((room: any) => (
                <Link 
                  key={room.id} 
                  href={`/room/${room.slug}`}
                  className="group p-10 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-black/5 hover:bg-white hover:shadow-2xl transition-all hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-accent"
                >
                  <h3 className="font-headline text-3xl mb-4 italic group-hover:text-accent transition-colors">{room.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-light">{room.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                    Betreed Zaal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </Link>
              ))
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
