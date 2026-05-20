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
        "px-5 py-2 rounded-full text-[12px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-2",
        active 
          ? "bg-accent text-accent-foreground shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-black/5",
        important && !active && "text-accent border border-accent/30"
      )}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/10 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-5 group shrink-0 transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <div className="flex flex-col leading-tight border-l border-border/40 pl-5">
             <span className="font-headline font-light text-lg tracking-tight text-foreground">Digitaal Museum</span>
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-accent/80">Thijs Sterk (1913-1982)</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[80%] py-1">
          <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>

          <NavLink href="/exhibition" active={pathname === "/exhibition"} important>
            <Sparkles className="w-3.5 h-3.5" /> {t('nav_tour')}
          </NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-5 py-2 rounded-full text-[12px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-1.5 outline-none",
                  pathname.includes('/gallery')
                    ? "bg-accent text-accent-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                )}
              >
                {t('nav_galleries')} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[240px] p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.25em] opacity-40 px-4 py-3 font-black">{t('nav_collections')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/10 mx-2" />
              {seriesWithCounts.length > 0 ? (
                seriesWithCounts.map((s) => (
                  <DropdownMenuItem key={s.name} asChild className="text-[11px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3.5 mb-1 transition-colors">
                    <Link href={`/gallery?series=${encodeURIComponent(s.name)}`} className="flex w-full items-center">
                      {s.name} <span className="ml-auto opacity-30 text-[9px] font-bold">[{s.count}]</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-6 text-center text-[10px] uppercase opacity-20 font-black tracking-widest">Geen actieve zalen</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-5 py-2 rounded-full text-[12px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-1.5 outline-none",
                  pathname.includes('hanneke') || pathname.includes('beatrijs') || pathname.includes('peter-bes') || pathname.includes('leo-duppen')
                    ? "bg-secondary text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                )}
              >
                {t('nav_about')} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[200px] p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3.5 mb-1 transition-colors">
                <Link href="/hanneke">Hanneke Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3.5 mb-1 transition-colors">
                <Link href="/beatrijs">Beatrijs Sterk</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3.5 mb-1 transition-colors">
                <Link href="/peter-bes">Peter Bes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3.5 transition-colors">
                <Link href="/leo-duppen">Leo Duppen</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/#contact" active={false}>{t('nav_contact')}</NavLink>

          <div className="h-8 w-px bg-border/20 mx-3" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-secondary/40 text-[11px] font-black uppercase tracking-widest hover:bg-secondary/60 transition-all border border-black/5 shadow-sm">
                <Languages className="w-3.5 h-3.5 text-accent" />
                {language.toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl p-1.5 min-w-[140px] shadow-2xl">
              <DropdownMenuItem onClick={() => setLanguage('nl')} className="flex items-center gap-4 text-[11px] uppercase font-black tracking-widest rounded-xl p-3.5 cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground">
                <span className="text-lg">🇳🇱</span> NL
                {language === 'nl' && <div className="ml-auto w-2 h-2 rounded-full bg-accent" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="flex items-center gap-4 text-[11px] uppercase font-black tracking-widest rounded-xl p-3.5 cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground">
                <span className="text-lg">🇬🇧</span> EN
                {language === 'en' && <div className="ml-auto w-2 h-2 rounded-full bg-accent" />}
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
    <Suspense fallback={<div className="h-16 border-b border-border/10 bg-background/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin opacity-20" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
