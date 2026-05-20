
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
    nav_collections: 'Collecties',
    nav_privacy: 'Privacy',
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
    hero_your_room: 'Stel uw eigen zaal samen',
    hero_subtitle: 'Digitale Collectie',
    gallery_select: 'Kies een Zaal',
    gallery_closed: 'Deze zaal is momenteel niet toegankelijk.',
    curator_title: 'Uw eigen expositie',
    curator_subtitle: 'Curator van het Retrospectief',
    curator_clear: 'Filters wissen',
    curator_open: 'Open Zaal',
    curator_other: 'Overig',
    curator_no_results: 'Geen werken gevonden voor deze combinatie.',
    viewer_room: 'Zaal',
    viewer_unknown_year: 'Jaartal onbekend',
    viewer_prev: 'Vorige',
    viewer_next: 'Volgende',
    viewer_show_info: 'Toon informatie',
    viewer_hide_info: 'Verberg informatie',
    viewer_unknown: 'Interactief',
    end_of_room: 'Einde van deze zaal',
    prev_room: 'Vorige Zaal',
    next_room: 'Volgende Zaal',
    all_works: 'Alle werken',
    contact_label_name: 'Naam',
    contact_label_email: 'E-mail',
    contact_label_subject: 'Onderwerp',
    contact_label_message: 'Bericht / Herinnering',
    contact_button_send: 'Verstuur Bericht',
    contact_phone: 'Telefoon',
    contact_location: 'Locatie',
    contact_loc_value: 'Noord-Holland, Nederland',
    contact_success_title: 'Bericht Verzonden',
    contact_success_desc: 'Bedankt voor uw bericht. We nemen zo snel mogelijk contact met u op.',
    contact_placeholder_name: 'Uw naam',
    contact_placeholder_email: 'uw@email.nl',
    contact_placeholder_subject: 'Waar gaat het over?',
    contact_placeholder_message: 'Uw verhaal of vraag...',
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
    nav_collections: 'Collections',
    nav_privacy: 'Privacy',
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
    hero_your_room: 'Curate your own room',
    hero_subtitle: 'Digital Collection',
    gallery_select: 'Choose a Gallery',
    gallery_closed: 'This gallery is currently closed.',
    curator_title: 'Your own exhibition',
    curator_subtitle: 'Curator of the Retrospective',
    curator_clear: 'Clear filters',
    curator_open: 'Open Room',
    curator_other: 'Other',
    curator_no_results: 'No works found for this combination.',
    viewer_room: 'Room',
    viewer_unknown_year: 'Year unknown',
    viewer_prev: 'Previous',
    viewer_next: 'Next',
    viewer_show_info: 'Show information',
    viewer_hide_info: 'Hide information',
    viewer_unknown: 'Interactive',
    end_of_room: 'End of this gallery',
    prev_room: 'Previous Room',
    next_room: 'Next Room',
    all_works: 'All works',
    contact_label_name: 'Name',
    contact_label_email: 'Email',
    contact_label_subject: 'Subject',
    contact_label_message: 'Message / Memory',
    contact_button_send: 'Send Message',
    contact_phone: 'Phone',
    contact_location: 'Location',
    contact_loc_value: 'North Holland, Netherlands',
    contact_success_title: 'Message Sent',
    contact_success_desc: 'Thank you for your message. We will contact you as soon as possible.',
    contact_placeholder_name: 'Your name',
    contact_placeholder_email: 'your@email.com',
    contact_placeholder_subject: 'What is it about?',
    contact_placeholder_message: 'Your story or question...',
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
    curator_other: 'Andere',
    all_works: 'Alle Werke',
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
    curator_other: 'Autre',
    all_works: 'Toutes les œuvres',
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
    curator_other: 'Otro',
    all_works: 'Todas las obras',
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
    return translations[language][key] || translations['nl'][key] || key;
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
