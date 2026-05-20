
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
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Sparkles, Languages, ShoppingBag, BookOpen } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useLanguage } from '@/components/language-provider';
import { MuseumGuide } from './museum-guide';

function NavbarContent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
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

  const translateTerm = (text: string, category: 'series' | 'tag') => {
    if (language === 'nl' || !siteSettings) return text;
    const map = category === 'series' ? siteSettings.seriesTranslations : siteSettings.tagTranslations;
    return map?.[language]?.[text] || text;
  };

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
      if (art.series) counts[art.series] = (counts[art.series] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([name]) => name !== "Nieuwe Uploads" && name !== "Geen zaal" && !hiddenSeries.includes(name))
      .map(([name, count]) => ({ 
        name, 
        count,
        translatedName: translateTerm(name, 'series')
      }))
      .sort((a, b) => a.translatedName.localeCompare(b.translatedName));
  }, [dbArtworks, hiddenSeries, language, siteSettings]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const NavLink = ({ href, children, active, important }: { href: string; children: React.ReactNode; active: boolean; important?: boolean }) => (
    <Link 
      href={href}
      className={cn(
        "px-6 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-2",
        active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-black/5",
        important && !active && "text-accent border border-accent/30"
      )}
    >
      {children}
    </Link>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/10 shadow-sm">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-5 group shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
            onClick={() => setGuideOpen(true)}
            title="Klik voor de Museum Gids"
          >
            <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain transition-transform group-hover:rotate-6" />
            <div className="flex flex-col leading-tight border-l border-border/40 pl-5">
               <div className="flex items-center gap-2">
                 <span className="font-headline font-light text-xl tracking-tight text-foreground">Digitaal Museum</span>
                 <BookOpen className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent/80">Thijs Sterk (1913-1982) &bull; Klik voor Gids</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-[85%] py-1">
            <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>
            <NavLink href="/exhibition" active={pathname === "/exhibition"} important><Sparkles className="w-4 h-4" /> {t('nav_tour')}</NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("px-6 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-1.5 outline-none", pathname.includes('/gallery') ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                  {t('nav_galleries')} <ChevronDown className="w-4 h-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[260px] p-2.5 shadow-2xl">
                {seriesWithCounts.map((s) => (
                  <DropdownMenuItem key={s.name} asChild className="text-[12px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-4 mb-1">
                    <Link href={`/gallery?series=${encodeURIComponent(s.name)}`} className="flex w-full items-center">
                      {s.translatedName} <span className="ml-auto opacity-30 text-[10px] font-bold">[{s.count}]</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>
            <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-4 h-4" /> {t('nav_shop')}</NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("px-6 py-2.5 rounded-full text-[14px] font-black tracking-[0.15em] uppercase transition-all duration-300 flex items-center gap-1.5 outline-none", (pathname.includes('hanneke') || pathname.includes('beatrijs')) ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                  {t('nav_about')} <ChevronDown className="w-4 h-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[220px] p-2.5 shadow-2xl">
                <DropdownMenuItem asChild className="text-[13px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl p-4 mb-1">
                  <Link href="/hanneke">Hanneke Sterk</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl p-4 mb-1">
                  <Link href="/beatrijs">Beatrijs Sterk</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl p-4 mb-1">
                  <Link href="/peter-bes">Peter Bes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] uppercase font-black tracking-[0.12em] focus:bg-accent focus:text-accent-foreground rounded-xl p-4">
                  <Link href="/leo-duppen">Leo Duppen</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NavLink href="/#contact" active={false}>{t('nav_contact')}</NavLink>

            <div className="h-10 w-px bg-border/20 mx-4" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-secondary/40 text-[12px] font-black uppercase tracking-widest hover:bg-secondary/60 transition-all border border-black/5">
                  <Languages className="w-4 h-4 text-accent" /> {language.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl p-2 min-w-[160px] shadow-2xl">
                {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang as any)} className="flex items-center gap-4 text-[12px] uppercase font-black tracking-widest rounded-xl p-4 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                    {lang.toUpperCase()} {language === lang && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-accent" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      
      <MuseumGuide open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<div className="h-20 border-b border-border/10 bg-background/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
