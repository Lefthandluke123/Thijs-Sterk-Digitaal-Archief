import { firebaseConfig } from '@/firebase/config';

/**
 * @fileOverview Server-side Firestore data fetching via REST API.
 * Hiermee halen we data op in Server Components zonder de Firebase Client SDK te initialiseren.
 * Dit voorkomt "Attempted to call initializeFirebase() from the server" errors.
 */

export async function getArtworkServer(id: string) {
  const projectId = firebaseConfig.projectId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/artworks/${id}`;
  
  try {
    const res = await fetch(url, { 
      next: { revalidate: 60 }, // Cache voor 1 minuut voor optimale performance
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!res.ok) {
      if (res.status !== 404) {
        console.error(`Firestore REST Error: ${res.status} ${res.statusText}`);
      }
      return null;
    }
    
    const json = await res.json();
    const fields = json.fields;
    if (!fields) return null;

    const artwork: any = { id };
    
    // Recursieve helper om Firestore REST JSON om te zetten naar een plat JS object
    const extract = (val: any): any => {
      if (!val) return undefined;
      if ('stringValue' in val) return val.stringValue;
      if ('booleanValue' in val) return val.booleanValue;
      if ('integerValue' in val) return parseInt(val.integerValue, 10);
      if ('doubleValue' in val) return val.doubleValue;
      if ('timestampValue' in val) return val.timestampValue;
      if ('arrayValue' in val) return val.arrayValue.values?.map((v: any) => extract(v)) || [];
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

    return artwork;
  } catch (e) {
    console.error("Firestore REST Fetch Exception:", e);
    return null;
  }
}
