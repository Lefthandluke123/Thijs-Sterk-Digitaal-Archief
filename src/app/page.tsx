
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
import { ChevronRight } from 'lucide-react';

export default function Home() {
  const firestore = useFirestore();
  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-32">
      <Hero />
      
      {/* Introductie Galerie */}
      <IntroductionGallery />

      {/* Dynamic Rooms Selection */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8">
            {rooms?.map((room: any) => (
              <Link 
                key={room.id} 
                href={`/room/${room.slug}`}
                className="group p-10 bg-secondary/10 rounded-[2.5rem] border border-black/5 hover:bg-secondary/20 transition-all hover:scale-[1.02]"
              >
                <h3 className="font-headline text-3xl mb-4 italic group-hover:text-accent">{room.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-light">{room.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                  Betreed Zaal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
