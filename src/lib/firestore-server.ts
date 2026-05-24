
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
 * Geoptimaliseerd voor betrouwbare parsing van runQuery resultaten en slug normalisatie.
 */

const PROJECT_ID = firebaseConfig.projectId;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const extract = (val: any): any => {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return val.arrayValue.values?.map((v: any) => extract(v)) || [];
  }
  if ('mapValue' in val) {
    const resMap: any = {};
    const f = val.mapValue.fields;
    if (f) Object.keys(f).forEach(key => resMap[key] = extract(f[key]));
    return resMap;
  }
  return undefined;
};

const mapDocument = (doc: any) => {
  if (!doc || !doc.fields) return null;
  const id = doc.name.split('/').pop();
  const data: any = { id };
  Object.keys(doc.fields).forEach(key => {
    data[key] = extract(doc.fields[key]);
  });
  
  // Normaliseer afbeelding URLs
  const rawImage = data.image || data.imageUrl || data.url;
  if (rawImage) {
    let finalUrl = rawImage;
    if (!rawImage.startsWith('http')) {
      finalUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(rawImage)}?alt=media`;
    }
    data.image = finalUrl;
    data.imageUrl = finalUrl; 
  }
  return data;
};

/**
 * Haalt alle zalen op via een eenvoudige GET collectie-oproep.
 */
export async function getRoomsServer() {
  try {
    const res = await fetch(`${BASE_URL}/rooms`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || [])
      .map(mapDocument)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  } catch (e) {
    return [];
  }
}

/**
 * Haalt een zaal op basis van slug via runQuery.
 * Normaliseert de slug naar lowercase en trimt whitespace.
 */
export async function getRoomBySlugServer(slug: string) {
  try {
    const normalizedSlug = (slug || "").toLowerCase().trim();
    const url = `${BASE_URL}:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'rooms' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: normalizedSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    
    if (!Array.isArray(json)) return null;
    const result = json.find((item: any) => item && item.document);
    return result?.document ? mapDocument(result.document) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Haalt alle kunstwerken voor een zaal op via runQuery.
 */
export async function getArtworksByRoomSlugServer(roomSlug: string) {
  try {
    const normalizedSlug = (roomSlug || "").toLowerCase().trim();
    const url = `${BASE_URL}:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'artworks' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'roomSlug' },
              op: 'EQUAL',
              value: { stringValue: normalizedSlug }
            }
          }
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    
    if (!Array.isArray(json)) return [];
    
    return json
      .filter((item: any) => item && item.document)
      .map((item: any) => mapDocument(item.document))
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * Haalt een specifiek kunstwerk op basis van slug via runQuery.
 */
export async function getArtworkBySlugServer(slug: string) {
  try {
    const normalizedSlug = (slug || "").toLowerCase().trim();
    const url = `${BASE_URL}:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'artworks' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: normalizedSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    
    if (!Array.isArray(json)) return null;
    const result = json.find((item: any) => item && item.document);
    return result?.document ? mapDocument(result.document) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Haalt een kunstwerk op via een directe GET met Document ID.
 */
export async function getArtworkServer(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/artworks/${id}`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return mapDocument(json);
  } catch (e) {
    return null;
  }
}
