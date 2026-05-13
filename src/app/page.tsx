
"use client";

import React from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { Footer } from '@/components/sections/footer';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">A</div>
            <span className="font-headline font-medium tracking-tight text-xl hidden sm:block">Aether Canvas</span>
          </div>
          
          <div className="flex items-center gap-8">
            <a href="#portfolio" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Portfolio</a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      <Hero />
      <PortfolioGrid />
      <ArtistBio />
      <ContactForm />
      <Footer />
      <Toaster />
    </main>
  );
}
