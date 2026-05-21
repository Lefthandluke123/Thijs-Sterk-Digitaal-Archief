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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const NavLink = ({ href, children, active, important, className }: { href: string; children: React.ReactNode; active: boolean; important?: boolean, className?: string }) => (
    <Link 
      href={href}
      className={cn(
        "px-4 py-2 rounded-full text-[13px] font-black tracking-[0.1em] uppercase transition-all duration-500 flex items-center gap-2 hover:scale-105 active:scale-95",
        active ? "bg-accent text-accent-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-black/5",
        important && !active && "text-accent border border-accent/20",
        className
      )}
    >
      {children}
    </Link>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/10 shadow-sm h-16 md:h-20">
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          
          <div 
            className="flex items-center gap-3 md:gap-5 group shrink-0 cursor-pointer"
            onClick={() => setGuideOpen(true)}
            title={t('nav_guide_click')}
          >
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-8 md:h-12 w-auto object-contain" 
            />
            <div className="flex flex-col leading-tight border-l border-border/40 pl-3 md:pl-5 overflow-hidden">
               <div className="flex items-center gap-2 animate-fade-in-up">
                 <span className="font-headline font-light text-base md:text-xl tracking-tight text-foreground">
                   {siteTitle}
                 </span>
                 <BookOpen className="w-3.5 h-3.5 text-accent hidden md:inline opacity-40 group-hover:opacity-100 transition-opacity" />
               </div>
               <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-accent/80 block animate-fade-in-left delay-300">
                 {siteSubtitle}
               </span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-1 xl:gap-3">
            <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>
            <NavLink href="/exhibition" active={pathname === "/exhibition"} important><Sparkles className="w-3.5 h-3.5 animate-pulse" /> {t('nav_tour')}</NavLink>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("px-4 py-2 rounded-full text-[13px] font-black tracking-[0.1em] uppercase transition-all duration-500 flex items-center gap-1 outline-none hover:scale-105", pathname.includes('/gallery') ? "bg-accent text-accent-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                  {t('nav_galleries')} <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[240px] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {seriesWithCounts.map((s) => (
                  <DropdownMenuItem key={s.name} asChild className="text-[11px] uppercase font-black tracking-[0.1em] focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1 transition-all">
                    <Link href={`/gallery?series=${encodeURIComponent(s.name)}`} className="flex w-full items-center">
                      {s.translatedName} <span className="ml-auto opacity-30 text-[9px] font-bold">[{s.count}]</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>
            <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-3.5 h-3.5" /> {t('nav_shop')}</NavLink>
            <NavLink href="/#about" active={false}>{t('nav_about')}</NavLink>
            <NavLink href="/#contact" active={false}>{t('nav_contact')}</NavLink>

            <div className="h-8 w-px bg-border/20 mx-2" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/30 text-[11px] font-black uppercase tracking-widest hover:bg-secondary/50 transition-all duration-300 border border-black/5 hover:scale-105 active:scale-95">
                  <Languages className="w-3.5 h-3.5 text-accent" /> {language.toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl p-1.5 min-w-[140px] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang as any)} className="flex items-center gap-3 text-[11px] uppercase font-black tracking-widest rounded-xl p-3 cursor-pointer focus:bg-accent focus:text-accent-foreground transition-all">
                    {lang.toUpperCase()} {language === lang && <div className="ml-auto w-2 h-2 rounded-full bg-accent animate-pulse" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="lg:hidden flex items-center gap-4">
            <button onClick={() => setGuideOpen(true)} className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent active:scale-90 transition-all"><Info className="w-5 h-5" /></button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/5"><Menu className="w-5 h-5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0 border-none bg-background">
                <SheetTitle className="sr-only">Navigatie Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-border/10 bg-primary text-primary-foreground">
                    <span className="font-headline text-2xl font-light italic">{siteTitle}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                     <Link href="/" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_home')}</Link>
                     <Link href="/exhibition" className="flex items-center gap-4 p-4 rounded-xl bg-accent text-accent-foreground text-[12px] font-black uppercase tracking-widest">{t('nav_tour')}</Link>
                     <Link href="/gallery" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_galleries')}</Link>
                     <Link href="/curator" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_your_room')}</Link>
                     <Link href="/shop" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_shop')}</Link>
                     <Link href="/#about" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">
                       <Users className="w-4 h-4" /> {t('nav_about')}
                     </Link>
                     <Link href="/#contact" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest">
                       <Mail className="w-4 h-4" /> {t('nav_contact')}
                     </Link>
                     <Link href="/admin" className="flex items-center gap-4 p-4 rounded-xl bg-black/5 text-[12px] font-black uppercase tracking-widest opacity-50">
                       <Settings className="w-4 h-4" /> {t('nav_admin')}
                     </Link>

                     <div className="pt-8 border-t border-border/10 mt-4">
                        <div className="flex items-center gap-3 mb-4 px-4">
                          <Languages className="w-4 h-4 text-accent" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Selecteer Taal</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setLanguage(lang as any)}
                              className={cn(
                                "h-12 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center",
                                language === lang ? "bg-accent text-accent-foreground shadow-lg" : "bg-black/5 text-muted-foreground"
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
    <Suspense fallback={<div className="h-16 md:h-20 border-b border-border/10 bg-background/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}