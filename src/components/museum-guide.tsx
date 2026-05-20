
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  Layout, 
  ShoppingBag, 
  MousePointer2, 
  ZoomIn, 
  Info, 
  Keyboard,
  ArrowRight,
  Globe2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

interface MuseumGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MuseumGuide({ open, onOpenChange }: MuseumGuideProps) {
  const { t } = useLanguage();

  const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-accent/20 pb-2">
        <Icon className="w-5 h-5 text-accent" />
        <h3 className="font-headline text-lg font-light uppercase tracking-widest">{title}</h3>
      </div>
      <div className="grid gap-4">
        {children}
      </div>
    </div>
  );

  const Item = ({ label, desc, icon: Icon }: { label: string, desc: string, icon?: any }) => (
    <div className="flex gap-4 group">
      {Icon && (
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-all">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-wider text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed font-light">{desc}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 bg-background border-none rounded-[2rem] shadow-2xl">
        <div className="bg-primary p-12 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Safe Harbor Architecture</span>
            </div>
            <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">
              {t('guide_welcome').split(' ').map((word, i, arr) => 
                i >= arr.length - 2 ? <span key={i} className="italic">{word} </span> : word + ' '
              )}
            </h1>
            <p className="text-xl text-primary-foreground/70 font-light max-w-2xl leading-relaxed">
              {t('guide_intro')}
            </p>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-16">
          <Section title={t('guide_concept_title')} icon={Sparkles}>
            <p className="text-muted-foreground leading-relaxed italic border-l-4 border-accent pl-6">
              {t('guide_concept_quote')}
            </p>
          </Section>

          <div className="grid md:grid-cols-2 gap-12">
            <Section title={t('guide_nav_title')} icon={Layout}>
              <Item 
                icon={Zap} 
                label={t('guide_nav_tour_label')} 
                desc={t('guide_nav_tour_desc')} 
              />
              <Item 
                icon={Globe2} 
                label={t('guide_nav_galleries_label')} 
                desc={t('guide_nav_galleries_desc')} 
              />
              <Item 
                icon={MousePointer2} 
                label={t('guide_nav_curator_label')} 
                desc={t('guide_nav_curator_desc')} 
              />
              <Item 
                icon={ShoppingBag} 
                label={t('guide_nav_shop_label')} 
                desc={t('guide_nav_shop_desc')} 
              />
            </Section>

            <Section title={t('guide_viewer_title')} icon={ZoomIn}>
              <Item 
                icon={ZoomIn} 
                label={t('guide_viewer_zoom_label')} 
                desc={t('guide_viewer_zoom_desc')} 
              />
              <Item 
                icon={Info} 
                label={t('guide_viewer_info_label')} 
                desc={t('guide_viewer_info_desc')} 
              />
              <Item 
                icon={ArrowRight} 
                label={t('guide_viewer_browse_label')} 
                desc={t('guide_viewer_browse_desc')} 
              />
            </Section>
          </div>

          <Section title={t('guide_controls_title')} icon={Keyboard}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-secondary/10 p-8 rounded-3xl">
              <div className="text-center space-y-2">
                <kbd className="px-3 py-1.5 rounded-lg bg-white shadow-sm font-black text-xs border-b-4 border-black/10">ESC</kbd>
                <p className="text-[9px] uppercase font-bold opacity-40">{t('guide_controls_esc')}</p>
              </div>
              <div className="text-center space-y-2">
                <kbd className="px-3 py-1.5 rounded-lg bg-white shadow-sm font-black text-xs border-b-4 border-black/10">← / →</kbd>
                <p className="text-[9px] uppercase font-bold opacity-40">{t('guide_controls_arrows')}</p>
              </div>
              <div className="text-center space-y-2">
                <kbd className="px-3 py-1.5 rounded-lg bg-white shadow-sm font-black text-xs border-b-4 border-black/10">SCROLL</kbd>
                <p className="text-[9px] uppercase font-bold opacity-40">{t('guide_controls_scroll')}</p>
              </div>
              <div className="text-center space-y-2">
                <kbd className="px-3 py-1.5 rounded-lg bg-white shadow-sm font-black text-xs border-b-4 border-black/10">CLICK</kbd>
                <p className="text-[9px] uppercase font-bold opacity-40">{t('guide_controls_click')}</p>
              </div>
            </div>
          </Section>
          
          <div className="text-center pb-8">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/50 italic">
               {t('guide_footer')}
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
