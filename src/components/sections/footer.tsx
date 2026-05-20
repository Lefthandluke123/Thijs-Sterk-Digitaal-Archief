"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-auto flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-full w-auto object-contain" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-t');
                if (fallback) (fallback as HTMLElement).style.display = 'block';
              }}
            />
            <div className="fallback-t hidden w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg">
              T
            </div>
          </div>
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <span className="font-headline font-medium tracking-tight text-xl text-foreground">Digitaal Museum</span>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-accent mt-1">Thijs Sterk (1913-1982)</span>
          </div>
        </div>
        
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-black opacity-40">
          &copy; {new Date().getFullYear()} Erven Thijs Sterk. {t('footer_rights')}
        </p>
        
        <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest">
          <Link href="/admin" className="text-muted-foreground hover:text-accent transition-colors">{t('nav_admin')}</Link>
          <a href="#" className="text-muted-foreground hover:text-accent transition-colors">{t('nav_privacy')}</a>
        </div>
      </div>
    </footer>
  );
}
