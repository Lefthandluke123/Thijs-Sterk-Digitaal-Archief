
import { firebaseConfig } from '@/firebase/config';
import { slugify } from './museum-utils';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
 * Geoptimaliseerd voor multi-room architecture en betrouwbare data parsing.
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
    const res = await fetch(`${BASE_URL}/rooms`, { next: { revalidate: 10 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || [])
      .map(mapDocument)
      .filter((r: any) => r && r.isPublic !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  } catch (e) { return []; }
}

export async function getRoomBySlugServer(slug: string) {
  if (!slug) return null;
  
  try {
    const url = `${BASE_URL}:runQuery`;
    // We zoeken op de exacte slug zoals die door de website wordt gegenereerd
    const searchSlug = slugify(slug);
    
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
              value: { stringValue: searchSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 10 }
    });
    
    const results = await res.json();
    const doc = results?.[0]?.document;
    
    if (doc) {
      return mapDocument(doc);
    }
    
    // Fallback: Als slug-search faalt, probeer of de 'slug' parameter stiekem een document ID is
    const fallbackRes = await fetch(`${BASE_URL}/rooms/${slug}`);
    if (fallbackRes.ok) {
      return mapDocument(await fallbackRes.json());
    }

    return null;
  } catch (e) { 
    console.error("[Firestore Server] Error fetching room:", e);
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
      next: { revalidate: 10 }
    });
    const results = await res.json();
    return results.filter((r: any) => r.document).map((r: any) => mapDocument(r.document));
  } catch (e) { return []; }
}

export async function getArtworkBySlugServer(slug: string) {
  if (!slug) return null;
  try {
    const url = `${BASE_URL}:runQuery`;
    const searchSlug = slugify(slug);
    
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
              value: { stringValue: searchSlug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 10 }
    });
    const results = await res.json();
    return results?.[0]?.document ? mapDocument(results[0].document) : null;
  } catch (e) { return null; }
}

export async function getArtworkServer(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/artworks/${id}`, { next: { revalidate: 10 } });
    if (!res.ok) return null;
    return mapDocument(await res.json());
  } catch (e) { return null; }
}
