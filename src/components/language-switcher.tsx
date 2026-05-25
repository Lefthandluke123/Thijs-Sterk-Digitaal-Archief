"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

/**
 * @fileOverview LanguageSwitcher: Een standalone, globale UI-control voor taalkeuze.
 * Volledig ontkoppeld van menu-state of navigatie-hiërarchie.
 */

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn(
      "flex flex-nowrap items-center bg-black/[0.03] rounded-full p-1 border border-black/[0.03] shadow-inner no-scrollbar",
      "overflow-x-auto -webkit-overflow-scrolling-touch",
      className
    )}>
      {(['nl', 'en', 'de', 'fr', 'es'] as const).map((lang) => (
        <button
          key={lang}
          onClick={(e) => {
            // Directe switch, voorkom interactie met eventuele parent menu-handlers
            e.preventDefault();
            e.stopPropagation();
            setLanguage(lang);
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all flex-shrink-0 min-w-[32px] h-7 flex items-center justify-center outline-none",
            language === lang 
              ? "bg-white text-accent shadow-md scale-110 z-10" 
              : "text-foreground/30 hover:text-foreground/60"
          )}
          aria-label={`Switch to ${lang}`}
          aria-pressed={language === lang}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
