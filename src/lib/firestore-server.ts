import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
 * This fetches data in Server Components without initializing the Firebase Client SDK.
 * It prevents "Attempted to call initializeFirebase() from the server" errors and is crawler-friendly.
 */

export async function getArtworkServer(id: string) {
  const projectId = firebaseConfig.projectId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/artworks/${id}`;
  
  try {
    const res = await fetch(url, { 
      next: { revalidate: 3600 }, // Cache for 1 hour for bots/crawlers
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      if (res.status === 403) {
        console.warn(`Firestore REST Access Forbidden (403). Check security rules for public read on /artworks/${id}`);
      }
      if (res.status !== 404) {
        console.error(`Firestore REST Error: ${res.status} ${res.statusText}`);
      }
      return null;
    }
    
    const json = await res.json();
    const fields = json.fields;
    if (!fields) return null;

    const artwork: any = { id };
    
    // Recursive helper to transform Firestore REST JSON to plain JS object
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

    Object.keys(fields).forEach(key => {
      artwork[key] = extract(fields[key]);
    });

    // Ensure image URLs are absolute for Facebook crawler
    if (artwork.imageUrl && !artwork.imageUrl.startsWith('http')) {
      artwork.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(artwork.imageUrl)}?alt=media`;
    }

    return artwork;
  } catch (e) {
    console.error("Firestore REST Fetch Exception:", e);
    return null;
  }
}
