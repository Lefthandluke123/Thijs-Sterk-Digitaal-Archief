
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
    gallery_all: 'Alle Zalen',
    gallery_select: 'Kies een zaal om te verkennen',
    curator_title: 'De Curator',
    curator_subtitle: 'Creëer uw eigen expositie',
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
    gallery_all: 'All Galleries',
    gallery_select: 'Select a gallery to explore',
    curator_title: 'The Curator',
    curator_subtitle: 'Create your own exhibition',
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
    gallery_all: 'Alle Galerien',
    gallery_select: 'Wählen Sie eine Galerie',
    curator_title: 'Der Kurator',
    curator_subtitle: 'Eigene Ausstellung erstellen',
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
    gallery_all: 'Toutes les Salles',
    gallery_select: 'Choisir une salle',
    curator_title: 'Le Conservateur',
    curator_subtitle: 'Créez votre propre exposition',
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
    gallery_all: 'Todas las Galerías',
    gallery_select: 'Selecciona una galería',
    curator_title: 'El Comisario',
    curator_subtitle: 'Crea tu propia exposición',
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
    const dbKey = language === 'nl' ? key : `${key}_${language}`;
    if (dbSettings && dbSettings[dbKey]) return dbSettings[dbKey];
    if (dbSettings && dbSettings[key]) return dbSettings[key];
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
