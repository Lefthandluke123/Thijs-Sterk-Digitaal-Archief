/**
 * @fileOverview Museum Utilities - Hardened Version 2.0.
 * Geoptimaliseerd voor integrale stabiliteit en Multimedia support.
 */

export const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

export const MUSEUM_TAGS = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Litho", "Pentekening", "Gemengde techniek", "Glas in lood", "Houtskool", "Ets", "Zeefdruk", "Film/Video"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

export function slugify(text: string): string {
  if (!text) return "";
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

export function normalizeArtwork(id: string, data: any) {
  return {
    id,
    title: cleanString(data.title) || "Ongetiteld",
    displayTitle: cleanString(data.displayTitle) || cleanString(data.title) || "Ongetiteld",
    slug: cleanString(data.slug) || id,
    image: cleanString(data.image || data.imageUrl || data.url) || null,
    videoUrl: cleanString(data.videoUrl) || null,
    mediaType: data.mediaType === 'video' ? 'video' : 'image',
    description: cleanString(data.description) || "",
    year: cleanString(data.year)?.replace(/2026/g, '').trim() || "",
    medium: cleanString(data.medium) || "", 
    tags: Array.isArray(data.tags) ? data.tags : [],
    roomIds: Array.isArray(data.roomIds) ? data.roomIds : [],
    featured: Boolean(data.featured),
    inShop: Boolean(data.inShop),
    isMonumental: Boolean(data.isMonumental),
    brightness: typeof data.brightness === 'number' ? data.brightness : 1,
    audioUrls: data.audioUrls || {},
  };
}

export function sanitizeArtwork(input: any, timestamp?: any) {
  const baseTitle = cleanString(input.displayTitle) || cleanString(input.title) || "Ongetiteld";
  return {
    title: cleanString(input.title) || "Ongetiteld",
    displayTitle: baseTitle,
    slug: slugify(cleanString(input.slug) || baseTitle),
    image: cleanString(input.image) || null,
    videoUrl: cleanString(input.videoUrl) || null,
    mediaType: input.mediaType === 'video' ? 'video' : 'image',
    description: cleanString(input.description) || "",
    year: String(input.year || "").replace(/2026/g, '').trim(),
    medium: cleanString(input.medium) || "",
    tags: Array.isArray(input.tags) ? input.tags : [],
    roomIds: Array.isArray(input.roomIds) ? input.roomIds : [],
    featured: Boolean(input.featured),
    inShop: Boolean(input.inShop),
    isMonumental: Boolean(input.isMonumental),
    updatedAt: timestamp || null,
  };
}

export function cleanString(v?: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export const sortArtworksByTitle = (a: any, b: any) => {
  const parse = (t: string) => {
    const roman = t.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b/gi);
    const lastRoman = roman ? roman[roman.length - 1].toUpperCase() : null;
    return { romanVal: lastRoman ? (ROMAN_VALUES[lastRoman] || 999) : 999, original: t.toLowerCase() };
  };
  const pA = parse(a.displayTitle || a.title || '');
  const pB = parse(b.displayTitle || b.title || '');
  return pA.romanVal !== pB.romanVal ? pA.romanVal - pB.romanVal : pA.original.localeCompare(pB.original);
};
