'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'nl' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  nl: {
    nav_home: 'Home',
    nav_tour: 'Tour',
    nav_galleries: 'Zalen',
    nav_your_room: 'Uw Zaal',
    nav_about: 'Over',
    nav_contact: 'Contact',
    nav_admin: 'Beheer',
    nav_privacy: 'Privacy',
    nav_collections: 'Collecties',
    footer_rights: 'Alle rechten voorbehouden.',
    hero_start_walk: 'Begin de Wandeling',
    hero_your_room: 'Uw Eigen Zaal',
    hero_subtitle: 'Digitale Collectie',
    curator_title: 'Uw Eigen Zaal',
    curator_subtitle: 'Stel uw persoonlijke selectie samen uit het oeuvre',
    curator_clear: 'Wis Selectie',
    curator_open: 'Open Uw Zaal',
    gallery_select: 'Selecteer een zaal',
    gallery_closed: 'Deze zaal is momenteel gesloten',
    viewer_room: 'Zaal',
    viewer_unknown: 'Onbekend',
  },
  en: {
    nav_home: 'Home',
    nav_tour: 'Tour',
    nav_galleries: 'Galleries',
    nav_your_room: 'Your Room',
    nav_about: 'About',
    nav_contact: 'Contact',
    nav_admin: 'Admin',
    nav_privacy: 'Privacy',
    nav_collections: 'Collections',
    footer_rights: 'All rights reserved.',
    hero_start_walk: 'Start the Walk',
    hero_your_room: 'Your Own Room',
    hero_subtitle: 'Digital Collection',
    curator_title: 'Your Own Gallery',
    curator_subtitle: 'Curate your personal selection from the oeuvre',
    curator_clear: 'Clear Selection',
    curator_open: 'Open Your Gallery',
    gallery_select: 'Select a gallery',
    gallery_closed: 'This gallery is currently closed',
    viewer_room: 'Gallery',
    viewer_unknown: 'Unknown',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('nl');

  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved && (saved === 'nl' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-lang', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
