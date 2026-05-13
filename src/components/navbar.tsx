
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Galerie', href: '/gallery' },
    { name: 'Uw Collectie', href: '/curator' },
    { name: 'Over Thijs', href: '/#about' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-sm border-b border-border/30">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden transition-transform group-hover:scale-105">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              className="object-contain p-1" 
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
            <span className="font-headline font-bold text-base">T</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold tracking-tight text-lg leading-none">Thijs Sterk</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-accent font-medium opacity-80">Beeldend Kunstenaar</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className={cn(
                "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300",
                pathname === link.href 
                  ? "bg-accent/90 text-accent-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
