export interface Verse {
  reference: string;
  verse: string;
}

export interface BookmarkedVerse extends Verse {
  bookmarkedAt: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  date: string;
  answered: boolean;
}

export interface ExtensionSettings {
  blockedSites: string[];
  isBlockingEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  translation: string;
  bypassDuration: number; // in minutes
  streak: number;
  lastNewTabVisit: string; // YYYY-MM-DD
  bookmarks: BookmarkedVerse[];
  journal: JournalEntry[];
  focusMinutes: number;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  blockedSites: ['facebook.com', 'reddit.com', 'youtube.com', 'instagram.com', 'twitter.com', 'tiktok.com'],
  isBlockingEnabled: true,
  theme: 'system',
  translation: 'ESV',
  bypassDuration: 10,
  streak: 1,
  lastNewTabVisit: '',
  bookmarks: [],
  journal: [],
  focusMinutes: 0,
};

const isExtension = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';

export async function getSettings(): Promise<ExtensionSettings> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        if (result.settings) {
          resolve({ ...DEFAULT_SETTINGS, ...result.settings });
        } else {
          // Initialize settings if they don't exist
          chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
            resolve(DEFAULT_SETTINGS);
          });
        }
      });
    });
  } else {
    const local = localStorage.getItem('project_abide_settings');
    if (local) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    localStorage.setItem('project_abide_settings', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings: updated }, () => {
        resolve(updated);
      });
    });
  } else {
    localStorage.setItem('project_abide_settings', JSON.stringify(updated));
    return updated;
  }
}

// Keep track of active block bypasses in local storage (since sync storage is for cross-device)
export interface BypassInfo {
  domain: string;
  expiryTime: number; // timestamp
}

export async function getBypasses(): Promise<BypassInfo[]> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bypasses'], (result) => {
        resolve(result.bypasses || []);
      });
    });
  } else {
    const local = localStorage.getItem('project_abide_bypasses');
    return local ? JSON.parse(local) : [];
  }
}

export async function addBypass(domain: string, durationMinutes: number): Promise<void> {
  const bypasses = await getBypasses();
  const expiryTime = Date.now() + durationMinutes * 60 * 1000;
  const normalizedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  
  const updated = [
    ...bypasses.filter(b => b.domain !== normalizedDomain),
    { domain: normalizedDomain, expiryTime }
  ];
  
  if (isExtension) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ bypasses: updated }, () => resolve());
    });
    
    // Also notify background script to update rules & alarm
    chrome.runtime.sendMessage({ type: 'BYPASS_ADDED', domain: normalizedDomain, durationMinutes });
  } else {
    localStorage.setItem('project_abide_bypasses', JSON.stringify(updated));
  }
}

export async function removeBypass(domain: string): Promise<void> {
  const bypasses = await getBypasses();
  const normalizedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  const updated = bypasses.filter(b => b.domain !== normalizedDomain);
  
  if (isExtension) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ bypasses: updated }, () => resolve());
    });
  } else {
    localStorage.setItem('project_abide_bypasses', JSON.stringify(updated));
  }
}
