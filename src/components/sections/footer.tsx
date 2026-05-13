
"use client";

import React from 'react';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">A</div>
          <span className="font-headline font-medium tracking-tight text-xl">Aether Canvas</span>
        </div>
        
        <p className="text-muted-foreground text-sm">
          &copy; {currentYear} Elena Vance. Alle rechten voorbehouden.
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
