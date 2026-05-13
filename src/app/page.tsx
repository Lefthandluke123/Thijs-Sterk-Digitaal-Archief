
"use client";

import React from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="min-h-screen bg-background pt-16">
      <Hero />
      <PortfolioGrid />
      <ArtistBio />
      <ContactForm />
      <Toaster />
    </main>
  );
}
