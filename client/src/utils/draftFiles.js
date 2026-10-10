// src/utils/draftFiles.js
// Photos and documents of a saved draft. Files cannot go into localStorage with
// the rest of the form, so they are kept in the browser's IndexedDB.

const DATABASE = 'katuwal-drafts';
const STORE = 'files';

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async (mode, action) => {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
};

// `files` is a plain object of File values, e.g. { photo: File, birthCertificate: File }
export const saveDraftFiles = (key, files) => run('readwrite', (store) => store.put(files, key));
export const loadDraftFiles = (key) => run('readonly', (store) => store.get(key));
export const clearDraftFiles = (key) => run('readwrite', (store) => store.delete(key));
