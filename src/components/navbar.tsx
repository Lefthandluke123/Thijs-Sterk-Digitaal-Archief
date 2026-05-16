
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSeries = searchParams.get('series');
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const { data: dbArtworks } = useCollection(artworksQuery);

  const seriesNames = useMemo(() => {
    const fromDb = dbArtworks?.map(art => art.series) || [];
    const fromPlaceholders = PlaceHolderImages.map(art => art.series);
    const combined = Array.from(new Set([...fromDb, ...fromPlaceholders].filter(Boolean)));
    return (combined as string[]).filter(s => s !== "Monumentaal" && s !== "Glas in lood").sort();
  }, [dbArtworks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const NavLink = ({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) => (
    <Link 
      href={href}
      className={cn(
        "px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all duration-300",
        active ? "bg-accent/90 text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-sm border-b border-border/10">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center group h-14">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
        </Link>
        
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[80%]">
          <NavLink href="/" active={pathname === "/"}>Home</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  (pathname.includes('/gallery') && !['Monumentaal', 'Glas in lood'].includes(currentSeries || '')) || pathname.includes('/curator') 
                    ? "bg-accent/90 text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Beeldend <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[240px] p-2 shadow-2xl">
              <DropdownMenuLabel className="text-[8px] uppercase tracking-[0.2em] opacity-40 px-3 py-2">Zalen & Collecties</DropdownMenuLabel>
              {seriesNames.length > 0 ? (
                seriesNames.map((name) => (
                  <DropdownMenuItem key={name} asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                    <Link href={`/gallery?series=${encodeURIComponent(name)}`}>{name}</Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-[8px] uppercase opacity-20">Geen actieve zalen</div>
              )}
              <DropdownMenuSeparator className="bg-border/20 my-2" />
              <DropdownMenuItem asChild className="text-[9px] uppercase font-bold tracking-[0.15em] focus:bg-black focus:text-white rounded-xl cursor-pointer p-3">
                <Link href="/curator" className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-accent" /> Uw Zaal
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/gallery?series=Monumentaal" active={pathname === "/gallery" && currentSeries === "Monumentaal"}>Monumentaal</NavLink>
          <NavLink href="/gallery?series=Glas in lood" active={pathname === "/gallery" && currentSeries === "Glas in lood"}>Glas in lood</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('hanneke') || pathname.includes('beatrijs') || pathname.includes('peter-bes')
                    ? "bg-secondary/80 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Over <ChevronDown className="w-2.5 h-2.5 opacity-50" />
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

          <NavLink href="/#contact" active={false}>Contact</NavLink>
        </div>
      </div>
    </nav>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<div className="h-14 border-b border-border/10 bg-background/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin opacity-20" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
