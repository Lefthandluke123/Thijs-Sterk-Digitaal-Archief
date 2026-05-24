
import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Server-side Firestore data fetching via REST API met Audit Logging.
 * Gebruikt om te debuggen waarom data-fetching faalt of lege resultaten geeft.
 */

const PROJECT_ID = firebaseConfig.projectId;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

console.log('--- FIRESTORE SERVER AUDIT START ---');
console.log('Project ID:', PROJECT_ID);
console.log('Base URL:', BASE_URL);
console.log('------------------------------------');

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

export async function getRoomsServer() {
  try {
    console.log('[API] Ophalen van alle zalen via GET /rooms');
    const res = await fetch(`${BASE_URL}/rooms`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) {
      console.error(`[API ERROR] Rooms status: ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    console.log('[RAW RESPONSE] getRoomsServer:', JSON.stringify(json).substring(0, 200) + '...');
    
    const docs = (json.documents || []).map(mapDocument).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    console.log('[MAPPED] Aantal zalen gevonden:', docs.length);
    if (docs.length > 0) console.log('[SAMPLE ROOM]:', docs[0].title, docs[0].slug);
    
    return docs;
  } catch (e) {
    console.error('[CRITICAL] getRoomsServer catch:', e);
    return [];
  }
}

export async function getRoomBySlugServer(slug: string) {
  try {
    console.log(`[API] Zoeken naar zaal met slug: "${slug}" via runQuery`);
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
              value: { stringValue: slug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    console.log(`[RAW RESPONSE] getRoomBySlugServer ("${slug}"):`, JSON.stringify(json));
    
    // De REST API retourneert een array. De data zit in het object met de 'document' key.
    const result = Array.isArray(json) ? json.find(item => item.document) : null;
    const mapped = result?.document ? mapDocument(result.document) : null;
    
    console.log(`[MAPPED] getRoomBySlugServer resultaat gevonden:`, !!mapped);
    return mapped;
  } catch (e) {
    console.error(`[CRITICAL] getRoomBySlugServer ("${slug}"):`, e);
    return null;
  }
}

export async function getArtworksByRoomSlugServer(roomSlug: string) {
  try {
    console.log(`[API] Ophalen kunstwerken voor zaal: "${roomSlug}" via runQuery`);
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
              value: { stringValue: roomSlug }
            }
          }
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    console.log(`[RAW RESPONSE] getArtworksByRoomSlugServer ("${roomSlug}"):`, JSON.stringify(json).substring(0, 200) + '...');
    
    if (!Array.isArray(json)) {
      console.warn(`[API WARN] Geen array teruggekregen voor kunstwerken in zaal: ${roomSlug}`);
      return [];
    }
    
    const docs = json
      .filter((j: any) => j.document)
      .map((j: any) => mapDocument(j.document));
      
    console.log(`[MAPPED] getArtworksByRoomSlugServer aantal:`, docs.length);
    if (docs.length > 0) console.log('[SAMPLE ARTWORK]:', docs[0].title, docs[0].image);
    
    return docs;
  } catch (e) {
    console.error(`[CRITICAL] getArtworksByRoomSlugServer ("${roomSlug}"):`, e);
    return [];
  }
}

export async function getArtworkBySlugServer(slug: string) {
  try {
    console.log(`[API] Zoeken naar kunstwerk met slug: "${slug}" via runQuery`);
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
              value: { stringValue: slug }
            }
          },
          limit: 1
        }
      }),
      next: { revalidate: 30 }
    });
    const json = await res.json();
    console.log(`[RAW RESPONSE] getArtworkBySlugServer ("${slug}"):`, JSON.stringify(json));
    
    const result = Array.isArray(json) ? json.find(item => item.document) : null;
    const mapped = result?.document ? mapDocument(result.document) : null;
    
    console.log(`[MAPPED] getArtworkBySlugServer gevonden:`, !!mapped);
    return mapped;
  } catch (e) {
    console.error(`[CRITICAL] getArtworkBySlugServer ("${slug}"):`, e);
    return null;
  }
}

export async function getArtworkServer(id: string) {
  try {
    console.log(`[API] Ophalen kunstwerk met ID: "${id}" via GET /artworks/${id}`);
    const res = await fetch(`${BASE_URL}/artworks/${id}`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) {
      console.error(`[API ERROR] Artwork ID ${id} status: ${res.status}`);
      return null;
    }
    const json = await res.json();
    const mapped = mapDocument(json);
    console.log(`[MAPPED] getArtworkServer gevonden:`, !!mapped);
    return mapped;
  } catch (e) {
    console.error(`[CRITICAL] getArtworkServer catch:`, e);
    return null;
  }
}
