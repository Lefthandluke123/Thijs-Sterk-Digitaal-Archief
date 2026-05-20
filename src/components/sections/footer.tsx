
"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function Footer() {
  const { t, language } = useLanguage();
  const firestore = useFirestore();

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const siteTitle = (language !== 'nl' && siteSettings?.[`siteTitle_${language}`])
    ? siteSettings[`siteTitle_${language}`]
    : (siteSettings?.siteTitle || t('nav_museum_title'));

  const siteSubtitle = (language !== 'nl' && siteSettings?.[`siteSubtitle_${language}`])
    ? siteSettings[`siteSubtitle_${language}`]
    : (siteSettings?.siteSubtitle || "Thijs Sterk (1913-1982)");
  
  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-auto flex items-center justify-center">
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-full w-auto object-contain" 
            />
          </div>
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <span className="font-headline font-medium tracking-tight text-xl text-foreground">{siteTitle}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-accent mt-1">{siteSubtitle}</span>
          </div>
        </div>
        
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-black opacity-40">
          &copy; {new Date().getFullYear()} {siteTitle}. {t('footer_rights')}
        </p>
        
        <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest">
          <Link href="/admin" className="text-muted-foreground hover:text-accent transition-colors">{t('nav_admin')}</Link>
          <a href="#" className="text-muted-foreground hover:text-accent transition-colors">{t('nav_privacy')}</a>
        </div>
      </div>
    </footer>
  );
}
