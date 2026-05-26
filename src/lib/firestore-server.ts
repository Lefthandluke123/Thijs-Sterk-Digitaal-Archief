
import { firebaseConfig } from '@/firebase/config';
import { slugify } from './museum-utils';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
 * Geoptimaliseerd voor multi-room architecture en maximale betrouwbaarheid.
 */

const PROJECT_ID = firebaseConfig.projectId;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const extract = (val: any): any => {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
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
  if (rawImage && typeof rawImage === 'string') {
    let finalUrl = rawImage;
    if (!rawImage.startsWith('http') && !rawImage.startsWith('data:')) {
      finalUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(rawImage)}?alt=media`;
    }
    data.image = finalUrl;
    data.imageUrl = finalUrl; 
  }
  return data;
};

export async function getRoomsServer() {
  try {
    // Gebruik revalidate: 0 om te garanderen dat nieuwe zalen direct zichtbaar zijn
    const res = await fetch(`${BASE_URL}/rooms`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || [])
      .map(mapDocument)
      .filter((r: any) => r && r.isPublic !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  } catch (e) { return []; }
}

/**
 * Bulletproof lookup voor zalen.
 * In plaats van runQuery (die indexen vereist), halen we alle zalen op en filteren we in-memory.
 */
export async function getRoomBySlugServer(slug: string) {
  if (!slug) return null;
  const targetSlug = slugify(slug);

  try {
    const rooms = await getRoomsServer();
    
    // 1. Zoek op directe slug match
    let room = rooms.find((r: any) => r.slug === slug || r.slug === targetSlug);
    
    // 2. Zoek op geslugificeerde titel (fallback voor oude data)
    if (!room) {
      room = rooms.find((r: any) => slugify(r.slug || r.title || "") === targetSlug);
    }
    
    // 3. Fallback: Zoek op document ID match
    if (!room) {
      room = rooms.find((r: any) => r.id === slug);
    }

    return room || null;
  } catch (e) {
    console.error("[Firestore Server] Error fetching room by slug:", e);
    return null;
  }
}

export async function getArtworksByRoomIdServer(roomId: string) {
  try {
    const url = `${BASE_URL}:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'artworks' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'roomIds' },
              op: 'ARRAY_CONTAINS',
              value: { stringValue: roomId }
            }
          }
        }
      }),
      next: { revalidate: 0 }
    });
    const results = await res.json();
    if (!Array.isArray(results)) return [];
    return results
      .filter((r: any) => r.document)
      .map((r: any) => mapDocument(r.document));
  } catch (e) { 
    console.error("[Firestore Server] Error fetching artworks for room:", e);
    return []; 
  }
}

export async function getArtworkBySlugServer(slug: string) {
  if (!slug) return null;
  const targetSlug = slugify(slug);

  try {
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
              value: { stringValue: targetSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 0 }
    });
    const results = await res.json();
    const docResult = results?.[0]?.document;
    
    if (docResult) return mapDocument(docResult);

    // Fallback op ID
    return await getArtworkServer(slug);
  } catch (e) { 
    return null; 
  }
}

export async function getArtworkServer(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/artworks/${id}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return mapDocument(await res.json());
  } catch (e) { return null; }
}
