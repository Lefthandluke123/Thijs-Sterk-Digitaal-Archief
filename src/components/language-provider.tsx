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
    home: 'Home',
    galleries: 'Zalen',
    your_room: 'Uw Zaal',
    shop: 'Winkel',
    about: 'Introductie',
    museum_title: 'Het Digitale Retrospectief',
    museum_subtitle: 'Licht, Ruimte en Water',
    contact: 'Contact',
    admin: 'Beheer',
    privacy: 'Privacy',
    footer_rights: 'Alle rechten voorbehouden.',
    hero_start_walk: 'Naar de zalen',
    hero_your_room: 'Stel uw eigen wandeling samen',
    homeHeroBadge: 'Mondiaal Retrospectief',
    homeHeroTitle: 'Een leven gewijd aan Licht, Ruimte en Water',
    homeHeroSubtitle: 'Ontdek de verstilde kracht van het Noord-Hollandse landschap door de ogen van een meester.',
    homeIntroBadge: 'De Collectie',
    homeIntroTitle: 'Een Kennismaking',
    homeIntroSubtitle: 'Een dwarsdoorsnede van het oeuvre.',
    homeBioBadge: 'De Biografie',
    homePortfolioTitle: 'Meester Selectie',
    gallery_all: 'Alle Zalen',
    gallery_select: 'Kies een zaal om te verkennen',
    curator_title: 'Word de inrichter van uw eigen museum. Kies thema’s en richt uw eigen virtuele tentoonstelling in. Combineer favoriete werken en deel uw unieke collectie met de wereld.',
    curator_subtitle: 'Stel uw eigen expositie samen',
    curator_open: 'Open uw galerij',
    curator_clear: 'Wissen',
    curator_link_ready: 'Privékamer gereed!',
    // Guide Translations
    guide_welcome: 'Welkom & Ontdekking',
    guide_intro: 'Dit digitale platform is een levend archief van het oeuvre van Thijs Sterk. Hieronder leest u hoe u het meeste uit uw bezoek kunt halen.',
    guide_concept_title: 'Het Concept',
    guide_concept_desc: 'Focus op de atmosferische kracht van het Noord-Hollandse landschap. Licht, ruimte en water vormen de kern van elk werk.',
    guide_rooms_title: 'Thematische Zalen',
    guide_rooms_desc: 'Bezoek onze samengestelde rondleidingen die elk een specifiek aspect of periode van de kunstenaar belichten.',
    guide_curator_manual_title: 'Zelf Samenstellen',
    guide_curator_step1: 'Stap 1: Selecteer thema\'s of technieken die u aanspreken in de omgeving voor samenstellen.',
    guide_curator_step2: 'Stap 2: Open uw persoonlijke galerij om alleen die werken te zien.',
    guide_curator_step3: 'Stap 3: Genereer een unieke link om uw selectie te bewaren.',
    guide_curator_step4: 'Stap 4: Deel uw expositie met vrienden of op social media.',
    guide_nav_title: 'Navigatie',
    guide_nav_tour_label: 'De Tour',
    guide_nav_tour_desc: 'Gebruik de pijlen of de voortgangsbalk onderaan om door een zaal te wandelen.',
    guide_nav_shop_desc: 'Gecertificeerde reproducties zijn direct verkrijgbaar bij elk werk.',
    guide_viewer_title: 'De Viewer',
    guide_viewer_zoom_label: 'Deep Zoom',
    guide_viewer_zoom_desc: 'Klik of scroll op een werk om in te zoomen tot op de penseelstreek.',
    guide_viewer_info_desc: 'Klik op het info-icoon voor jaartal, techniek en het verhaal achter het werk.',
    guide_controls_title: 'Sneltoetsen',
    guide_controls_esc: 'Sluit venster',
    guide_controls_arrows: 'Volgend werk',
    guide_controls_scroll: 'In/Uit zoomen',
    guide_controls_click: 'Detail bekijken',
    guide_footer: 'Geniet van de verstilling en de ruimte.'
  },
  en: {
    home: 'Home',
    galleries: 'Galleries',
    your_room: 'Your Gallery',
    shop: 'Shop',
    about: 'Introduction',
    museum_title: 'The Digital Retrospective',
    museum_subtitle: 'Light, Space and Water',
    contact: 'Contact',
    admin: 'Admin',
    privacy: 'Privacy',
    footer_rights: 'All rights reserved.',
    hero_start_walk: 'To the galleries',
    hero_your_room: 'Assemble your own walk',
    homeHeroBadge: 'Global Retrospective',
    homeHeroTitle: 'A life dedicated to Light, Space and Water',
    homeHeroSubtitle: 'Discover the tranquil power of the North Holland landscape through the eyes of a master.',
    homeIntroBadge: 'The Collection',
    homeIntroTitle: 'An Introduction',
    homeIntroSubtitle: 'A cross-section of the oeuvre.',
    homeBioBadge: 'The Biography',
    homePortfolioTitle: 'Master Selection',
    gallery_all: 'All Galleries',
    gallery_select: 'Select a gallery to explore',
    curator_title: 'Create your own room! Become the designer of your own museum. Choose themes and set up your own virtual exhibition. Combine your favorite works and share your unique collection with the world!',
    curator_subtitle: 'Assemble your own exhibition',
    curator_open: 'Open your gallery',
    curator_clear: 'Clear',
    curator_link_ready: 'Private room ready!',
    // Guide Translations
    guide_welcome: 'Welcome & Discovery',
    guide_intro: 'This digital platform is a living archive of Thijs Sterk\'s work. Below you can read how to make the most of your visit.',
    guide_concept_title: 'The Concept',
    guide_concept_desc: 'Focus on the atmospheric power of the North Holland landscape. Light, space and water are the core of every work.',
    guide_rooms_title: 'Themed Rooms',
    guide_rooms_desc: 'Visit our curated tours, each highlighting a specific aspect or period of the artist.',
    guide_curator_manual_title: 'Self-Assembling',
    guide_curator_step1: 'Step 1: Select themes or techniques that appeal to you in the Assembly environment.',
    guide_curator_step2: 'Step 2: Open your personal gallery to see only those works.',
    guide_curator_step3: 'Step 3: Generate a unique link to save your selection.',
    guide_curator_step4: 'Step 4: Share your exhibition with friends or on social media.',
    guide_nav_title: 'Navigation',
    guide_nav_tour_label: 'The Tour',
    guide_nav_tour_desc: 'Use the arrows or the progress bar at the bottom to walk through a room.',
    guide_nav_shop_desc: 'Certified reproductions are available directly with each work.',
    guide_viewer_title: 'The Viewer',
    guide_viewer_zoom_label: 'Deep Zoom',
    guide_viewer_zoom_desc: 'Click or scroll on a work to zoom in to the brushstroke.',
    guide_viewer_info_desc: 'Click the info icon for year, technique and the story behind the work.',
    guide_controls_title: 'Hotkeys',
    guide_controls_esc: 'Close window',
    guide_controls_arrows: 'Next work',
    guide_controls_scroll: 'Zoom In/Out',
    guide_controls_click: 'View detail',
    guide_footer: 'Enjoy the silence and the space.'
  },
  de: {
    home: 'Home',
    galleries: 'Galerien',
    your_room: 'Ihr Saal',
    shop: 'Laden',
    about: 'Einleitung',
    museum_title: 'Die Digitale Retrospektive',
    museum_subtitle: 'Licht, Raum und Wasser',
    contact: 'Kontakt',
    admin: 'Admin',
    privacy: 'Datenschutz',
    footer_rights: 'Alle Rechte vorbehalten.',
    hero_start_walk: 'Zu den Galerien',
    hero_your_room: 'Zusammenstellen',
    homeHeroBadge: 'Globale Retrospektive',
    homeHeroTitle: 'Ein leven voor Licht, Raum und Wasser',
    homeHeroSubtitle: 'Entdecken Sie die stille Kraft der nordholländischen Landschaft durch die Augen eines Meisters.',
    homeIntroBadge: 'Die Sammlung',
    homeIntroTitle: 'Ein Kennenlernen',
    homeIntroSubtitle: 'Ein Querschnitt durch das Gesamtwerk.',
    homeBioBadge: 'Die Biografie',
    homePortfolioTitle: 'Meister-Auswahl',
    gallery_all: 'Alle Galerien',
    gallery_select: 'Wählen Sie eine Galerie',
    curator_title: 'Erschaffen Sie Ihren eigenen Saal! Werden Sie zum Einrichter Ihres eigenen Museums. Wählen Sie Themen und richten Sie Ihre eigene virtuelle Ausstellung ein. Kombinieren Sie Ihre Lieblingswerke und teilen Sie Ihre einzigartige Sammlung mit der Welt!',
    curator_subtitle: 'Eigene Ausstellung zusammenstellen',
    curator_open: 'Galerie öffnen',
    curator_clear: 'Löschen',
    curator_link_ready: 'Privatraum fertig!',
    // Guide Translations
    guide_welcome: 'Willkommen & Entdeckung',
    guide_intro: 'Diese digitale Plattform ist ein lebendiges Archiv des Werks von Thijs Sterk. Erfahren Sie hier, wie Sie Ihren Besuch optimal nutzen können.',
    guide_concept_title: 'Das Konzept',
    guide_concept_desc: 'Fokus auf die atmosphärische Kraft der nordholländischen Landschaft. Licht, Raum und Wasser sind der Kern jedes Werkes.',
    guide_rooms_title: 'Themenräume',
    guide_rooms_desc: 'Besuchen Sie unsere kuratierten Touren, die jeweils einen bestimmten Aspekt oder Zeitraum des Künstlers hervorheben.',
    guide_curator_manual_title: 'Selbst Zusammenstellen',
    guide_curator_step1: 'Schritt 1: Wählen Sie Themen oder Techniken aus, die Sie ansprechen.',
    guide_curator_step2: 'Schritt 2: Öffnen Sie Ihre persönliche Galerie.',
    guide_curator_step3: 'Schritt 3: Erstellen Sie einen Link, um Ihre Auswahl zu speichern.',
    guide_curator_step4: 'Schritt 4: Teilen Sie Ihre Ausstellung in den sozialen Medien.',
    guide_nav_title: 'Navigation',
    guide_nav_tour_label: 'Die Tour',
    guide_nav_tour_desc: 'Nutzen Sie die Pfeile of den Fortschrittsbalken, um durch einen Raum zu gehen.',
    guide_nav_shop_desc: 'Zertifizierte Reproduktionen sind direkt bei jedem Werk erhältlich.',
    guide_viewer_title: 'Der Viewer',
    guide_viewer_zoom_label: 'Deep Zoom',
    guide_viewer_zoom_desc: 'Klicken oder scrollen Sie op een Werk, um bis zum Pinselstrich hineinzuzoomen.',
    guide_viewer_info_desc: 'Klicken Sie op het Info-Icon für Jahreszahl, Technik und Geschichte.',
    guide_controls_title: 'Tastenkombinationen',
    guide_controls_esc: 'Fenster schließen',
    guide_controls_arrows: 'Nächstes Werk',
    guide_controls_scroll: 'Ein/Aus zoomen',
    guide_controls_click: 'Detail ansehen',
    guide_footer: 'Genießen Sie die Stille und den Raum.'
  },
  fr: {
    home: 'Accueil',
    galleries: 'Salles',
    your_room: 'Votre Salle',
    shop: 'Boutique',
    about: 'Introduction',
    museum_title: 'La Rétrospective Digitale',
    museum_subtitle: 'Lumière, Espace et Eau',
    contact: 'Contact',
    admin: 'Admin',
    privacy: 'Confidentialité',
    footer_rights: 'Tous droits réservés.',
    hero_start_walk: 'Vers les salles',
    hero_your_room: 'Composer promenade',
    homeHeroBadge: 'Rétrospective Mondiale',
    homeHeroTitle: 'Une vie dédiée à la lumière, à l\'espace et à l\'eau',
    homeHeroSubtitle: 'Découvrez la puissance tranquille du paysage de la Hollande du Nord à travers les yeux d\'un maître.',
    homeIntroBadge: 'La Collection',
    homeIntroTitle: 'Faire connaissance',
    homeIntroSubtitle: 'Un aperçu de l\'œuvre.',
    homeBioBadge: 'La Biographie',
    homePortfolioTitle: 'Sélection de maître',
    gallery_all: 'Toutes les Salles',
    gallery_select: 'Choisir une salle',
    curator_title: 'Créez votre propre salle ! Devenez l\'inaugurateur de votre propre musée. Choisissez des thèmes et créez votre propre exposition virtuelle. Partagez votre collection unique avec le monde !',
    curator_subtitle: 'Composer votre propre exposition',
    curator_open: 'Ouvrir la galerie',
    curator_clear: 'Effacer',
    curator_link_ready: 'Nouvelle salle prête!',
    // Guide Translations
    guide_welcome: 'Bienvenue & Découverte',
    guide_intro: 'Cette plateforme numérique est une archive vivante de l\'œuvre de Thijs Sterk. Apprenez comment profiter au mieux de votre visite.',
    guide_concept_title: 'Le Concept',
    guide_concept_desc: 'Focus sur la puissance atmosphérique du paysage de la Hollande du Nord. La lumière, l\'espace et l\'eau sont au cœur de chaque œuvre.',
    guide_rooms_title: 'Salles Thématiques',
    guide_rooms_desc: 'Visitez nos visites guidées, chacune soulignant un aspect ou une période spécifique de l\'artiste.',
    guide_curator_manual_title: 'Composer soi-même',
    guide_curator_step1: 'Étape 1 : Sélectionnez des thèmes ou des techniques dans l\'espace Assemblage.',
    guide_curator_step2: 'Étape 2 : Ouvrez votre galerie personnelle.',
    guide_curator_step3: 'Étape 3 : Générez un lien unique pour sauvegarder votre sélection.',
    guide_curator_step4: 'Étape 4 : Partagez votre exposition sur les réseaux sociaux.',
    guide_nav_title: 'Navigation',
    guide_nav_tour_label: 'La Visite',
    guide_nav_tour_desc: 'Utilisez les flèches ou la barre de progression pour parcourir une salle.',
    guide_nav_shop_desc: 'Des reproductions certifiées sont disponibles directement pour chaque œuvre.',
    guide_viewer_title: 'Le Visionneur',
    guide_viewer_zoom_label: 'Deep Zoom',
    guide_viewer_zoom_desc: 'Cliquez ou faites défiler une œuvre pour zoomer jusqu\'au coup de pinceau.',
    guide_viewer_info_desc: 'Cliquez sur l\'icône info pour l\'année, la technique et l\'histoire de l\'œuvre.',
    guide_controls_title: 'Raccourcis',
    guide_controls_esc: 'Fermer la fenêtre',
    guide_controls_arrows: 'Œuvre suivante',
    guide_controls_scroll: 'Zoomer/Dézoomer',
    guide_controls_click: 'Voir le détail',
    guide_footer: 'Profitez du silence et de l\'espace.'
  },
  es: {
    home: 'Inicio',
    galleries: 'Galerías',
    your_room: 'Su Sala',
    shop: 'Tienda',
    about: 'Introducción',
    museum_title: 'La Retrospectiva Digital',
    museum_subtitle: 'Luz, Espacio y Agua',
    contact: 'Contacto',
    admin: 'Admin',
    privacy: 'Privacidad',
    footer_rights: 'Todos los derechos reservados.',
    hero_start_walk: 'A las salas',
    hero_your_room: 'Componga paseo',
    homeHeroBadge: 'Retrospectiva Mundial',
    homeHeroTitle: 'Una vida dedicada a la luz, el espacio y el agua',
    homeHeroSubtitle: 'Descubra la fuerza tranquila del paisaje de Holanda Septentrional a través de los ojos de un maestro.',
    homeIntroBadge: 'La Colección',
    homeIntroTitle: 'Una Presentación',
    homeIntroSubtitle: 'Un corte transversal de la obra.',
    homeBioBadge: 'La Biografía',
    homePortfolioTitle: 'Selección Maestra',
    gallery_all: 'Todas las Galerías',
    gallery_select: 'Selecciona una galería',
    curator_title: '¡Crea tu propia sala! Conviértete en el inrrequitor de tu eigen museo. Elige temas y configura tu propia exposición virtual. ¡Compartte tu colección única con el mundo!',
    curator_subtitle: 'Componga su eigen exposición',
    curator_open: 'Abrir galería',
    curator_clear: 'Borrar',
    curator_link_ready: '¡Sala privada lista!',
    // Guide Translations
    guide_welcome: 'Bienvenido y Descubrimiento',
    guide_intro: 'Esta plataforma digital es un archivo vivo de la obra de Thijs Sterk. Aprenda a aprovechar al máximo su visita.',
    guide_concept_title: 'El Concepto',
    guide_concept_desc: 'Enfoque en el poder atmosférico del paisaje de Holanda Septentrional. La luz, el espacio y el agua son el núcleo de cada obra.',
    guide_rooms_title: 'Salas Temáticas',
    guide_rooms_desc: 'Visite nuestros recorridos seleccionados, cada uno de los cuales destaca un aspecto o período específico del artista.',
    guide_curator_manual_title: 'Autocomposición',
    guide_curator_step1: 'Paso 1: Seleccione temas o técnicas en el entorno del Comisario.',
    guide_curator_step2: 'Paso 2: Abra su galería personal.',
    guide_curator_step3: 'Paso 3: Genere un enlace único para guardar su selección.',
    guide_curator_step4: 'Paso 4: Comparta su exposición en las redes sociales.',
    guide_nav_title: 'Navegación',
    guide_nav_tour_label: 'El Recorrido',
    guide_nav_tour_desc: 'Utilice las flechas o la barre de progreso para caminar por una sala.',
    guide_nav_shop_desc: 'Las reproducciones certificadas están disponibles directamente con cada obra.',
    guide_viewer_title: 'El Visor',
    guide_viewer_zoom_label: 'Deep Zoom',
    guide_viewer_zoom_desc: 'Haga clic o desplácese por una obra para acercarse hasta la pincelada.',
    guide_viewer_info_desc: 'Haga clic en el icono de información para conocer el año, la técnica y la historia.',
    guide_controls_title: 'Atajos',
    guide_controls_esc: 'Cerrar ventana',
    guide_controls_arrows: 'Siguiente obra',
    guide_controls_scroll: 'Acercar/Alejar',
    guide_controls_click: 'Ver detalle',
    guide_footer: 'Disfruta del silencio y el espacio.'
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-lang', lang);
    }
  };

  const t = (key: string) => {
    if (!mounted) return key; // Guard tegen hydration mismatch
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
