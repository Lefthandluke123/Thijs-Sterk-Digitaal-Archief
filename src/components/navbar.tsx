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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Sparkles, Languages } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useLanguage } from '@/components/language-provider';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  const { language, setLanguage, t } = useLanguage();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const { data: dbArtworks } = useCollection(artworksQuery);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const hiddenSeries = useMemo(() => siteSettings?.hiddenSeries || [], [siteSettings]);

  const seriesWithCounts = useMemo(() => {
    if (!dbArtworks) return [];
    
    const seen = new Set();
    const uniqueArtworks = dbArtworks.filter(art => {
      const url = art.imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    const counts: Record<string, number> = {};
    uniqueArtworks.forEach(art => {
      if (art.series) {
        counts[art.series] = (counts[art.series] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .filter(([name]) => 
        name !== "Nieuwe Uploads" && 
        name !== "Geen zaal" &&
        !hiddenSeries.includes(name)
      )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbArtworks, hiddenSeries]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const NavLink = ({ href, children, active, important }: { href: string; children: React.ReactNode; active: boolean; important?: boolean }) => (
    <Link 
      href={href}
      className={cn(
        "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
        important && !active && "text-accent border border-accent/20"
      )}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/10">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 h-14 group shrink-0">
          <img src="/logo.png" alt="Logo" className="h-9 w-auto object-contain" />
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
             <span className="font-headline font-light text-base tracking-tight text-foreground">Digitaal Museum</span>
             <span className="text-[7px] font-black uppercase tracking-[0.3em] text-accent">Thijs Sterk (1913-1982)</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[85%]">
          <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>

          <NavLink href="/exhibition" active={pathname === "/exhibition"} important>
            <Sparkles className="w-3 h-3" /> {t('nav_tour')}
          </NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('/gallery')
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('nav_galleries')} <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[220px] p-2 shadow-2xl">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.2em] opacity-40 px-3 py-2">{t('nav_collections')}</DropdownMenuLabel>
              {seriesWithCounts.length > 0 ? (
                seriesWithCounts.map((s) => (
                  <DropdownMenuItem key={s.name} asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                    <Link href={`/gallery?series=${encodeURIComponent(s.name)}`}>
                      {s.name} <span className="ml-auto opacity-30 text-[8px]">({s.count})</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-[9px] uppercase opacity-20">Geen actieve zalen</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-1 outline-none",
                  pathname.includes('hanneke') || pathname.includes('beatrijs') || pathname.includes('peter-bes') || pathname.includes('leo-duppen')
                    ? "bg-secondary/80 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t('nav_about')} <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-2xl min-w-[180px] p-2 shadow-2xl">
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/hanneke">Hanneke Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/beatrijs">Beatrijs Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1">
                <Link href="/peter-bes">Peter Bes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-[0.15em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3">
                <Link href="/leo-duppen">Leo Duppen</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/#contact" active={false}>{t('nav_contact')}</NavLink>

          <div className="h-6 w-px bg-border/20 mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 text-[10px] font-black uppercase tracking-widest hover:bg-secondary/50 transition-colors">
                <Languages className="w-3 h-3" />
                {language.toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-xl border-border/40 rounded-xl p-1 min-w-[120px]">
              <DropdownMenuItem onClick={() => setLanguage('nl')} className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest rounded-lg p-3 cursor-pointer">
                <span className="text-base">🇳🇱</span> Nederlands
                {language === 'nl' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest rounded-lg p-3 cursor-pointer">
                <span className="text-base">🇬🇧</span> English
                {language === 'en' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
