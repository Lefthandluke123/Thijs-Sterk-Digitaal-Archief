
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

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
    if (!dbArtworks) return [];
    const combined = Array.from(new Set(dbArtworks.map(art => art.series).filter(Boolean)));
    return (combined as string[]).filter(s => s !== "Monumentaal" && s !== "Glas in lood" && s !== "Nieuwe Uploads" && s !== "Geen zaal").sort();
  }, [dbArtworks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const NavLink = ({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) => (
    <Link 
      href={href}
      className={cn(
        "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/10">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center h-14">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
        </Link>
        
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[85%]">
          <NavLink href="/" active={pathname === "/"}>Home</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  (pathname.includes('/gallery') && !['Monumentaal', 'Glas in lood'].includes(currentSeries || ''))
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Zalen <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[220px] p-2 shadow-2xl">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.2em] opacity-40 px-3 py-2">Collecties</DropdownMenuLabel>
              {seriesNames.length > 0 ? (
                seriesNames.map((name) => (
                  <DropdownMenuItem key={name} asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                    <Link href={`/gallery?series=${encodeURIComponent(name)}`}>{name}</Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-[9px] uppercase opacity-20">Laden...</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/curator" active={pathname === "/curator"}>Uw Zaal</NavLink>
          <NavLink href="/gallery?series=Monumentaal" active={pathname === "/gallery" && currentSeries === "Monumentaal"}>Monumentaal</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('hanneke') || pathname.includes('beatrijs') || pathname.includes('peter-bes')
                    ? "bg-secondary/80 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Over <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[180px] p-2 shadow-2xl">
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/hanneke">Hanneke Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/beatrijs">Beatrijs Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3">
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
