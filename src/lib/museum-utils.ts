

/**
 * @fileOverview Museum Utilities voor sorteren en data-verwerking.
 */

export const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

/**
 * Centraal overzicht van alle tag-categorieën gebruikt in het museum.
 */
export const MUSEUM_TAGS = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache", "Litho", "Pentekening"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

/**
 * Parsed een titel (bijv. "13 XII" of "24a XI") naar sorteerbare waarden.
 * Prioriteert het Romeinse cijfer (meestal de serie/zaal) boven het getal.
 */
export const parseTitleForSort = (title: string) => {
  if (!title) return { romanVal: 999, num: 999, suffix: '' };
  
  // Zoek naar alle mogelijke Romeinse cijfers in de titel
  const romanPattern = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi;
  const matches = Array.from(title.matchAll(romanPattern));
  
  // Gebruik het LAATSTE Romeinse cijfer (bijv. in "13 XII" is XII de serie/zaal)
  const lastRoman = matches.length > 0 ? matches[matches.length - 1][0] : null;
  
  // Zoek naar gewone nummers en eventuele letters (bijv. "24a")
  // We zoeken naar het eerste getal in de string
  const numMatch = title.match(/(\d+)([a-z]*)?/i);
  
  return {
    romanVal: lastRoman ? (ROMAN_VALUES[lastRoman.toUpperCase()] || 999) : 999,
    num: numMatch ? parseInt(numMatch[1], 10) : 999,
    suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
  };
};

/**
 * Sorteerfunctie voor kunstwerken op basis van titel (Romeins -> Numeriek -> Suffix).
 * Dit zorgt ervoor dat "31 II" vóór "13 XII" komt (Zaal II vs Zaal XII).
 */
export const sortArtworksByTitle = (a: any, b: any) => {
  const pA = parseTitleForSort(a.title || '');
  const pB = parseTitleForSort(b.title || '');
  
  // 1. Eerst sorteren op Romeins cijfer (Zaal/Serie)
  if (pA.romanVal !== pB.romanVal) {
    return pA.romanVal - pB.romanVal;
  }
  
  // 2. Dan op het reguliere getal binnen die serie
  if (pA.num !== pB.num) {
    return pA.num - pB.num;
  }
  
  // 3. Als laatste op het achtervoegsel (bijv. 'a' of 'b')
  return pA.suffix.localeCompare(pB.suffix);
};

/**
 * Data sanitisatie helpers
 */
export const cleanString = (val?: string): string | null => {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const cleanArray = (arr?: any[]): string[] => {
  return (arr ?? [])
    .map(v => typeof v === 'string' ? v.trim() : v)
    .filter(v => v !== null && v !== undefined && v !== "");
};

