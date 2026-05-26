"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  Layout, 
  ShoppingBag, 
  ZoomIn, 
  Info, 
  Keyboard,
  Layers,
  BookOpen,
  Filter,
  CheckCircle2,
  MousePointer2
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

interface MuseumGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MuseumGuide({ open, onOpenChange }: MuseumGuideProps) {
  const { t } = useLanguage();

  const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-accent/20 pb-3">
        <Icon className="w-5 h-5 text-accent" />
        <h3 className="font-headline text-lg font-light uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      <div className="grid gap-6">
        {children}
      </div>
    </div>
  );

  const Item = ({ label, desc, icon: Icon }: { label: string, desc: string, icon?: any }) => (
    <div className="flex gap-5 group">
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-accent/5 flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-500">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-wider text-foreground/80">{label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed font-light">{desc}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-background border-none rounded-[2.5rem] shadow-2xl">
        <DialogTitle className="sr-only">{t('guide_welcome')}</DialogTitle>
        
        {/* Header Hero */}
        <div className="bg-primary p-12 md:p-16 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
          <div className="relative z-10 space-y-6 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 mx-auto">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Museum Handboek</span>
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-light leading-tight">
              {t('guide_welcome').split('&').map((word, i, arr) => 
                i === 1 ? <span key={i} className="italic text-accent"> & {word} </span> : word + ' '
              )}
            </h1>
            <p className="text-lg text-primary-foreground/60 font-light leading-relaxed">
              {t('guide_intro')}
            </p>
          </div>
        </div>

        <div className="p-8 md:p-16 space-y-20">
          {/* Section: Concept & Rooms */}
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <Section title={t('guide_concept_title')} icon={Sparkles}>
               <div className="bg-secondary/5 p-8 rounded-3xl border border-border/10 space-y-6">
                 <p className="text-muted-foreground leading-relaxed text-sm italic font-medium">
                   {t('guide_concept_desc')}
                 </p>
                 <Item 
                  icon={Layers} 
                  label={t('guide_rooms_title')} 
                  desc={t('guide_rooms_desc')} 
                />
               </div>
            </Section>

            <Section title={t('guide_curator_manual_title')} icon={Filter}>
               <div className="space-y-6">
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-sm font-light leading-relaxed">{t('guide_curator_step1')}</p>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-sm font-light leading-relaxed">{t('guide_curator_step2')}</p>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-sm font-light leading-relaxed">{t('guide_curator_step3')}</p>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-1" />
                    <p className="text-sm font-light leading-relaxed">{t('guide_curator_step4')}</p>
                  </div>
               </div>
            </Section>
          </div>

          {/* Section: Interaction & Navigation */}
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <Section title={t('guide_viewer_title')} icon={ZoomIn}>
              <Item 
                icon={MousePointer2} 
                label={t('guide_viewer_zoom_label')} 
                desc={t('guide_viewer_zoom_desc')} 
              />
              <Item 
                icon={Info} 
                label={t('viewer_show_info') || "Metadata"} 
                desc={t('guide_viewer_info_desc')} 
              />
            </Section>

            <Section title={t('guide_nav_title')} icon={Layout}>
              <Item 
                icon={Layout} 
                label={t('guide_nav_tour_label')} 
                desc={t('guide_nav_tour_desc')} 
              />
              <Item 
                icon={ShoppingBag} 
                label={t('shop')} 
                desc={t('guide_nav_shop_desc')} 
              />
            </Section>
          </div>

          {/* Section: Keyboard Controls */}
          <div className="space-y-10">
            <div className="flex items-center gap-3 border-b border-accent/20 pb-3">
              <Keyboard className="w-5 h-5 text-accent" />
              <h3 className="font-headline text-lg font-light uppercase tracking-widest text-foreground">{t('guide_controls_title')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { key: 'ESC', label: t('guide_controls_esc') },
                { key: '← / →', label: t('guide_controls_arrows') },
                { key: 'SCROLL', label: t('guide_controls_scroll') },
                { key: 'CLICK', label: t('guide_controls_click') }
              ].map((ctrl) => (
                <div key={ctrl.key} className="bg-secondary/10 p-8 rounded-[2rem] text-center space-y-4 hover:bg-secondary/20 transition-colors border border-border/5">
                  <kbd className="inline-block px-4 py-2 rounded-xl bg-white shadow-md font-black text-xs border-b-4 border-black/10 text-accent">
                    {ctrl.key}
                  </kbd>
                  <p className="text-[9px] uppercase font-black tracking-widest opacity-60 leading-tight">
                    {ctrl.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center pt-8 pb-12">
             <div className="h-px w-24 bg-accent/20 mx-auto mb-10" />
             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-accent/50 italic max-w-sm mx-auto leading-relaxed">
               {t('guide_footer')}
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
