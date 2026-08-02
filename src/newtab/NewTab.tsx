import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Bookmark, Copy, Plus, Check, 
  Settings, Search, Shield, ShieldAlert, Trash2, 
  Flame, HeartHandshake
} from 'lucide-react';
import { 
  getSettings, updateSettings, 
  BookmarkedVerse, ExtensionSettings, JournalEntry 
} from '../utils/storage';
import { searchBibleAsync, SearchVerse, getAllCategories, getVerseOfTheDay, Verse } from '../utils/bible';
import { initTheme } from '../utils/theme';

export default function NewTab() {
  // App settings & state
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'reflection' | 'search' | 'journal'>('reflection');
  
  // Verse of the Day state
  const [dailyVerse, setDailyVerse] = useState<Verse>({ reference: '', verse: '' });
  const [isDailyBookmarked, setIsDailyBookmarked] = useState(false);
  const [copiedDaily, setCopiedDaily] = useState(false);
  
  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchVerse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Journal state
  const [newPrayerText, setNewPrayerText] = useState('');
  
  // Habit Checklist (kept in local component state or stored)
  const [checklist, setChecklist] = useState([
    { id: 'breathe', label: 'Pause and breathe (10s)', completed: false },
    { id: 'scripture', label: 'Meditate on the daily verse', completed: false },
    { id: 'prayer', label: 'Submit a request or give thanks', completed: false },
  ]);

  // Load configuration and init theme on mount
  useEffect(() => {
    initTheme();
    loadSettings();
    setDailyVerse(getVerseOfTheDay());
  }, []);

  const loadSettings = async () => {
    const data = await getSettings();
    setSettings(data);
    
    // Load daily verse with selected translation
    const verseToDisplay = getVerseOfTheDay(data.translation || 'NIV');
    setDailyVerse(verseToDisplay);
    
    // Check if daily verse is bookmarked
    const isBookmarked = data.bookmarks.some(
      b => b.reference === verseToDisplay.reference && b.verse === verseToDisplay.verse
    );
    setIsDailyBookmarked(isBookmarked);
    
    // Update daily streak
    updateStreak(data);
  };

  const updateStreak = async (currentSettings: ExtensionSettings) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastVisit = currentSettings.lastNewTabVisit;
    
    if (lastVisit === todayStr) {
      return; // Already visited today, streak is correct
    }
    
    let newStreak = currentSettings.streak;
    
    if (lastVisit) {
      const lastVisitDate = new Date(lastVisit);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastVisitDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1; // Visited consecutive day
      } else if (diffDays > 1) {
        newStreak = 1; // Streak broken, reset
      }
    } else {
      newStreak = 1; // First visit ever
    }
    
    const updated = await updateSettings({
      streak: newStreak,
      lastNewTabVisit: todayStr
    });
    setSettings(updated);
  };

  // Toggle bookmarking for a verse
  const handleToggleBookmark = async (verseToBookmark: Verse) => {
    if (!settings) return;
    
    const existsIndex = settings.bookmarks.findIndex(
      b => b.reference === verseToBookmark.reference && b.verse === verseToBookmark.verse
    );
    
    let updatedBookmarks: BookmarkedVerse[] = [];
    if (existsIndex > -1) {
      updatedBookmarks = settings.bookmarks.filter((_, idx) => idx !== existsIndex);
    } else {
      updatedBookmarks = [
        ...settings.bookmarks,
        { ...verseToBookmark, bookmarkedAt: new Date().toISOString() }
      ];
    }
    
    const updated = await updateSettings({ bookmarks: updatedBookmarks });
    setSettings(updated);
    
    // Update active visual toggles
    const currentDaily = getVerseOfTheDay();
    if (verseToBookmark.reference === currentDaily.reference) {
      setIsDailyBookmarked(existsIndex === -1);
    }
  };

  // Copy verse text to clipboard
  const handleCopyText = (v: Verse, indexType: 'daily' | number) => {
    const textToCopy = `"${v.verse}" — ${v.reference}`;
    navigator.clipboard.writeText(textToCopy);
    
    if (indexType === 'daily') {
      setCopiedDaily(true);
      setTimeout(() => setCopiedDaily(false), 2000);
    } else {
      setCopiedIndex(indexType);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Run search
  useEffect(() => {
    let isMounted = true;
    searchBibleAsync(searchQuery, selectedCategory || undefined, settings?.translation || 'KJV')
      .then(results => {
        if (isMounted) setSearchResults(results);
      });
    return () => { isMounted = false; };
  }, [searchQuery, selectedCategory, settings?.translation]);

  // Ensure active tab matches enabled modules
  useEffect(() => {
    if (!settings) return;
    if (activeTab === 'reflection' && !settings.showReflectionTab) {
      if (settings.showSearchTab) setActiveTab('search');
      else if (settings.showJournalTab) setActiveTab('journal');
    } else if (activeTab === 'search' && !settings.showSearchTab) {
      if (settings.showReflectionTab) setActiveTab('reflection');
      else if (settings.showJournalTab) setActiveTab('journal');
    } else if (activeTab === 'journal' && !settings.showJournalTab) {
      if (settings.showReflectionTab) setActiveTab('reflection');
      else if (settings.showSearchTab) setActiveTab('search');
    }
  }, [settings?.showReflectionTab, settings?.showSearchTab, settings?.showJournalTab, activeTab]);

  // Toggle blocker
  const handleToggleBlocker = async () => {
    if (!settings) return;
    const updated = await updateSettings({ isBlockingEnabled: !settings.isBlockingEnabled });
    setSettings(updated);
    
    // Request background script to reload declarative rules
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
    }
  };

  // Add a prayer journal item
  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newPrayerText.trim()) return;
    
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      text: newPrayerText.trim(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      answered: false
    };
    
    const updated = await updateSettings({
      journal: [newEntry, ...settings.journal]
    });
    
    setSettings(updated);
    setNewPrayerText('');
  };

  // Toggle answered state of prayer
  const handleToggleAnswered = async (id: string) => {
    if (!settings) return;
    
    const updatedJournal = settings.journal.map(entry => {
      if (entry.id === id) {
        return { ...entry, answered: !entry.answered };
      }
      return entry;
    });
    
    const updated = await updateSettings({ journal: updatedJournal });
    setSettings(updated);
  };

  // Delete prayer
  const handleDeleteJournal = async (id: string) => {
    if (!settings) return;
    
    const updatedJournal = settings.journal.filter(entry => entry.id !== id);
    const updated = await updateSettings({ journal: updatedJournal });
    setSettings(updated);
  };

  // Toggle local checklists
  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.completed;
        
        // Award focus minutes if they complete the deep breath
        if (id === 'breathe' && nextState && settings) {
          updateSettings({ focusMinutes: settings.focusMinutes + 1 })
            .then(updated => setSettings(updated));
        }
        
        return { ...item, completed: nextState };
      }
      return item;
    }));
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-primary-moss"></div>
      </div>
    );
  }

  // Categories list
  const categories = getAllCategories();

  return (
    <div className="min-h-screen h-full flex-grow flex flex-col justify-between p-0 relative overflow-hidden">
      {/* Background Calm Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute rounded-full bg-primary-moss" style={{ top: '-10%', left: '-10%', width: '50%', height: '50%', filter: 'blur(120px)' }}></div>
        <div className="absolute rounded-full bg-accent-gold" style={{ bottom: '-10%', right: '-10%', width: '50%', height: '50%', filter: 'blur(120px)' }}></div>
      </div>

      {/* Top Navigation */}
      <header className="flex justify-between items-center w-full z-10 px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-moss flex items-center justify-center text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display font-medium text-lg tracking-tight">ProjectAbide</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-moss-light text-primary-moss font-medium text-sm">
            <Flame className="h-4 w-4 fill-current" />
            <span>{settings.streak} Day Streak</span>
          </div>
          
          <button 
            className="btn btn-secondary p-2 rounded-full"
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              } else {
                window.open('/options.html', '_blank');
              }
            }}
            title="Open Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Centered Scripture Section */}
      <main className="flex-grow flex flex-col justify-center items-center w-full max-w-4xl mx-auto my-6 px-6 z-10 animate-fade-in">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold tracking-widest text-primary-moss uppercase">Verse of the Day</span>
        </div>
        <blockquote className="text-center font-serif text-xl md:text-3xl leading-relaxed max-w-2xl mx-auto mb-6 text-primary">
          "{dailyVerse.verse}"
        </blockquote>
        <cite className="text-center not-italic font-display text-sm md:text-base text-accent-gold font-medium mb-8 flex items-center justify-center gap-2">
          <span>— {dailyVerse.reference}</span>
          {settings && (
            <span className="badge-translation">
              {settings.translation || 'NIV'}
            </span>
          )}
        </cite>

        <div className="flex gap-3 justify-center mb-12">
          <button 
            onClick={() => handleCopyText(dailyVerse, 'daily')} 
            className="btn btn-secondary text-xs"
          >
            {copiedDaily ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedDaily ? 'Copied' : 'Copy'}
          </button>
          
          <button 
            onClick={() => handleToggleBookmark(dailyVerse)} 
            className={`btn ${isDailyBookmarked ? 'btn-gold' : 'btn-secondary'} text-xs`}
          >
            <Bookmark className="h-3.5 w-3.5 fill-current" />
            {isDailyBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
        </div>

        {/* Dashboard Tabs Block */}
        {(settings.showReflectionTab || settings.showSearchTab || settings.showJournalTab) && (
          <div className="w-full max-w-3xl glass rounded-lg border border-border-color shadow-lg overflow-hidden">
            {/* Tabs header */}
            <div className="flex border-b border-border-color bg-bg-secondary bg-opacity-50">
              {settings.showReflectionTab && (
                <button 
                  onClick={() => setActiveTab('reflection')}
                  className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-all ${
                    activeTab === 'reflection' 
                      ? 'border-primary-moss text-primary-moss font-semibold' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Reflection
                </button>
              )}
              {settings.showSearchTab && (
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-all ${
                    activeTab === 'search' 
                      ? 'border-primary-moss text-primary-moss font-semibold' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Bible Search
                </button>
              )}
              {settings.showJournalTab && (
                <button 
                  onClick={() => setActiveTab('journal')}
                  className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-all ${
                    activeTab === 'journal' 
                      ? 'border-primary-moss text-primary-moss font-semibold' 
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Prayer Journal
                </button>
              )}
            </div>

            {/* Tab content area */}
            <div className="p-6" style={{ minHeight: '220px' }}>
            
            {/* Tab 1: Reflection */}
            {activeTab === 'reflection' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-medium text-sm flex items-center gap-1.5">
                    <HeartHandshake className="h-4 w-4 text-primary-moss" />
                    Daily Focus Checklist
                  </h3>
                  <span className="text-xs text-text-tertiary">
                    {checklist.filter(c => c.completed).length} of {checklist.length} done
                  </span>
                </div>
                
                <div className="flex flex-col gap-2.5 mt-1">
                  {checklist.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                        item.completed 
                          ? 'bg-primary-moss-light border-primary-moss bg-opacity-20' 
                          : 'bg-bg-primary bg-opacity-30 border-border-color hover:border-text-tertiary'
                      }`}
                    >
                      <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                        item.completed 
                          ? 'bg-primary-moss border-primary-moss text-white' 
                          : 'border-text-tertiary'
                      }`}>
                        {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs ${item.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Bible Search */}
            {activeTab === 'search' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
                    <input 
                      type="text" 
                      placeholder="Search scriptures (e.g. peace, hope, trust)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-primary bg-opacity-50 border border-border-color rounded-md py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-primary-moss text-text-primary"
                    />
                  </div>
                </div>

                {/* Topic tags */}
                <div className="flex gap-1.5 flex-wrap">
                  <button 
                    onClick={() => setSelectedCategory('')}
                    className={`px-2.5 py-1 rounded-full text-xxs transition-all ${
                      selectedCategory === '' 
                        ? 'bg-primary-moss text-white' 
                        : 'bg-bg-secondary border border-border-color text-text-secondary hover:text-text-primary'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    All Topics
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xxs transition-all ${
                        selectedCategory === cat 
                          ? 'bg-primary-moss text-white' 
                          : 'bg-bg-secondary border border-border-color text-text-secondary hover:text-text-primary'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Results list */}
                <div className="flex flex-col gap-3 max-h-40 overflow-y-auto mt-2 pr-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((item, idx) => {
                      const isBookmarked = settings.bookmarks.some(
                        b => b.reference === item.reference && b.verse === item.verse
                      );
                      return (
                        <div key={idx} className="p-3 bg-bg-primary bg-opacity-30 border border-border-color rounded-md flex flex-col gap-2 relative group">
                          <p className="text-xs text-text-primary leading-relaxed">"{item.verse}"</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-accent-gold font-medium" style={{ fontSize: '10px' }}>{item.reference}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleCopyText(item, idx)}
                                className="text-text-secondary hover:text-text-primary flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                                style={{ fontSize: '10px' }}
                              >
                                {copiedIndex === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedIndex === idx ? 'Copied' : 'Copy'}
                              </button>
                              <button 
                                onClick={() => handleToggleBookmark(item)}
                                className="text-text-secondary hover:text-text-primary flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                                style={{ fontSize: '10px' }}
                              >
                                <Bookmark className={`h-3 w-3 ${isBookmarked ? 'text-accent-gold fill-current' : ''}`} />
                                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-text-tertiary">
                      No matching scriptures found. Try another search term.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Prayer Journal */}
            {activeTab === 'journal' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <form onSubmit={handleAddJournal} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Write a prayer request or praise report..."
                    value={newPrayerText}
                    onChange={(e) => setNewPrayerText(e.target.value)}
                    className="flex-grow bg-bg-primary bg-opacity-50 border border-border-color rounded-md py-2 px-3.5 text-xs focus:outline-none focus:border-primary-moss text-text-primary"
                  />
                  <button type="submit" className="btn btn-primary px-3.5 py-2 text-xs">
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                </form>

                {/* Journal List */}
                <div className="flex flex-col gap-2.5 max-h-40 overflow-y-auto pr-1">
                  {settings.journal.length > 0 ? (
                    settings.journal.map(entry => (
                      <div 
                        key={entry.id}
                        className={`flex items-start justify-between p-3 rounded-md border transition-all ${
                          entry.answered 
                            ? 'bg-accent-gold-light bg-opacity-10 border-accent-gold border-opacity-30' 
                            : 'bg-bg-primary bg-opacity-30 border-border-color'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-grow">
                          <button 
                            onClick={() => handleToggleAnswered(entry.id)}
                            className={`mt-0.5 h-4.5 w-4.5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                              entry.answered 
                                ? 'bg-accent-gold border-accent-gold text-white' 
                                : 'border-text-tertiary'
                            }`}
                            title={entry.answered ? 'Mark unanswered' : 'Mark as answered praise!'}
                          >
                            {entry.answered && <Check className="h-3 w-3 stroke-[3]" />}
                          </button>
                          
                          <div className="flex flex-col">
                            <span className={`text-xs leading-relaxed ${
                              entry.answered ? 'text-text-secondary line-through' : 'text-text-primary'
                            }`}>
                              {entry.text}
                            </span>
                            <span className="text-text-tertiary mt-1" style={{ fontSize: '9px' }}>{entry.date}</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteJournal(entry.id)}
                          className="text-text-tertiary hover:text-danger p-1 bg-transparent border-none cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-text-tertiary">
                      Your prayer list is empty. Add a request above to track your prayers.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
        )}
      </main>

      {/* Bottom Control Bar */}
      <footer className="w-full mt-auto z-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs border-t border-border-color px-8 py-6 text-text-secondary">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleBlocker} 
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary"
          >
            {settings.isBlockingEnabled ? (
              <>
                <Shield className="h-4 w-4 text-primary-moss fill-current fill-opacity-20" />
                <span>Focus Blocker is Active</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-danger" />
                <span>Focus Blocker is Disabled</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span>{settings.focusMinutes} Focus Minutes Today</span>
          <span>•</span>
          <span>ProjectAbide © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
