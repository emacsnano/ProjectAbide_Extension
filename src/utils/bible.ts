import dailyVerses from '../data/verses.json';
import searchVerses from '../data/bible_search.json';
import { hasOfflineKJV, searchOfflineKJV } from './kjvStorage';

export interface Verse {
  reference: string;
  verse: string;
}

export interface SearchVerse extends Verse {
  category: string;
  tags: string[];
}

export function getVerseOfTheDay(translation: string = 'NIV'): Verse {
  const today = new Date();
  // Generate a stable index based on date (year, month, day) so it updates exactly at midnight
  const dateInt = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = dateInt % dailyVerses.length;
  const verseEntry = dailyVerses[index];
  
  const translations = (verseEntry as any).translations || {};
  const verseText = translations[translation.toUpperCase()] || translations['NIV'] || (verseEntry as any).verse || "";
  
  return {
    reference: verseEntry.reference,
    verse: verseText
  };
}

export function getAllCategories(): string[] {
  const categories = searchVerses.map(v => v.category);
  return Array.from(new Set(categories));
}

// Synchronous fast search over curated list
export function searchBible(query: string, categoryFilter?: string): SearchVerse[] {
  const cleanQuery = query.toLowerCase().trim();
  
  return (searchVerses as SearchVerse[]).filter(v => {
    if (categoryFilter && v.category !== categoryFilter) {
      return false;
    }
    if (!cleanQuery) {
      return true;
    }
    
    const matchesRef = v.reference.toLowerCase().includes(cleanQuery);
    const matchesVerse = v.verse.toLowerCase().includes(cleanQuery);
    const matchesCategory = v.category.toLowerCase().includes(cleanQuery);
    const matchesTags = v.tags.some(tag => tag.toLowerCase().includes(cleanQuery));
    
    return matchesRef || matchesVerse || matchesCategory || matchesTags;
  });
}

// Async full search (tries offline KJV IndexedDB -> Online API -> Local Curated list)
export async function searchBibleAsync(query: string, categoryFilter?: string, translation: string = 'KJV'): Promise<SearchVerse[]> {
  const cleanQuery = query.toLowerCase().trim();

  // 1. If category filter is active, perform category search from curated searchVerses first
  if (categoryFilter) {
    return searchBible(query, categoryFilter);
  }

  if (!cleanQuery) {
    return searchBible('', categoryFilter);
  }

  // 2. Try offline KJV if stored in IndexedDB
  const isOfflineAvailable = await hasOfflineKJV();
  if (isOfflineAvailable && translation.toUpperCase() === 'KJV') {
    try {
      const offlineResults = await searchOfflineKJV(cleanQuery);
      if (offlineResults.length > 0) {
        return offlineResults.map(r => ({
          reference: r.reference,
          verse: r.verse,
          category: 'KJV Offline',
          tags: [cleanQuery]
        }));
      }
    } catch (e) {
      console.warn('Error querying offline KJV storage:', e);
    }
  }

  // 3. Try Online API (bolls.life API search)
  try {
    const apiTranslation = translation.toUpperCase() === 'KJV' ? 'KJV' : 'KJV';
    const response = await fetch(`https://bolls.life/search/${apiTranslation}/?q=${encodeURIComponent(cleanQuery)}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
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

        const results: SearchVerse[] = data.slice(0, 30).map((item: any) => ({
          reference: `${BOOK_NAMES[item.book] || 'Book ' + item.book} ${item.chapter}:${item.verse} (${translation.toUpperCase()})`,
          verse: item.text.replace(/<[^>]*>?/gm, '').trim(),
          category: 'API Search',
          tags: [cleanQuery]
        }));
        return results;
      }
    }
  } catch (err) {
    console.warn('Online Bible API search failed, falling back to curated list:', err);
  }

  // 4. Fallback to curated local list
  return searchBible(query, categoryFilter);
}

export function getVersesByCategory(category: string): SearchVerse[] {
  return (searchVerses as SearchVerse[]).filter(v => v.category === category);
}

export function getRandomVerseFromCategory(category: string): SearchVerse {
  const filtered = getVersesByCategory(category);
  if (filtered.length === 0) {
    const randomIndex = Math.floor(Math.random() * searchVerses.length);
    return searchVerses[randomIndex] as SearchVerse;
  }
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

export async function fetchTranslation(baseVerse: Verse, translation: string): Promise<Verse> {
  try {
    const cleanRef = baseVerse.reference.replace(/\s*[A-Z]{3,4}$/i, '');
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=${translation.toLowerCase()}`);
    if (response.ok) {
      const resData = await response.json();
      return {
        reference: `${resData.reference} (${translation.toUpperCase()})`,
        verse: resData.text.trim().replace(/\n/g, ' ')
      };
    }
  } catch (e) {
    console.warn('Could not fetch online translation, falling back to offline database:', e);
  }
  return baseVerse;
}
