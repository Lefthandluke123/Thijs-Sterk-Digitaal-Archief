import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
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
    if (f) Object.keys(f).forEach(k => resMap[k] = extract(f[k]));
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
  
  if (data.image && !data.image.startsWith('http')) {
    data.image = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(data.image)}?alt=media`;
  }
  if (data.imageUrl && !data.imageUrl.startsWith('http')) {
    data.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(data.imageUrl)}?alt=media`;
  }
  
  return data;
};

export async function getRoomsServer() {
  try {
    const res = await fetch(`${BASE_URL}/rooms?mask.fieldPaths=title&mask.fieldPaths=slug&mask.fieldPaths=order`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map(mapDocument).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  } catch (e) {
    return [];
  }
}

export async function getRoomBySlugServer(slug: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
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
      next: { revalidate: 60 }
    });
    const json = await res.json();
    return json[0]?.document ? mapDocument(json[0].document) : null;
  } catch (e) {
    return null;
  }
}

export async function getArtworksByRoomSlugServer(roomSlug: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
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
      next: { revalidate: 60 }
    });
    const json = await res.json();
    return (json || []).filter((j: any) => j.document).map((j: any) => mapDocument(j.document));
  } catch (e) {
    return [];
  }
}

export async function getArtworkBySlugServer(slug: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
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
      next: { revalidate: 60 }
    });
    const json = await res.json();
    return json[0]?.document ? mapDocument(json[0].document) : null;
  } catch (e) {
    return null;
  }
}

export async function getFeaturedArtworksServer() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'artworks' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'featured' },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          },
          limit: 6
        }
      }),
      next: { revalidate: 60 }
    });
    const json = await res.json();
    return (json || []).filter((j: any) => j.document).map((j: any) => mapDocument(j.document));
  } catch (e) {
    return [];
  }
}
