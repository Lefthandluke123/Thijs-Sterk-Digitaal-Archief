'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'nl' | 'en' | 'de' | 'fr';

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
    next_room: 'Volgende Zaal',
    prev_room: 'Vorige Zaal',
    all_works: 'Alle Werken',
    end_of_room: 'Einde van deze zaal',
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
    next_room: 'Next Gallery',
    prev_room: 'Previous Gallery',
    all_works: 'All Works',
    end_of_room: 'End of this gallery',
  },
  de: {
    nav_home: 'Home',
    nav_tour: 'Tour',
    nav_galleries: 'Galerien',
    nav_your_room: 'Ihr Saal',
    nav_about: 'Über',
    nav_contact: 'Kontakt',
    nav_admin: 'Verwaltung',
    nav_privacy: 'Datenschutz',
    nav_collections: 'Sammlungen',
    footer_rights: 'Alle Rechte vorbehalten.',
    hero_start_walk: 'Wanderung beginnen',
    hero_your_room: 'Ihr eigener Saal',
    hero_subtitle: 'Digitale Sammlung',
    curator_title: 'Ihr eigener Saal',
    curator_subtitle: 'Stellen Sie Ihre persönliche Auswahl aus dem Oeuvre zusammen',
    curator_clear: 'Auswahl löschen',
    curator_open: 'Ihren Saal öffnen',
    gallery_select: 'Wählen Sie einen Saal',
    gallery_closed: 'Dieser Saal ist derzeit geschlossen',
    viewer_room: 'Saal',
    viewer_unknown: 'Unbekannt',
    next_room: 'Nächster Saal',
    prev_room: 'Voriger Saal',
    all_works: 'Alle Werke',
    end_of_room: 'Ende dieses Saals',
  },
  fr: {
    nav_home: 'Accueil',
    nav_tour: 'Visite',
    nav_galleries: 'Salles',
    nav_your_room: 'Votre Salle',
    nav_about: 'À propos',
    nav_contact: 'Contact',
    nav_admin: 'Administration',
    nav_privacy: 'Confidentialité',
    nav_collections: 'Collections',
    footer_rights: 'Tous droits réservés.',
    hero_start_walk: 'Commencer la visite',
    hero_your_room: 'Votre propre salle',
    hero_subtitle: 'Collection numérique',
    curator_title: 'Votre propre salle',
    curator_subtitle: 'Composez votre sélection personnelle de l\'œuvre',
    curator_clear: 'Effacer la sélection',
    curator_open: 'Ouvrir votre salle',
    gallery_select: 'Sélectionnez une salle',
    gallery_closed: 'Cette salle est actuellement fermée',
    viewer_room: 'Salle',
    viewer_unknown: 'Inconnu',
    next_room: 'Salle Suivante',
    prev_room: 'Salle Précédente',
    all_works: 'Toutes les œuvres',
    end_of_room: 'Fin de cette salle',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('nl');

  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved && (saved === 'nl' || saved === 'en' || saved === 'de' || saved === 'fr')) {
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
