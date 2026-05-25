
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type Language = 'nl' | 'en' | 'de' | 'fr' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dynamicContent: Record<string, any>;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Vaste UI strings die altijd beschikbaar moeten zijn (fallback)
const staticTranslations: Record<Language, Record<string, string>> = {
  nl: {
    nav_home: 'Home',
    nav_galleries: 'Zalen',
    nav_your_room: 'Uw Zaal',
    nav_shop: 'Winkel',
    nav_about: 'Introductie',
    nav_museum_title: 'Het Digitale Retrospectief',
    nav_museum_subtitle: 'Licht, Ruimte en Water',
    hero_start_walk: 'Naar de zalen',
    hero_your_room: 'Maak je eigen wandeling',
  },
  en: {
    nav_home: 'Home',
    nav_galleries: 'Galleries',
    nav_your_room: 'Your Gallery',
    nav_shop: 'Shop',
    nav_about: 'Introduction',
    nav_museum_title: 'The Digital Retrospective',
    nav_museum_subtitle: 'Light, Space and Water',
    hero_start_walk: 'To the galleries',
    hero_your_room: 'Create your own walk',
  },
  de: {
    nav_home: 'Home',
    nav_galleries: 'Galerien',
    nav_your_room: 'Ihr Saal',
    nav_shop: 'Laden',
    nav_about: 'Einleitung',
    nav_museum_title: 'Die Digitale Retrospektive',
    nav_museum_subtitle: 'Licht, Raum und Wasser',
    hero_start_walk: 'Zu den Galerien',
    hero_your_room: 'Spaziergang machen',
  },
  fr: {
    nav_home: 'Accueil',
    nav_galleries: 'Salles',
    nav_your_room: 'Votre Salle',
    nav_shop: 'Boutique',
    nav_about: 'Introduction',
    nav_museum_title: 'La Rétrospective Digitale',
    nav_museum_subtitle: 'Lumière, Espace et Eau',
    hero_start_walk: 'Vers les salles',
    hero_your_room: 'Créer promenade',
  },
  es: {
    nav_home: 'Inicio',
    nav_galleries: 'Galerías',
    nav_your_room: 'Su Sala',
    nav_shop: 'Tienda',
    nav_about: 'Introducción',
    nav_museum_title: 'La Retrospectiva Digital',
    nav_museum_subtitle: 'Luz, Espacio y Agua',
    hero_start_walk: 'A las salas',
    hero_your_room: 'Crea paseo',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('nl');
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved && ['nl', 'en', 'de', 'fr', 'es'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  // Fetch dynamische content van de server
  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);
  
  const { data: dbSettings, loading } = useDoc(settingsRef);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-lang', lang);
  };

  const t = (key: string) => {
    // 1. Check eerst in de database settings voor dit specifiek veld + taal
    const dbKey = language === 'nl' ? key : `${key}_${language}`;
    if (dbSettings && dbSettings[dbKey]) return dbSettings[dbKey];

    // 2. Check in database voor default (NL) veld
    if (dbSettings && dbSettings[key]) return dbSettings[key];

    // 3. Fallback naar hardcoded statische strings
    return staticTranslations[language]?.[key] || staticTranslations['nl'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dynamicContent: dbSettings || {}, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
