"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export function Footer() {
  const { t, language } = useLanguage();
  const firestore = useFirestore();

  const siteSettingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const siteTitle = (language !== 'nl' && siteSettings?.[`siteTitle_${language}`])
    ? siteSettings[`siteTitle_${language}`]
    : (siteSettings?.siteTitle || t('museum_title'));

  const siteSubtitle = (language !== 'nl' && siteSettings?.[`siteSubtitle_${language}`])
    ? siteSettings[`siteSubtitle_${language}`]
    : (siteSettings?.siteSubtitle || t('museum_subtitle'));
  
  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="h-10 w-auto flex items-center justify-center">
            <img 
              src={siteSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="h-full w-auto object-contain transition-all duration-1000 group-hover:scale-110 animate-logo-float" 
            />
          </div>
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <span className="font-headline font-medium tracking-tight text-xl text-foreground group-hover:text-accent transition-colors">{siteTitle}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-accent mt-1">{siteSubtitle}</span>
          </div>
        </Link>
        
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-black opacity-40">
          &copy; {siteTitle}. {t('footer_rights')}
        </p>
        
        <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest">
          <Link href="/#contact" className="text-muted-foreground hover:text-accent transition-colors">{t('contact')}</Link>
          <Link href="/admin" className="text-muted-foreground hover:text-accent transition-colors">{t('admin')}</Link>
          <a href="#" className="text-muted-foreground hover:text-accent transition-colors">{t('privacy')}</a>
        </div>
      </div>
    </footer>
  );
}
