import { DocumentMeta } from '../types';

const DB_NAME = 'proctus_documents_vault';
const DB_VERSION = 2;
const STORE_NAME = 'documents';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Vault starts 100% empty with only real documents uploaded by students
export const INITIAL_DOCUMENTS: DocumentMeta[] = [];

let hasPurgedDemoDocs = false;
async function purgeLegacyDemoDocs(db: IDBDatabase) {
  if (hasPurgedDemoDocs) return;
  hasPurgedDemoDocs = true;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const all = getAllReq.result || [];
      for (const item of all) {
        if (
          item.id.startsWith('doc-lbo') ||
          item.id.startsWith('doc-quant') ||
          item.id.startsWith('doc-macro') ||
          item.id.startsWith('doc-ma')
        ) {
          store.delete(item.id);
        }
      }
    };
  } catch (e) {
    console.warn('Error purging demo documents from IndexedDB:', e);
  }
}

export async function getAllDocuments(): Promise<DocumentMeta[]> {
  try {
    const db = await openDB();
    await purgeLegacyDemoDocs(db);
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: DocumentMeta[] = request.result || [];
        resolve(
          results.filter(
            (d) =>
              !d.id.startsWith('doc-lbo') &&
              !d.id.startsWith('doc-quant') &&
              !d.id.startsWith('doc-macro') &&
              !d.id.startsWith('doc-ma')
          )
        );
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Error reading vault', err);
    return [];
  }
}

export async function saveDocument(doc: DocumentMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(doc);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function toggleFavoriteDocument(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const doc = getReq.result as DocumentMeta;
      if (doc) {
        doc.isFavorite = !doc.isFavorite;
        store.put(doc);
        resolve(doc.isFavorite);
      } else {
        resolve(false);
      }
    };

    getReq.onerror = () => reject(getReq.error);
  });
}
