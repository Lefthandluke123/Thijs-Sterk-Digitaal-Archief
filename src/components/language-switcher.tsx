
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from 'lucide-react';

/**
 * @fileOverview LanguageSwitcher: Een stabiele dropdown voor taalkeuze.
 * Vervangt de complexe pillbox om layout-conflicten en overflow te voorkomen.
 */

interface LanguageSwitcherProps {
  className?: string;
}

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
] as const;

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select 
        value={language} 
        onValueChange={(val) => setLanguage(val as any)}
      >
        <SelectTrigger className="w-[140px] h-10 rounded-full bg-black/[0.04] border-black/5 shadow-inner text-[10px] font-black uppercase tracking-widest focus:ring-accent">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 opacity-40" />
            <SelectValue placeholder="Taal" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-2xl border-black/5 rounded-2xl shadow-2xl">
          {LANGUAGES.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="text-[10px] font-bold uppercase tracking-widest focus:bg-accent focus:text-accent-foreground rounded-xl cursor-pointer p-3"
            >
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
