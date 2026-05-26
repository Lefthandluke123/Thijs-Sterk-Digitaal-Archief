
"use client";

import React from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { IntroductionGallery } from '@/components/sections/introduction-gallery';
import { Toaster } from '@/components/ui/toaster';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export default function Home() {
  const firestore = useFirestore();
  const { t } = useLanguage();

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

  return (
    <main className="min-h-screen bg-transparent pt-16 md:pt-32 relative">
      <Hero />
      <IntroductionGallery />

      <section className="py-24 px-4 bg-secondary/5" aria-labelledby="rooms-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20 space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{t('homeRoomsBadge')}</span>
            </div>
            <h2 id="rooms-heading" className="font-headline text-4xl md:text-5xl font-light italic text-foreground">
              {t('homeRoomsTitle')}
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              {t('homeRoomsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {rooms?.map((room: any) => (
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
            ))}
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
