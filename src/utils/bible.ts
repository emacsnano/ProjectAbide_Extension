import dailyVerses from '../data/verses.json';
import searchVerses from '../data/bible_search.json';

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

export function searchBible(query: string, categoryFilter?: string): SearchVerse[] {
  const cleanQuery = query.toLowerCase().trim();
  
  return (searchVerses as SearchVerse[]).filter(v => {
    // 1. Apply category filter if set
    if (categoryFilter && v.category !== categoryFilter) {
      return false;
    }
    
    // If no query, but category filter is set, match category
    if (!cleanQuery) {
      return true;
    }
    
    // 2. Check keyword matching
    const matchesRef = v.reference.toLowerCase().includes(cleanQuery);
    const matchesVerse = v.verse.toLowerCase().includes(cleanQuery);
    const matchesCategory = v.category.toLowerCase().includes(cleanQuery);
    const matchesTags = v.tags.some(tag => tag.toLowerCase().includes(cleanQuery));
    
    return matchesRef || matchesVerse || matchesCategory || matchesTags;
  });
}

export function getVersesByCategory(category: string): SearchVerse[] {
  return (searchVerses as SearchVerse[]).filter(v => v.category === category);
}

export function getRandomVerseFromCategory(category: string): SearchVerse {
  const filtered = getVersesByCategory(category);
  if (filtered.length === 0) {
    // Fallback to a random search verse
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
