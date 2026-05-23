"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  Loader2, 
  Sparkles, 
  Languages, 
  ShoppingBag, 
  BookOpen,
  Menu,
  Home,
  Layers,
  Info,
  Mail,
  Settings,
  Users
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useLanguage } from '@/components/language-provider';
import { MuseumGuide } from './museum-guide';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

function NavbarContent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const siteTitle = (language !== 'nl' && siteSettings?.[`siteTitle_${language}`])
    ? siteSettings[`siteTitle_${language}`]
    : (siteSettings?.siteTitle || t('nav_museum_title'));

  const siteSubtitle = (language !== 'nl' && siteSettings?.[`siteSubtitle_${language}`])
    ? siteSettings[`siteSubtitle_${language}`]
    : (siteSettings?.siteSubtitle || t('nav_museum_subtitle'));

  const translateTerm = (text: string, category: 'series' | 'tag') => {
    if (language === 'nl' || !siteSettings) return text;
    const map = category === 'series' ? siteSettings.seriesTranslations : siteSettings.tagTranslations;
    return map?.[language]?.[text] || text;
  };

  const seriesWithCounts = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    const uniqueArtworks = dbArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    const counts: Record<string, number> = {};
    uniqueArtworks.forEach(art => {
      const seriesName = (art as any).series;
      if (seriesName) counts[seriesName] = (counts[seriesName] || 0) + 1;
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const NavLink = ({ href, children, active, important, className }: { href: string; children: React.ReactNode; active: boolean; important?: boolean, className?: string }) => (
    <Link 
      href={href}
      className={cn(
        "px-5 py-2.5 rounded-full text-[15px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95",
        active ? "bg-primary text-primary-foreground shadow-xl" : "text-foreground hover:text-primary hover:bg-black/5",
        important && !active && "text-accent border-2 border-accent/40",
        className
      )}
    >
      {children}
    </Link>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-b border-border/20 shadow-md h-16 md:h-32">
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          
          <Link 
            href="/"
            className="flex items-center gap-3 md:gap-8 group shrink-0 cursor-pointer"
            title={t('nav_home')}
          >
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-8 md:h-20 w-auto object-contain transition-transform duration-700" 
            />
            <div className="flex flex-col leading-tight border-l-2 border-border/60 pl-3 md:pl-8 overflow-hidden">
               <div className="flex items-center gap-2">
                 <span className="font-headline font-medium text-lg md:text-3xl tracking-tight text-foreground transition-all duration-500 group-hover:text-accent">
                   {siteTitle}
                 </span>
               </div>
               <div className="relative overflow-hidden h-6 md:h-8">
                 <span className="text-[7px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-accent block transition-all duration-700 group-hover:translate-x-4 group-hover:tracking-[0.4em] group-hover:text-primary origin-left animate-fade-in-left">
                   {siteSubtitle}
                 </span>
               </div>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>
            <NavLink href="/exhibition" active={pathname === "/exhibition"} important><Sparkles className="w-3.5 h-3.5" /> {t('nav_tour')}</NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("px-5 py-2.5 rounded-full text-[15px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 outline-none hover:bg-black/5", pathname.includes('/gallery') ? "bg-primary text-primary-foreground shadow-xl" : "text-foreground")}>
                  {t('nav_galleries')} <ChevronDown className="w-4 h-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[260px] p-2 shadow-2xl">
                {seriesWithCounts.map((s) => (
                  <DropdownMenuItem key={s.name} asChild className="text-[13px] uppercase font-bold tracking-wide focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-4 mb-1 transition-all">
                    <Link href={`/gallery?series=${encodeURIComponent(s.name)}`} className="flex w-full items-center">
                      {s.translatedName} <span className="ml-auto opacity-50 text-[10px]">[{s.count}]</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>
            <NavLink href="/#about" active={pathname.includes('#about')}>{t('nav_about')}</NavLink>
            <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-3.5 h-3.5" /> {t('nav_shop')}</NavLink>

            <div className="h-10 w-px bg-border/30 mx-2" />

            <button 
              onClick={() => setGuideOpen(true)}
              className="px-5 py-2.5 rounded-full text-[15px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:bg-accent/10 text-accent group"
              title={t('nav_guide_click')}
            >
              <BookOpen className="w-4 h-4 transition-transform group-hover:rotate-12" />
              <span>Guide</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/40 text-[12px] font-bold uppercase tracking-widest hover:bg-secondary/60 transition-all duration-300 border-2 border-border/20 ml-2">
                  <Languages className="w-4 h-4 text-accent" /> {language.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl p-2 min-w-[160px] shadow-2xl">
                {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang as any)} className="flex items-center gap-3 text-[12px] uppercase font-bold tracking-widest rounded-xl p-4 cursor-pointer focus:bg-accent focus:text-accent-foreground transition-all">
                    {lang.toUpperCase()} {language === lang && <div className="ml-auto w-2 h-2 rounded-full bg-accent" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="lg:hidden flex items-center gap-4">
            <button onClick={() => setGuideOpen(true)} className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent active:scale-90 transition-all border border-accent/20"><Info className="w-5 h-5" /></button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon" className="w-10 h-10 rounded-full border-2 border-border/40"><Menu className="w-5 h-5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0 border-none bg-background shadow-2xl">
                <SheetTitle className="sr-only">Navigatie Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-border/20 bg-primary text-primary-foreground">
                    <span className="font-headline text-2xl font-medium italic">{siteTitle}</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2 text-accent">{siteSubtitle}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                     <Link href="/" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[14px] font-bold uppercase tracking-wider">{t('nav_home')}</Link>
                     <Link href="/exhibition" className="flex items-center gap-4 p-5 rounded-2xl bg-accent text-accent-foreground text-[14px] font-bold uppercase tracking-wider shadow-lg">{t('nav_tour')}</Link>
                     <Link href="/gallery" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[14px] font-bold uppercase tracking-wider">{t('nav_galleries')}</Link>
                     <Link href="/curator" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[14px] font-bold uppercase tracking-wider">{t('nav_your_room')}</Link>
                     <Link href="/#about" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[14px] font-bold uppercase tracking-wider">{t('nav_about')}</Link>
                     <Link href="/shop" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[14px] font-bold uppercase tracking-wider">{t('nav_shop')}</Link>

                     <div className="pt-8 border-t border-border/20 mt-4">
                        <div className="flex items-center gap-3 mb-6 px-4">
                          <Languages className="w-5 h-5 text-accent" />
                          <span className="text-[12px] font-bold uppercase tracking-widest text-foreground">Taal / Language</span>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setLanguage(lang as any)}
                              className={cn(
                                "h-14 rounded-2xl text-[12px] font-bold uppercase transition-all flex items-center justify-center border-2",
                                language === lang ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-black/5 text-foreground border-transparent"
                              )}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                     </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <MuseumGuide open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<div className="h-16 md:h-32 border-b border-border/20 bg-background/80 backdrop-blur-md flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin opacity-40" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
