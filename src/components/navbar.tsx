
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutGrid } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

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
          <Link 
            href="/"
            className={cn(
              "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300",
              pathname === "/" ? "bg-accent/90 text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Home
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('/gallery') ? "bg-accent/90 text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                Zalen <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[200px] p-2 shadow-2xl">
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/gallery" className="flex items-center gap-2">
                  <LayoutGrid className="w-3 h-3" /> Alle Zalen
                </Link>
              </DropdownMenuItem>
              <div className="h-px bg-border/20 my-1 mx-2" />
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/gallery?series=Landschappen">Landschappen</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/gallery?series=Monumentaal">Monumentaal / Glas</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3">
                <Link href="/gallery?series=Bloemen">Stillevens & Bloemen</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link 
            href="/curator"
            className={cn(
              "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300",
              pathname === "/curator" ? "bg-accent/90 text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Uw Eigen Zaal
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('about') || pathname.includes('hanneke') || pathname.includes('beatrijs') || pathname.includes('peter-bes')
                    ? "bg-secondary/80 text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                Over Thijs <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[180px] p-2 shadow-2xl">
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/#about">Biografie</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/hanneke">Hanneke Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/beatrijs">Beatrijs Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3">
                <Link href="/peter-bes">Peter Bes</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link 
            href="/#contact"
            className={cn(
              "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-all duration-300",
              pathname.includes('contact') ? "bg-accent/90 text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}
