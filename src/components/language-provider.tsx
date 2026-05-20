
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'nl' | 'en' | 'de' | 'fr' | 'es';

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
    nav_shop: 'Winkel',
    nav_about: 'Over',
    nav_contact: 'Contact',
    nav_admin: 'Beheer',
    shop_title: 'Museumwinkel',
    shop_subtitle: 'Haal een Sterk in huis',
    shop_intro: 'Hoogwaardige reproducties, van ansichtkaart tot Fine Art print.',
    shop_postcard: 'Ansichtkaart',
    shop_poster: 'Poster',
    shop_print: 'Fine Art Print',
    shop_digital: 'Digitale Download',
    shop_order_now: 'Nu Bestellen',
    shop_order_form: 'Bestelformulier',
    shop_add_to_cart: 'In Winkelwagen',
    shop_details: 'Product Details',
    shop_format: 'Formaat',
    shop_price: 'Prijs',
    shop_order_success: 'Bestelling Ontvangen',
    shop_order_desc: 'Bedankt voor uw bestelling. Wij nemen via e-mail contact met u op voor de afhandeling en verzending.',
    order_label_name: 'Naam',
    order_label_email: 'E-mail',
    order_label_address: 'Adres & Postcode',
    order_button_confirm: 'Bevestig Bestelling',
    footer_rights: 'Alle rechten voorbehouden.',
    hero_start_walk: 'Begin de Wandeling',
    hero_subtitle: 'Digitale Collectie',
  },
  en: {
    nav_home: 'Home',
    nav_tour: 'Tour',
    nav_galleries: 'Galleries',
    nav_your_room: 'Your Room',
    nav_shop: 'Shop',
    nav_about: 'About',
    nav_contact: 'Contact',
    nav_admin: 'Admin',
    shop_title: 'Museum Shop',
    shop_subtitle: 'Bring a Sterk into your home',
    shop_intro: 'High-quality reproductions, from postcards to Fine Art prints.',
    shop_postcard: 'Postcard',
    shop_poster: 'Poster',
    shop_print: 'Fine Art Print',
    shop_digital: 'Digital Download',
    shop_order_now: 'Order Now',
    shop_order_form: 'Order Form',
    shop_add_to_cart: 'Add to Cart',
    shop_details: 'Product Details',
    shop_format: 'Format',
    shop_price: 'Price',
    shop_order_success: 'Order Received',
    shop_order_desc: 'Thank you for your order. We will contact you via email for payment and shipping.',
    order_label_name: 'Name',
    order_label_email: 'Email',
    order_label_address: 'Address & Postal Code',
    order_button_confirm: 'Confirm Order',
    footer_rights: 'All rights reserved.',
    hero_start_walk: 'Start the Walk',
    hero_subtitle: 'Digital Collection',
  },
  de: {
    nav_home: 'Home',
    nav_tour: 'Tour',
    nav_galleries: 'Galerien',
    nav_your_room: 'Ihr Saal',
    nav_shop: 'Laden',
    nav_about: 'Über',
    nav_contact: 'Kontakt',
    nav_admin: 'Beheer',
    shop_title: 'Museumsshop',
    shop_subtitle: 'Holen Sie sich einen Sterk nach Hause',
    shop_postcard: 'Postkarte',
    shop_poster: 'Poster',
    shop_print: 'Kunstdruck',
    shop_digital: 'Digitaler Download',
    shop_order_now: 'Jetzt Bestellen',
    shop_order_success: 'Bestellung erhalten',
    footer_rights: 'Alle Rechte vorbehalten.',
    hero_start_walk: 'Wanderung beginnen',
    hero_subtitle: 'Digitale Sammlung',
  },
  fr: {
    nav_home: 'Accueil',
    nav_tour: 'Visite',
    nav_galleries: 'Salles',
    nav_your_room: 'Votre Salle',
    nav_shop: 'Boutique',
    nav_about: 'À propos',
    nav_contact: 'Contact',
    shop_title: 'Boutique du Musée',
    shop_postcard: 'Carte postale',
    shop_poster: 'Poster',
    shop_print: 'Impression d\'art',
    shop_digital: 'Téléchargement numérique',
    shop_order_now: 'Commander',
    footer_rights: 'Tous droits réservés.',
    hero_start_walk: 'Commencer la visite',
    hero_subtitle: 'Collection numérique',
  },
  es: {
    nav_home: 'Inicio',
    nav_tour: 'Visita',
    nav_galleries: 'Galerías',
    nav_your_room: 'Su Sala',
    nav_shop: 'Tienda',
    nav_about: 'Acerca de',
    nav_contact: 'Contacto',
    shop_title: 'Tienda del Museo',
    shop_postcard: 'Postal',
    shop_poster: 'Póster',
    shop_print: 'Impresión de arte',
    shop_digital: 'Descarga digital',
    shop_order_now: 'Pedir ahora',
    footer_rights: 'Todos los derechos reservados.',
    hero_start_walk: 'Iniciar la Visita',
    hero_subtitle: 'Colección Digital',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('nl');

  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved && ['nl', 'en', 'de', 'fr', 'es'].includes(saved)) {
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
