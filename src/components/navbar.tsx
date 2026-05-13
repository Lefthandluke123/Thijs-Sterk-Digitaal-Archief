"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Galerie', href: '/gallery' },
    { name: 'Over', href: '/#about' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          {/* Logo Sectie: Vervang de 'T' div door een <Image /> component als je een bestand hebt */}
          <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-headline font-bold text-xl overflow-hidden transition-transform group-hover:scale-110">
            {/* 
              Als je een logo bestand hebt (bijv. public/logo.png), gebruik dan:
              <Image src="/logo.png" alt="Thijs Sterk Logo" fill className="object-contain" />
            */}
            T
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold tracking-tight text-xl leading-none">Thijs Sterk</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-medium">Beeldend Kunstenaar</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className={cn(
                "text-sm font-medium tracking-wide transition-all hover:text-accent relative py-1",
                pathname === link.href ? "text-foreground after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-accent" : "text-muted-foreground"
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