export interface KJVVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const DB_NAME = 'ProjectAbide_BibleDB';
const DB_VERSION = 1;
const STORE_NAME = 'kjv_verses';

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('book', 'book', { unique: false });
        store.createIndex('reference', ['book', 'chapter', 'verse'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Check if KJV data exists offline
export async function hasOfflineKJV(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result > 30000); // KJV has 31,102 verses
      countReq.onerror = () => resolve(false);
    });
  } catch (e) {
    console.error('Error checking offline KJV status:', e);
    return false;
  }
}

// Clear offline KJV data
export async function clearOfflineKJV(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const clearReq = store.clear();
    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });
}

// Download and store full KJV Bible in IndexedDB
export async function downloadAndSaveKJV(onProgress?: (percent: number) => void): Promise<boolean> {
  try {
    if (onProgress) onProgress(10);
    
    // Primary API source for complete KJV dataset
    let verses: KJVVerse[] = [];

    try {
      // Source 1: bolls.life static KJV dataset
      const res = await fetch('https://bolls.life/static/translations/KJV.json');
      if (res.ok) {
        const data = await res.json();
        if (onProgress) onProgress(40);
        
        // Book names map for bolls.life (1 to 66)
        const BOOK_NAMES: { [key: number]: string } = {
          1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
          6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
          11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles', 15: 'Ezra',
          16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms', 20: 'Proverbs',
          21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah', 24: 'Jeremiah', 25: 'Lamentations',
          26: 'Ezekiel', 27: 'Daniel', 28: 'Hosea', 29: 'Joel', 30: 'Amos',
          31: 'Obadiah', 32: 'Jonah', 33: 'Micah', 34: 'Nahum', 35: 'Habakkuk',
          36: 'Zephaniah', 37: 'Haggai', 38: 'Zechariah', 39: 'Malachi', 40: 'Matthew',
          41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts', 45: 'Romans',
          46: '1 Corinthians', 47: '2 Corinthians', 48: 'Galatians', 49: 'Ephesians', 50: 'Philippians',
          51: 'Colossians', 52: '1 Thessalonians', 53: '2 Thessalonians', 54: '1 Timothy', 55: '2 Timothy',
          56: 'Titus', 57: 'Philemon', 58: 'Hebrews', 59: 'James', 60: '1 Peter',
          61: '2 Peter', 62: '1 John', 63: '2 John', 64: '3 John', 65: 'Jude', 66: 'Revelation'
        };

        verses = data.map((item: any) => ({
          book: BOOK_NAMES[item.book] || `Book ${item.book}`,
          chapter: item.chapter,
          verse: item.verse,
          text: item.text.replace(/<[^>]*>?/gm, '').trim() // sanitize html tags if any
        }));
      }
    } catch (err) {
      console.warn('Primary KJV fetch failed, trying secondary source...', err);
    }

    // Fallback source if primary failed
    if (verses.length === 0) {
      const res = await fetch('https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/kjv.json');
      if (res.ok) {
        const data = await res.json();
        if (onProgress) onProgress(40);
        verses = (data.verses || data).map((item: any) => ({
          book: item.book_name || item.book,
          chapter: Number(item.chapter),
          verse: Number(item.verse),
          text: item.text.trim()
        }));
      }
    }

    if (verses.length === 0) {
      throw new Error('Could not download KJV Bible data from online endpoints.');
    }

    if (onProgress) onProgress(60);

    // Save to IndexedDB in batches for maximum speed
    const db = await openDB();
    await clearOfflineKJV();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const total = verses.length;
    for (let i = 0; i < total; i++) {
      store.add(verses[i]);
      if (i % 5000 === 0 && onProgress) {
        onProgress(60 + Math.floor((i / total) * 35));
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (onProgress) onProgress(100);
    return true;
  } catch (error) {
    console.error('Failed to download offline KJV:', error);
    throw error;
  }
}

// Search offline IndexedDB for KJV verses
export async function searchOfflineKJV(query: string, limit: number = 30): Promise<{ reference: string; verse: string }[]> {
  const db = await openDB();
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results: { reference: string; verse: string }[] = [];

    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        const item: KJVVerse = cursor.value;
        const ref = `${item.book} ${item.chapter}:${item.verse}`;
        const matchRef = ref.toLowerCase().includes(cleanQuery);
        const matchText = item.text.toLowerCase().includes(cleanQuery);

        if (matchRef || matchText) {
          results.push({
            reference: `${ref} (KJV)`,
            verse: item.text
          });
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    cursorReq.onerror = () => resolve(results);
  });
}
