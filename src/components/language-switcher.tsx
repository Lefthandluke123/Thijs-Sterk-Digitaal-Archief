"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

/**
 * @fileOverview LanguageSwitcher: Een standalone pillbox UI voor 5 talen.
 * Ontworpen voor maximale consistentie en anti-overflow op kleine schermen.
 */

interface LanguageSwitcherProps {
  className?: string;
}

const LANGUAGES = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
] as const;

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn(
      "flex flex-nowrap items-center bg-black/[0.04] rounded-full p-1 border border-black/5 shadow-inner no-scrollbar",
      "overflow-x-auto -webkit-overflow-scrolling-touch min-w-0 max-w-full",
      className
    )}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLanguage(lang.code as any);
          }}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all duration-500 flex-shrink-0 min-w-[36px] h-7 flex items-center justify-center outline-none",
            language === lang.code 
              ? "bg-white text-accent shadow-md scale-105 z-10" 
              : "text-foreground/30 hover:text-foreground/60"
          )}
          aria-label={`Switch to ${lang.label}`}
          aria-pressed={language === lang.code}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
