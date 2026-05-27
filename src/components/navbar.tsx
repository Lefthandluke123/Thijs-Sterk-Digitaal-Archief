"use client";

import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
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
  LayoutDashboard,
  Users
} from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/components/language-provider';
import { MuseumGuide } from './museum-guide';
import { LanguageSwitcher } from './language-switcher';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

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
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const roomsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: rooms } = useCollection(roomsQuery);

  const siteSettingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const getSiteIdentity = () => {
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

  const handleLogoClick = async () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 2000);

    if (newCount >= 4) {
      setLogoClicks(0);
      const logoUrl = siteSettings?.logoUrl || "/logo.png";
      const colors = await extractColors(logoUrl);
      window.dispatchEvent(new CustomEvent('trigger-simulation', { detail: { colors } }));
    }
  };

  const extractColors = (imgUrl: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(["#0F0"]);
        canvas.width = 10;
        canvas.height = 10;
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        const colors = [];
        for (let i = 0; i < data.length; i += 16) {
          if (data[i+3] > 50) {
            colors.push(`rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`);
          }
        }
        resolve(colors.length > 0 ? colors : ["#0F0"]);
      };
      img.onerror = () => resolve(["#0F0"]);
    });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-24 md:h-32 px-4 md:px-6 flex items-center justify-center pointer-events-none">
        <div className="container max-w-7xl h-16 md:h-22 glass-panel rounded-full flex flex-nowrap items-center justify-between px-4 md:px-8 pointer-events-auto border-white/60 shadow-2xl">
          
          <div className="flex-shrink-0 min-w-0">
            <div className="flex items-center gap-3 md:gap-6 group cursor-pointer" onClick={handleLogoClick}>
              <Link href="/" className="contents">
                <img 
                  src={siteSettings?.logoUrl || "/logo.png"} 
                  alt="Logo" 
                  className="h-10 md:h-20 w-auto object-contain transition-all duration-1000 hover:scale-110 flex-shrink-0 hover:animate-logo-float" 
                />
              </Link>
              <div className="hidden sm:flex flex-col leading-tight border-l-2 border-accent/10 pl-4 md:pl-6 min-w-0">
                 <span className="font-headline font-medium text-lg md:text-2xl tracking-tight text-foreground group-hover:text-accent transition-colors truncate">
                   {siteTitle}
                 </span>
                 <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-accent/50 block truncate">
                   {siteSubtitle}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <NavLink href="/" active={pathname === "/"}>{t('home')}</NavLink>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-1 outline-none nav-item-style",
                    pathname.includes('/room') 
                      ? "bg-accent text-accent-foreground shadow-lg scale-105" 
                      : "text-foreground/60 hover:bg-accent/5"
                  )}>
                    {t('galleries')} <ChevronDown className="w-3 h-3 opacity-30" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-white/95 backdrop-blur-2xl border-black/5 rounded-3xl min-w-[240px] p-2 shadow-2xl mt-4">
                  {rooms?.map((r: any) => (
                    <DropdownMenuItem key={r.id} asChild className="text-[10px] uppercase font-bold tracking-wider focus:bg-accent focus:text-accent-foreground rounded-2xl cursor-pointer p-4">
                      <Link href={`/room/${r.slug || r.id}`} className="flex w-full items-center">{r.title}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <NavLink href="/curator" active={pathname === "/curator"}>{t('your_room')}</NavLink>
              <NavLink href="/forum" active={pathname === "/forum"}><Users className="w-4 h-4" /> Vrienden</NavLink>
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
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                     <div className="space-y-3">
                       <Link href="/" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black uppercase tracking-widest nav-item-style">{t('home')}</Link>
                       <Link href="/forum" className="flex items-center gap-4 p-6 rounded-3xl bg-accent/5 text-[13px] font-black uppercase tracking-widest text-accent border border-accent/10 nav-item-style">
                         <Users className="w-6 h-6" /> Forum
                       </Link>
                       <Link href="/shop" className="flex items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black uppercase tracking-widest nav-item-style">{t('shop')}</Link>
                       <button onClick={() => { setMobileMenuOpen(false); setGuideOpen(true); }} className="flex w-full items-center gap-4 p-6 rounded-3xl bg-black/5 text-[13px] font-black uppercase tracking-widest nav-item-style">
                         <BookOpen className="w-6 h-6" /> Museum Gids
                       </button>
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
