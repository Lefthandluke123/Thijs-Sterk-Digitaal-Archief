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
  LayoutDashboard
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/components/language-provider';
import { MuseumGuide } from './museum-guide';
import { LanguageSwitcher } from './language-switcher';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

/**
 * @fileOverview Navbar: Centrale navigatie met ondersteuning voor zalen en archief.
 */

const NavLink = ({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) => (
  <Link 
    href={href}
    className={cn(
      "px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 nav-item-style",
      active 
        ? "bg-accent text-accent-foreground shadow-lg scale-105" 
        : "text-foreground/60 hover:text-accent hover:bg-accent/5"
    )}
  >
    {children}
  </Link>
);

function NavbarContent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

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
      title: dbTitle || t('museum_title'),
      subtitle: dbSubtitle || t('museum_subtitle')
    };
  };

  const { title: siteTitle, subtitle: siteSubtitle } = getSiteIdentity();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-24 md:h-32 px-4 md:px-6 flex items-center justify-center pointer-events-none">
        <div className="container max-w-7xl h-16 md:h-22 glass-panel rounded-full flex flex-nowrap items-center justify-between px-4 md:px-8 pointer-events-auto border-white/60 shadow-2xl">
          
          {/* 1. Identity Section */}
          <div className="flex-shrink-0 min-w-0">
            <Link href="/" className="flex items-center gap-3 md:gap-6 group cursor-pointer">
              <img 
                src={siteSettings?.logoUrl || "/logo.png"} 
                alt="Logo" 
                className="h-10 md:h-16 w-auto object-contain transition-transform duration-700 group-hover:scale-105 flex-shrink-0" 
              />
              <div className="hidden sm:flex flex-col leading-tight border-l-2 border-accent/10 pl-4 md:pl-6 min-w-0">
                 <span className="font-headline font-medium text-lg md:text-2xl tracking-tight text-foreground group-hover:text-accent transition-colors truncate">
                   {siteTitle}
                 </span>
                 <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-accent/50 block truncate">
                   {siteSubtitle}
                 </span>
              </div>
            </Link>
          </div>
          
          {/* 2. Desktop Layout */}
          {mounted && (
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <NavLink href="/" active={pathname === "/"}>{t('home')}</NavLink>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-1 outline-none nav-item-style",
                      pathname.includes('/room') || pathname === '/gallery' 
                        ? "bg-accent text-accent-foreground shadow-lg scale-105" 
                        : "text-foreground/60 hover:bg-accent/5"
                    )}>
                      {t('galleries')} <ChevronDown className="w-3 h-3 opacity-30" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-white/95 backdrop-blur-2xl border-black/5 rounded-3xl min-w-[240px] p-2 shadow-2xl mt-4">
                    <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-widest focus:bg-accent focus:text-accent-foreground rounded-2xl cursor-pointer p-4 mb-1 border-b border-black/5">
                      <Link href="/gallery" className="flex w-full items-center gap-3">
                        <LayoutGrid className="w-4 h-4 opacity-40" /> {t('gallery_all')}
                      </Link>
                    </DropdownMenuItem>
                    {rooms?.map((r: any) => (
                      <DropdownMenuItem key={r.id} asChild className="text-[10px] uppercase font-bold tracking-wider focus:bg-accent focus:text-accent-foreground rounded-2xl cursor-pointer p-4">
                        <Link href={`/room/${r.slug || r.id}`} className="flex w-full items-center">{r.title}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <NavLink href="/curator" active={pathname === "/curator"}>{t('your_room')}</NavLink>
                <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-4 h-4" /> {t('shop')}</NavLink>
              </div>

              <div className="h-8 w-px bg-black/5 mx-3" />

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setGuideOpen(true)} 
                  className="px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 hover:bg-accent/5 text-accent border border-accent/10 nav-item-style"
                >
                  <BookOpen className="w-4 h-4" /> Gids
                </button>

                <Link 
                  href="/admin" 
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 border border-black/10 mr-4 nav-item-style",
                    pathname.startsWith('/admin') ? "bg-primary text-primary-foreground" : "text-foreground/40 hover:bg-black/5"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" /> Beheer
                </Link>
              </div>

              <LanguageSwitcher />
            </div>
          )}

          {/* 3. Mobile Layout */}
          <div className="lg:hidden flex items-center gap-3 flex-shrink-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-black/5">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0 border-none bg-background shadow-2xl">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-10 border-b border-black/5 bg-primary text-primary-foreground rounded-bl-[4rem]">
                    <span className="font-headline text-3xl font-medium italic">{siteTitle}</span>
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mt-3">{siteSubtitle}</p>
                    <div className="mt-10">
                       <LanguageSwitcher className="opacity-90" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                     <div className="space-y-3">
                       <Link href="/" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black uppercase tracking-widest nav-item-style">{t('home')}</Link>
                       <Link href="/shop" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black uppercase tracking-widest nav-item-style">{t('shop')}</Link>
                       <button onClick={() => { setMobileMenuOpen(false); setGuideOpen(true); }} className="flex w-full items-center gap-4 p-6 rounded-3xl bg-accent/5 text-[13px] font-black uppercase tracking-widest text-accent border border-accent/10 nav-item-style">
                         <BookOpen className="w-6 h-6" /> Museum Gids
                       </button>
                       <Link href="/admin" className="flex items-center gap-4 p-6 rounded-3xl bg-primary text-primary-foreground text-[13px] font-black uppercase tracking-widest nav-item-style">
                         <LayoutDashboard className="w-6 h-6" /> Beheer Paneel
                       </Link>
                     </div>
                     
                     <div className="space-y-4 pt-8 border-t border-black/5">
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] px-3 opacity-30">Collectie</p>
                       <Link href="/gallery" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black tracking-widest uppercase nav-item-style">
                         <LayoutGrid className="w-6 h-6 opacity-30" /> Alle Zalen
                       </Link>
                       <Link href="/curator" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black tracking-widest uppercase nav-item-style">
                         <Filter className="w-6 h-6 opacity-30" /> {t('your_room')}
                       </Link>
                       <div className="grid grid-cols-1 gap-2.5 pt-4">
                         {rooms?.map((r: any) => (
                           <Link key={r.id} href={`/room/${r.slug || r.id}`} className="p-5 rounded-2xl bg-black/[0.02] text-[12px] font-bold uppercase tracking-wider opacity-70 nav-item-style">{r.title}</Link>
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
    <Suspense fallback={<div className="h-24 md:h-32 flex items-center justify-center opacity-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
