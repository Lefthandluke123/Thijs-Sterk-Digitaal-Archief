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

  const NavLink = ({ href, children, active, className }: { href: string; children: React.ReactNode; active: boolean; className?: string }) => (
    <Link 
      href={href}
      className={cn(
        "px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase transition-all flex items-center gap-2",
        active 
          ? "bg-primary text-primary-foreground shadow-lg scale-105" 
          : "text-foreground/70 hover:text-primary hover:bg-black/5"
      )}
    >
      {children}
    </Link>
  );

  const LanguagePills = ({ className }: { className?: string }) => (
    <div className={cn("flex bg-black/5 rounded-full p-1 border border-black/5", className)}>
      {(['nl', 'en', 'de', 'fr', 'es'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all",
            language === lang 
              ? "bg-white text-accent shadow-sm scale-110" 
              : "text-foreground/40 hover:text-foreground"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 md:h-24 px-4 flex items-center justify-center pointer-events-none">
        <div className="container max-w-7xl h-16 md:h-18 glass-panel rounded-full flex items-center justify-between px-6 pointer-events-auto">
          
          <Link 
            href="/"
            className="flex items-center gap-4 group cursor-pointer"
          >
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-8 md:h-10 w-auto object-contain" 
            />
            <div className="hidden sm:flex flex-col leading-tight border-l border-black/10 pl-4">
               <span className="font-headline font-medium text-lg md:text-xl tracking-tight text-foreground group-hover:text-accent transition-colors">
                 {siteTitle}
               </span>
               <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-accent/60 block">
                 {siteSubtitle}
               </span>
            </div>
          </Link>
          
          {mounted && (
            <div className="hidden lg:flex items-center gap-1">
              <NavLink href="/" active={pathname === "/"}>{t('nav_home')}</NavLink>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase transition-all flex items-center gap-1 outline-none",
                    pathname.includes('/room') || pathname === '/gallery' 
                      ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                      : "text-foreground/70 hover:bg-black/5"
                  )}>
                    {t('nav_galleries')} <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-white/95 backdrop-blur-2xl border-black/5 rounded-2xl min-w-[220px] p-2 shadow-2xl mt-2">
                  <DropdownMenuItem asChild className="text-[10px] uppercase font-black tracking-widest focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3 mb-1 border-b border-black/5">
                    <Link href="/gallery" className="flex w-full items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5" /> {t('gallery_all')}
                    </Link>
                  </DropdownMenuItem>
                  {rooms?.map((r: any) => (
                    <DropdownMenuItem key={r.id} asChild className="text-[10px] uppercase font-bold tracking-wide focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3">
                      <Link href={`/room/${r.slug}`} className="flex w-full items-center">
                        {r.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <NavLink href="/curator" active={pathname === "/curator"}>{t('nav_your_room')}</NavLink>
              <NavLink href="/shop" active={pathname === "/shop"}><ShoppingBag className="w-3.5 h-3.5" /> {t('nav_shop')}</NavLink>

              <div className="h-8 w-px bg-black/5 mx-3" />

              <button 
                onClick={() => setGuideOpen(true)} 
                className="px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase transition-all flex items-center gap-2 hover:bg-accent/5 text-accent"
              >
                <BookOpen className="w-3.5 h-3.5" /> Gids
              </button>

              <LanguagePills className="ml-3" />
            </div>
          )}

          <div className="lg:hidden flex items-center gap-2">
            <LanguagePills className="mr-2" />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/5">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0 border-none bg-background shadow-2xl">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-black/5 bg-primary text-primary-foreground rounded-bl-[3rem]">
                    <span className="font-headline text-2xl font-medium italic">{siteTitle}</span>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 mt-2">{siteSubtitle}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div className="space-y-2">
                       <Link href="/" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_home')}</Link>
                       <Link href="/shop" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[12px] font-black uppercase tracking-widest">{t('nav_shop')}</Link>
                       <button onClick={() => setGuideOpen(true)} className="flex w-full items-center gap-4 p-5 rounded-2xl bg-accent/5 text-[12px] font-black uppercase tracking-widest text-accent border border-accent/10">
                         <BookOpen className="w-5 h-5" /> Museum Gids
                       </button>
                     </div>
                     
                     <div className="space-y-3 pt-6 border-t border-black/5">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] px-2 opacity-30">Collectie</p>
                       <Link href="/gallery" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[12px] font-black tracking-widest uppercase">
                         <LayoutGrid className="w-5 h-5 opacity-40" /> Alle Zalen
                       </Link>
                       <Link href="/curator" className="flex items-center gap-4 p-5 rounded-2xl bg-black/5 text-[12px] font-black tracking-widest uppercase">
                         <Filter className="w-5 h-5 opacity-40" /> {t('nav_your_room')}
                       </Link>
                       <div className="grid grid-cols-1 gap-2 pt-2">
                         {rooms?.map((r: any) => (
                           <Link key={r.id} href={`/room/${r.slug}`} className="p-4 rounded-xl bg-black/[0.02] text-[11px] font-bold uppercase tracking-wider opacity-70">{r.title}</Link>
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
    <Suspense fallback={<div className="h-20 md:h-24 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>}>
      <NavbarContent />
    </Suspense>
  );
}
