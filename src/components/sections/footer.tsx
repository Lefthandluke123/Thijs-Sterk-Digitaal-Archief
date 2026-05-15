"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-auto flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-full w-auto object-contain" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-t');
                if (fallback) (fallback as HTMLElement).style.display = 'block';
              }}
            />
            <div className="fallback-t hidden w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">
              T
            </div>
          </div>
          <span className="font-headline font-medium tracking-tight text-xl">Thijs Sterk</span>
        </div>
        
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
          &copy; {new Date().getFullYear()} Erven Thijs Sterk. Alle rechten voorbehouden.
        </p>
        
        <div className="flex gap-8 text-sm font-medium">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Beheer</Link>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Nieuwsbrief</a>
        </div>
      </div>
    </footer>
  );
}
