/**
 * @fileOverview Museum Utilities voor sorteren en data-verwerking.
 */

export const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

/**
 * Parsed een titel (bijv. "13 XII") naar sorteerbare waarden.
 */
export const parseTitleForSort = (title: string) => {
  if (!title) return { romanVal: 999, num: 999, suffix: '' };
  
  // Zoek naar Romeinse cijfers aan het einde (bijv. "III")
  const romanMatch = title.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/i);
  // Zoek naar gewone nummers aan het begin (bijv. "13")
  const numMatch = title.match(/(\d+)([a-z]*)?/i);
  
  return {
    romanVal: romanMatch ? (ROMAN_VALUES[romanMatch[1].toUpperCase()] || 999) : 999,
    num: numMatch ? parseInt(numMatch[1], 10) : 999,
    suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
  };
};

/**
 * Sorteerfunctie voor kunstwerken op basis van titel (Numeriek + Romeins).
 */
export const sortArtworksByTitle = (a: any, b: any) => {
  const pA = parseTitleForSort(a.displayTitle || a.title || '');
  const pB = parseTitleForSort(b.displayTitle || b.title || '');
  
  if (pA.romanVal !== pB.romanVal) return pA.romanVal - pB.romanVal;
  if (pA.num !== pB.num) return pA.num - pB.num;
  return pA.suffix.localeCompare(pB.suffix);
};
