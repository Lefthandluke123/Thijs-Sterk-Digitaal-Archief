"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  X,
  Home,
  Layers,
  User,
  Mail,
  Info
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

  const MobileNavLink = ({ href, children, icon: Icon, active }: { href: string; children: React.ReactNode; icon: any; active: boolean }) => (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl text-[14px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95",
        active ? "bg-accent text-accent-foreground shadow-md" : "bg-black/5 text-muted-foreground active:bg-black/10"
      )}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/10 shadow-sm h-16 md:h-20">
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 md:gap-5 group shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
            onClick={() => setGuideOpen(true)}
            title={t('nav_guide_click')}
          >
            <img src="/logo.png" alt="Logo" className="h-8 md:h-12 w-auto object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
            <div className="flex flex-col leading-tight border-l border-border/40 pl-3 md:pl-5 transition-all group-hover:border-accent">
               <div className="flex items-center gap-2">
                 <span className="font-headline font-light text-base md:text-xl tracking-tight text-foreground transition-colors group-hover:text-accent">{t('nav_museum_title')}</span>
                 <BookOpen className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-[-10px] group-hover:translate-x-0 hidden md:inline" />
               </div>
               <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-accent/80 hidden sm:block">Thijs Sterk (1913-1982)</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("px-4 py-2 rounded-full text-[13px] font-black tracking-[0.1em] uppercase transition-all duration-500 flex items-center gap-1 outline-none hover:scale-105", (pathname.includes('hanneke') || pathname.includes('beatrijs')) ? "bg-secondary text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                  {t('nav_about')} <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-2xl min-w-[200px] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.1em] focus:bg-accent focus:text-accent-foreground rounded-xl p-3 mb-1 transition-all">
                  <Link href="/hanneke">Hanneke Sterk</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.1em] focus:bg-accent focus:text-accent-foreground rounded-xl p-3 mb-1 transition-all">
                  <Link href="/beatrijs">Beatrijs Sterk</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.1em] focus:bg-accent focus:text-accent-foreground rounded-xl p-3 mb-1 transition-all">
                  <Link href="/peter-bes">Peter Bes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-[0.1em] focus:bg-accent focus:text-accent-foreground rounded-xl p-3 transition-all">
                  <Link href="/leo-duppen">Leo Duppen</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden flex items-center gap-4">
            <button 
              onClick={() => setGuideOpen(true)}
              className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all duration-300 active:scale-90"
            >
              <Info className="w-5 h-5" />
            </button>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/5 active:scale-90 transition-all">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-0 border-none bg-background animate-in slide-in-from-right duration-500">
                <SheetTitle className="sr-only">Navigatie Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-border/10 flex items-center justify-between bg-primary text-primary-foreground">
                    <div className="flex flex-col">
                      <span className="font-headline text-2xl font-light italic">Menu</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">Thijs Sterk Retrospectief</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-white hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    <MobileNavLink href="/" icon={Home} active={pathname === "/"}>{t('nav_home')}</MobileNavLink>
                    <MobileNavLink href="/exhibition" icon={Sparkles} active={pathname === "/exhibition"}>{t('nav_tour')}</MobileNavLink>
                    
                    <div className="pt-4 pb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent pl-4 mb-2 block">{t('nav_galleries')}</span>
                       <div className="grid grid-cols-1 gap-2">
                         {seriesWithCounts.slice(0, 6).map(s => (
                           <Link key={s.name} href={`/gallery?series=${encodeURIComponent(s.name)}`} className="px-4 py-3 rounded-xl bg-black/[0.03] text-[12px] font-bold uppercase tracking-widest flex justify-between items-center hover:bg-accent/10 transition-all active:scale-95">
                             {s.translatedName}
                             <span className="opacity-30 text-[9px]">[{s.count}]</span>
                           </Link>
                         ))}
                         {seriesWithCounts.length > 6 && (
                           <Link href="/gallery" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-accent text-center hover:bg-accent/5 transition-all">{t('all_works')}...</Link>
                         )}
                       </div>
                    </div>

                    <MobileNavLink href="/curator" icon={Layers} active={pathname === "/curator"}>{t('nav_your_room')}</MobileNavLink>
                    <MobileNavLink href="/shop" icon={ShoppingBag} active={pathname === "/shop"}>{t('nav_shop')}</MobileNavLink>
                    
                    <div className="pt-4 pb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-4 mb-2 block">{t('nav_about')}</span>
                       <div className="grid grid-cols-2 gap-2">
                         <Link href="/hanneke" className="p-4 rounded-xl bg-black/[0.03] text-[10px] font-bold uppercase tracking-widest text-center active:bg-accent/10 transition-all">Hanneke</Link>
                         <Link href="/beatrijs" className="p-4 rounded-xl bg-black/[0.03] text-[10px] font-bold uppercase tracking-widest text-center active:bg-accent/10 transition-all">Beatrijs</Link>
                         <Link href="/peter-bes" className="p-4 rounded-xl bg-black/[0.03] text-[10px] font-bold uppercase tracking-widest text-center active:bg-accent/10 transition-all">Peter Bes</Link>
                         <Link href="/leo-duppen" className="p-4 rounded-xl bg-black/[0.03] text-[10px] font-bold uppercase tracking-widest text-center active:bg-accent/10 transition-all">Leo Duppen</Link>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-secondary/20 border-t border-border/10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('nav_guide_click')}</span>
                      <Languages className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['nl', 'en', 'de', 'fr', 'es'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang as any)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 duration-300",
                            language === lang ? "bg-accent text-accent-foreground shadow-md" : "bg-white text-muted-foreground border border-black/5 hover:border-accent/20"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
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
