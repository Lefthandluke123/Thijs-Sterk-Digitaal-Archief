"use client";

import React, { useState, useEffect, Suspense } from 'react';
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
  ShoppingBag, 
  BookOpen,
  Menu,
  LayoutGrid,
  Filter,
  Languages
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, mounted]);

  const { data: rooms } = useCollection(roomsQuery);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const getSiteIdentity = () => {
    if (!mounted) return { title: "Het Digitale Retrospectief", subtitle: "Licht, Ruimte en Water" };
    const dbTitle = siteSettings?.[`siteTitle_${language}`] || siteSettings?.siteTitle;
    const dbSubtitle = siteSettings?.[`siteSubtitle_${language}`] || siteSettings?.siteSubtitle;
    return {
      title: dbTitle || t('nav_museum_title'),
      subtitle: dbSubtitle || t('nav_museum_subtitle')
    };
  };

  const { title: siteTitle, subtitle: siteSubtitle } = getSiteIdentity();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const NavLink = ({ href, children, active, important, className }: { href: string; children: React.ReactNode; active: boolean; important?: boolean, className?: string }) => (
    <Link 
      href={href}
      className={cn(
        "px-4 py-2 rounded-full text-[12px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95",
        active ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground hover:text-primary hover:bg-black/5",
        important && !active && "text-accent border-2 border-accent/40",
        className
      )}
    >
      {children}
    </Link>
  );

  const LanguagePills = ({ className }: { className?: string }) => (
    <div className={cn("flex bg-secondary/20 rounded-full p-1 border border-border/10", className)}>
      {(['nl', 'en', 'de', 'fr', 'es'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase transition-all",
            language === lang 
              ? "bg-accent text-accent-foreground shadow-sm scale-105" 
              : "hover:bg-black/5 text-foreground/50 hover:text-foreground"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-b border-border/20 shadow-sm h-16 md:h-20">
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          
          <Link 
            href="/"
            className="flex items-center gap-2 md:gap-4 group shrink-0 cursor-pointer"
          >
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-6 md:h-10 w-auto object-contain transition-transform duration-700" 
            />
            <div className="flex flex-col leading-tight border-l border-border/60 pl-2.5 md:pl-4 overflow-hidden">
               <span className="font-headline font-medium text-sm md:text-lg tracking-tight text-foreground transition-all duration-500 group-hover:text-accent">
                 {siteTitle}
               </span>
               <span className="text-[6px] md:text-[8px] font-bold uppercase tracking-[0.25em] text-accent block transition-all duration-700 group-hover:translate-x-2">
                 {siteSubtitle}
               </span>
            </div>
          </Link>
          
          {mounted && (
            <div className="hidden lg:flex items-center gap-1">
              <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn("px-4 py-2 rounded-full text-[12px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 outline-none hover:bg-black/5", pathname.includes('/room') || pathname === '/gallery' ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground")}>
                    {t('nav_galleries')} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background/98 backdrop-blur-2xl border-border/40 rounded-xl min-w-[200px] p-1.5 shadow-xl">
                  <DropdownMenuItem asChild className="text-[11px] uppercase font-black tracking-widest focus:bg-accent focus:text-accent-foreground rounded-lg cursor-pointer p-3 mb-1.5 border-b border-black/5">
                    <Link href="/gallery" className="flex w-full items-center gap-2">
                      <LayoutGrid className="w-3 h-3" /> {t('gallery_all')}
                    </Link>
                  </DropdownMenuItem>
                  {rooms?.map((r: any) => (
                    <DropdownMenuItem key={r.id} asChild className="text-[11px] uppercase font-bold tracking-wide focus:bg-accent focus:text-accent-foreground rounded-lg cursor-pointer p-3 mb-0.5">
                      <Link href={`/room/${r.slug}`} className="flex w-full items-center">
                        {r.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>
              <NavLink href="/#about" active={pathname.includes('#about')}>{t('nav_about')}</NavLink>
              <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-3 h-3" /> {t('nav_shop')}</NavLink>

              <div className="h-6 w-px bg-border/20 mx-2" />

              <button onClick={() => setGuideOpen(true)} className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 hover:bg-accent/10 text-accent group">
                <BookOpen className="w-3.5 h-3.5" /> Guide
              </button>

              <LanguagePills className="ml-2" />
            </div>
          )}

          <div className="lg:hidden flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon" className="w-9 h-9 rounded-full border-border/30"><Menu className="w-4.5 h-4.5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[80vw] p-0 border-none bg-background shadow-2xl">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-border/10 bg-primary text-primary-foreground">
                    <span className="font-headline text-lg font-medium italic">{siteTitle}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                     <Link href="/" className="flex items-center gap-3 p-4 rounded-xl bg-black/5 text-[12px] font-bold uppercase tracking-wider">{t('nav_home')}</Link>
                     
                     <div className="pt-3 border-t border-border/10">
                       <p className="text-[9px] font-black uppercase tracking-widest mb-3 px-3 opacity-30">Ontdek de Collectie</p>
                       <Link href="/gallery" className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 text-[12px] font-black uppercase tracking-widest text-accent mb-1.5 border border-accent/10">
                         <LayoutGrid className="w-4 h-4" /> Alle Zalen Overzicht
                       </Link>
                       <Link href="/curator" className="flex items-center gap-3 p-4 rounded-xl bg-black/5 text-[12px] font-bold uppercase tracking-wider mb-1.5">
                         <Filter className="w-4 h-4" /> {t('nav_your_room')}
                       </Link>
                       {rooms?.map((r: any) => (
                         <Link key={r.id} href={`/room/${r.slug}`} className="flex items-center gap-3 p-4 rounded-xl bg-black/5 text-[12px] font-medium uppercase tracking-wider mb-1.5 opacity-70">{r.title}</Link>
                       ))}
                     </div>

                     <div className="pt-3 border-t border-border/10">
                        <Link href="/shop" className="flex items-center gap-3 p-4 rounded-xl bg-black/5 text-[12px] font-bold uppercase tracking-wider mb-1.5">{t('nav_shop')}</Link>
                        <button onClick={() => setGuideOpen(true)} className="flex w-full items-center gap-3 p-4 rounded-xl bg-accent/10 text-[12px] font-bold uppercase tracking-wider text-accent">
                          <BookOpen className="w-4 h-4" /> Museum Gids
                        </button>
                     </div>

                     <div className="pt-6 border-t border-border/10">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-4 px-3 opacity-30 flex items-center gap-2">
                          <Languages className="w-3 h-3" /> Taal / Language
                        </p>
                        <LanguagePills className="mx-3" />
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
    <Suspense fallback={<div className="h-16 md:h-20 border-b border-border/10 bg-background/80 backdrop-blur-md flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-30" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
