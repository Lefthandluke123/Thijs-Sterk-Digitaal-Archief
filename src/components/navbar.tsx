"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Galerie', href: '/gallery' },
    { name: 'Over Thijs', href: '/#about' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-headline font-bold text-xl overflow-hidden transition-transform group-hover:scale-110">
            T
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold tracking-tight text-xl leading-none">Thijs Sterk</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-medium">Beeldend Kunstenaar</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 shadow-sm",
                pathname === link.href 
                  ? "bg-accent text-accent-foreground scale-105 shadow-md" 
                  : "bg-accent/90 text-accent-foreground/90 hover:bg-accent hover:text-accent-foreground hover:scale-105"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}