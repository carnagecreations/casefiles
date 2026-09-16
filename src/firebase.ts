import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

// Same Firebase project used by the original Case File site (casefilescc).
// Email/Password sign-in only — accounts are created by hand in the
// Firebase console, there is no public self-signup.
const firebaseConfig = {
  apiKey: 'AIzaSyDM5TXFcaVruAiJp8gryJFCjKAhPoXCIHU',
  authDomain: 'casefilescc.firebaseapp.com',
  projectId: 'casefilescc',
  storageBucket: 'casefilescc.firebasestorage.app',
  messagingSenderId: '889587277525',
  appId: '1:889587277525:web:24743b207623b748b50c5c',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Firestore with multi-tab offline persistence, same as the previous site.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/**
 * Live-syncs a top-level collection into React state. Every signed-in team
 * member sees the same list update in real time.
 */
export function syncCollection<T extends { id: string }>(
  collectionName: string,
  onChange: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, collectionName),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[];
      onChange(items);
    },
    () => {
      /* offline / transient errors: Firestore's own cache keeps last-known data on screen */
    }
  );
}

/** Live-syncs a single document (e.g. shared pricing settings). */
export function syncDoc<T>(
  path: string,
  fallback: T,
  onChange: (data: T) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, path),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as T) : fallback);
    },
    () => {}
  );
}

/** Writes/overwrites one document in a collection, using the item's own id. */
export function putDoc(collectionName: string, id: string, data: DocumentData): Promise<void> {
  const { id: _drop, ...rest } = data as any;
  return setDoc(doc(db, collectionName, id), rest);
}

export function removeDoc(collectionName: string, id: string): Promise<void> {
  return deleteDoc(doc(db, collectionName, id));
}

/** Writes the single shared settings document. */
export function putSettingsDoc(data: DocumentData): Promise<void> {
  return setDoc(doc(db, 'settings', 'pricing'), data);
}
