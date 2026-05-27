/**
 * @fileOverview Museum Utilities voor sorteren en data-verwerking.
 * Inclusief Hardening Layer voor Firestore data integriteit.
 */

import { serverTimestamp } from 'firebase/firestore';

export const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

export const MUSEUM_TAGS = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Litho", "Pentekening"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

/**
 * Maakt een string URL-vriendelijk (kebab-case).
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Normaliseert Firestore data voor veilig gebruik in de UI.
 */
export function normalizeArtwork(id: string, data: any) {
  // Verwijder "2026" uit het jaar voor weergave (fallback)
  const rawYear = cleanString(data.year) || "";
  const filteredYear = rawYear.replace(/2026/g, '').trim() || "";

  return {
    id,
    title: cleanString(data.title) || "Ongetiteld",
    displayTitle: cleanString(data.displayTitle) || cleanString(data.title) || "Ongetiteld",
    slug: cleanString(data.slug) || id,
    image: cleanString(data.image || data.imageUrl || data.url) || null,
    description: cleanString(data.description) || "",
    year: filteredYear,
    medium: cleanString(data.medium) || "Schilderij",
    tags: cleanArray(data.tags),
    roomIds: cleanArray(data.roomIds),
    featured: Boolean(data.featured),
    inShop: Boolean(data.inShop),
    brightness: typeof data.brightness === 'number' ? data.brightness : 1,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Centraal sanitization filter voor Artwork data (Writes).
 * Voorkomt expliciet corruptie van jaartallen en slugs.
 */
export function sanitizeArtwork(input: any) {
  const baseTitle = cleanString(input.displayTitle) || cleanString(input.title) || "Ongetiteld";
  const finalSlug = slugify(cleanString(input.slug) || baseTitle);
  
  // Strikte jaar validatie: verwijder 2026 en voorkom automatische fallbacks naar huidig jaar
  let finalYear = "";
  if (input.year !== undefined && input.year !== null) {
    finalYear = String(input.year).replace(/2026/g, '').trim();
  }

  return {
    title: cleanString(input.title) || "Ongetiteld",
    displayTitle: baseTitle,
    slug: finalSlug,
    image: cleanString(input.image) || null,
    description: cleanString(input.description) || "",
    year: finalYear,
    medium: cleanString(input.medium) || "",
    tags: cleanArray(input.tags),
    roomIds: cleanArray(input.roomIds),
    featured: Boolean(input.featured),
    inShop: Boolean(input.inShop),
    updatedAt: serverTimestamp(),
  };
}

export function cleanString(v?: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export function cleanArray(arr?: any[]): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .filter(v => v !== null && v !== undefined)
    .map(v => String(v).trim())
    .filter(v => v.length > 0 && v !== "undefined" && v !== "null");
}

/**
 * Analyseert een titel voor geavanceerde sortering (Romeins > Nummer > Alfabet).
 */
export const parseTitleForSort = (title: string) => {
  if (!title) return { romanVal: 999, num: 999, suffix: '' };
  
  const romanPattern = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi;
  const matches = Array.from(title.matchAll(romanPattern));
  const lastRoman = matches.length > 0 ? matches[matches.length - 1][0] : null;
  
  const numMatch = title.match(/(\d+)/);
  
  return {
    romanVal: lastRoman ? (ROMAN_VALUES[lastRoman.toUpperCase()] || 999) : 999,
    num: numMatch ? parseInt(numMatch[1], 10) : 999,
    original: title.toLowerCase()
  };
};

/**
 * Hoofd-sorteerfunctie voor kunstwerken.
 */
export const sortArtworksByTitle = (a: any, b: any) => {
  const titleA = a.displayTitle || a.title || '';
  const titleB = b.displayTitle || b.title || '';
  
  const pA = parseTitleForSort(titleA);
  const pB = parseTitleForSort(titleB);
  
  if (pA.romanVal !== pB.romanVal) {
    return pA.romanVal - pB.romanVal;
  }
  
  if (pA.num !== pB.num) {
    return pA.num - pB.num;
  }
  
  return pA.original.localeCompare(pB.original);
};
