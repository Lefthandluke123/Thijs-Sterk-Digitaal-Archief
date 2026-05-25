
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
 * Centraal sanitization filter voor Artwork data.
 * Voorkomt empty strings, undefined en corrupte arrays in Firestore.
 */
export function sanitizeArtwork(input: any) {
  return {
    title: cleanString(input.title) || "Naamloos",
    displayTitle: cleanString(input.displayTitle) || cleanString(input.title),
    slug: cleanString(input.slug),
    image: cleanString(input.image),
    description: cleanString(input.description) || "",
    year: cleanString(input.year) || "",
    medium: cleanString(input.medium) || "Olieverf op doek",
    tags: cleanArray(input.tags),
    roomIds: cleanArray(input.roomIds),
    featured: Boolean(input.featured),
    inShop: Boolean(input.inShop),
    updatedAt: serverTimestamp(),
  };
}

export function cleanString(v?: string | null): string | null {
  if (!v || typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export function cleanArray(arr?: any[]): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .map(v => typeof v === 'string' ? v.trim() : String(v).trim())
    .filter(v => v.length > 0 && v !== "undefined" && v !== "null");
}

export const parseTitleForSort = (title: string) => {
  if (!title) return { romanVal: 999, num: 999, suffix: '' };
  const romanPattern = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi;
  const matches = Array.from(title.matchAll(romanPattern));
  const lastRoman = matches.length > 0 ? matches[matches.length - 1][0] : null;
  const numMatch = title.match(/(\d+)([a-z]*)?/i);
  
  return {
    romanVal: lastRoman ? (ROMAN_VALUES[lastRoman.toUpperCase()] || 999) : 999,
    num: numMatch ? parseInt(numMatch[1], 10) : 999,
    suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
  };
};

export const sortArtworksByTitle = (a: any, b: any) => {
  const pA = parseTitleForSort(a.title || '');
  const pB = parseTitleForSort(b.title || '');
  if (pA.romanVal !== pB.romanVal) return pA.romanVal - pB.romanVal;
  if (pA.num !== pB.num) return pA.num - pB.num;
  return pA.suffix.localeCompare(pB.suffix);
};
