import React, { useEffect, useState } from 'react';
import { 
  Shield, Bookmark, BarChart3, Settings, Plus, Trash2, 
  Copy, Check, Sun, Moon, Monitor, Sparkles, 
  CheckSquare, Award, Flame, Hourglass, Globe, Heart
} from 'lucide-react';
import { 
  getSettings, updateSettings, ExtensionSettings, 
  BookmarkedVerse 
} from '../utils/storage';
import { applyTheme, initTheme } from '../utils/theme';

export default function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [activePanel, setActivePanel] = useState<'blocker' | 'bookmarks' | 'stats' | 'general' | 'support'>('blocker');
  
  // Blocker panel state
  const [newSiteInput, setNewSiteInput] = useState('');
  const [blockError, setBlockError] = useState('');
  
  // Bookmark state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    initTheme();
    loadSettings();

    // Check URL parameters for active panel routing
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['blocker', 'bookmarks', 'stats', 'general', 'support'].includes(tab)) {
      setActivePanel(tab as any);
    }
  }, []);

  const loadSettings = async () => {
    const data = await getSettings();
    setSettings(data);
  };

  // Add website to blocklist
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newSiteInput.trim()) return;
    
    // Simple normalization of domain input
    let domain = newSiteInput.trim().toLowerCase();
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    if (!domain) {
      setBlockError('Please enter a valid website address.');
      return;
    }
    
    // Check if domain is already in list
    if (settings.blockedSites.includes(domain)) {
      setBlockError('This website is already blocked.');
      return;
    }
    
    const updatedSites = [...settings.blockedSites, domain];
    const updated = await updateSettings({ blockedSites: updatedSites });
    setSettings(updated);
    setNewSiteInput('');
    setBlockError('');
    
    // Update active rules in extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
    }
  };

  // Remove website from blocklist
  const handleRemoveSite = async (siteToRemove: string) => {
    if (!settings) return;
    
    const updatedSites = settings.blockedSites.filter(site => site !== siteToRemove);
    const updated = await updateSettings({ blockedSites: updatedSites });
    setSettings(updated);
    
    // Update active rules in extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (verse: BookmarkedVerse) => {
    if (!settings) return;
    
    const updatedBookmarks = settings.bookmarks.filter(
      b => b.reference !== verse.reference || b.verse !== verse.verse
    );
    const updated = await updateSettings({ bookmarks: updatedBookmarks });
    setSettings(updated);
  };

  // Copy bookmarked verse
  const handleCopyBookmarkText = (verse: BookmarkedVerse, index: number) => {
    const textToCopy = `"${verse.verse}" — ${verse.reference}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Change App Theme
  const handleThemeChange = async (themeOption: 'light' | 'dark' | 'system') => {
    if (!settings) return;
    const updated = await updateSettings({ theme: themeOption });
    setSettings(updated);
    applyTheme(themeOption);
  };

  // Change Translation
  const handleTranslationChange = async (translationOption: string) => {
    if (!settings) return;
    const updated = await updateSettings({ translation: translationOption });
    setSettings(updated);
  };

  // Change Bypass duration minutes
  const handleDurationChange = async (minutes: number) => {
    if (!settings) return;
    const updated = await updateSettings({ bypassDuration: minutes });
    setSettings(updated);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-primary-moss"></div>
      </div>
    );
  }

  // Stats calculation
  const totalPrayers = settings.journal.length;
  const answeredPrayers = settings.journal.filter(e => e.answered).length;
  const pendingPrayers = totalPrayers - answeredPrayers;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary relative overflow-hidden">
      {/* Background Calm Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10 z-0">
        <div className="absolute rounded-full bg-primary-moss" style={{ top: '-10%', left: '-10%', width: '50%', height: '50%', filter: 'blur(130px)' }}></div>
        <div className="absolute rounded-full bg-accent-gold" style={{ bottom: '-10%', right: '-10%', width: '50%', height: '50%', filter: 'blur(130px)' }}></div>
      </div>

      {/* Settings Layout */}
      <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 p-6 md:p-12 z-10">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-60 flex flex-col gap-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-primary-moss flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-base tracking-tight text-primary">ProjectAbide</h1>
              <p className="text-text-tertiary" style={{ fontSize: '10px' }}>Settings & Dashboard v1.0</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button 
              onClick={() => setActivePanel('blocker')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${
                activePanel === 'blocker' 
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss' 
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Focus Blocker</span>
            </button>
            
            <button 
              onClick={() => setActivePanel('bookmarks')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${
                activePanel === 'bookmarks' 
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss' 
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>Saved Scriptures</span>
            </button>
            
            <button 
              onClick={() => setActivePanel('stats')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${
                activePanel === 'stats' 
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss' 
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Focus Statistics</span>
            </button>
            
            <button 
              onClick={() => setActivePanel('general')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${
                activePanel === 'general' 
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss' 
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>App Preferences</span>
            </button>
            
            <button 
              onClick={() => setActivePanel('support')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${
                activePanel === 'support' 
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss' 
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <Heart className="h-4 w-4" />
              <span>Support & Donate</span>
            </button>
          </nav>
        </aside>

        {/* Right Details Panel */}
        <main className="flex-grow card p-6 md:p-8 bg-bg-secondary bg-opacity-70 glass animate-fade-in border border-border-color" style={{ minHeight: '400px' }}>
          
          {/* Panel 1: Blocker settings */}
          {activePanel === 'blocker' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display font-medium text-lg text-primary flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary-moss" />
                  Website Focus Blocker
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Manage blocked domains and reflection limits to prevent distractions.
                </p>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color">
                <div>
                  <span className="text-xs font-semibold block text-primary">Global Website Blocking</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Turn blocking rules on or off across the browser.</span>
                </div>
                <button 
                  onClick={async () => {
                    const next = !settings.isBlockingEnabled;
                    const updated = await updateSettings({ isBlockingEnabled: next });
                    setSettings(updated);
                    if (typeof chrome !== 'undefined' && chrome.runtime) {
                      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
                    }
                  }}
                  className={`switch-track ${settings.isBlockingEnabled ? 'active' : ''}`}
                >
                  <div className="switch-thumb" />
                </button>
              </div>

              {/* Bypass duration select */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color">
                <div>
                  <span className="text-xs font-semibold block text-primary">Reflection Bypass Timer</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Bypass duration when you click "Continue Anyway".</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hourglass className="h-3.5 w-3.5 text-accent-gold" />
                  <select 
                    value={settings.bypassDuration}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                    className="bg-bg-secondary border border-border-color text-xs rounded p-1.5 text-text-primary focus:outline-none focus:border-primary-moss font-medium"
                  >
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Blocklist form */}
              <form onSubmit={handleAddSite} className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-secondary">Add Website to Blocklist</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. reddit.com, instagram.com"
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    className="flex-grow bg-bg-primary border border-border-color rounded-md py-2 px-3 text-xs focus:outline-none focus:border-primary-moss text-text-primary"
                  />
                  <button type="submit" className="btn btn-primary py-2 px-4 text-xs">
                    <Plus className="h-4.5 w-4.5" />
                    <span>Add</span>
                  </button>
                </div>
                {blockError && <span className="text-danger font-medium" style={{ fontSize: '10px' }}>{blockError}</span>}
              </form>

              {/* Blocked websites list */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-secondary">Currently Blocked ({settings.blockedSites.length})</span>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1 border border-border-color rounded-lg bg-bg-primary bg-opacity-30 p-2">
                  {settings.blockedSites.length > 0 ? (
                    settings.blockedSites.map((site, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 hover:bg-bg-secondary rounded transition-colors bg-bg-primary bg-opacity-80">
                        <span className="text-xs text-text-primary font-medium">{site}</span>
                        <button 
                          onClick={() => handleRemoveSite(site)}
                          className="text-text-tertiary hover:text-danger p-1 bg-transparent border-none cursor-pointer"
                          title="Remove from blocklist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-text-tertiary">
                      Your blocklist is empty.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Panel 2: Saved scriptures */}
          {activePanel === 'bookmarks' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display font-medium text-lg text-primary flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-primary-moss" />
                  Saved Scriptures
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Your bookmarked verses to study, memorize, and inspire your daily actions.
                </p>
              </div>

              {/* Scrollable list */}
              <div className="flex flex-col gap-3.5 overflow-y-auto pr-1" style={{ maxHeight: '500px' }}>
                {settings.bookmarks.length > 0 ? (
                  settings.bookmarks.map((verse, index) => (
                    <div key={index} className="p-4 bg-bg-primary bg-opacity-50 border border-border-color rounded-lg flex flex-col gap-3 relative group transition-all hover:border-primary-moss">
                      <p className="font-serif text-sm leading-relaxed text-text-primary italic">
                        "{verse.verse}"
                      </p>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-border-color border-opacity-50">
                        <span className="text-xs text-accent-gold font-medium">{verse.reference}</span>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleCopyBookmarkText(verse, index)}
                            className="text-text-secondary hover:text-text-primary flex items-center gap-1 bg-transparent border-none cursor-pointer"
                            style={{ fontSize: '10px' }}
                          >
                            {copiedIndex === index ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedIndex === index ? 'Copied' : 'Copy'}
                          </button>
                          
                          <button 
                            onClick={() => handleRemoveBookmark(verse)}
                            className="text-text-tertiary hover:text-danger flex items-center gap-1 bg-transparent border-none cursor-pointer"
                            style={{ fontSize: '10px' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-text-tertiary border border-dashed border-border-color rounded-lg">
                    You haven't bookmarked any verses yet. Bookmark the daily verse on your New Tab!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel 3: Stats */}
          {activePanel === 'stats' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display font-medium text-lg text-primary flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-moss" />
                  Spiritual Discipline Stats
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  A beautiful record of your focus habits, streaks, and reflections.
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color flex flex-col gap-1 items-center text-center">
                  <Flame className="h-6 w-6 text-primary-moss fill-current" />
                  <span className="font-display font-semibold text-xl text-primary">{settings.streak} Days</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Active Visit Streak</span>
                </div>
                
                <div className="p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color flex flex-col gap-1 items-center text-center">
                  <Award className="h-6 w-6 text-accent-gold fill-current fill-opacity-20" />
                  <span className="font-display font-semibold text-xl text-primary">{settings.focusMinutes} Min</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Total Focus Pauses</span>
                </div>
              </div>

              {/* Prayer statistics card */}
              <div className="p-5 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-primary-moss" />
                  Prayer Journal Dashboard
                </h3>
                
                <div className="flex items-center justify-around py-3 border-y border-border-color border-opacity-40">
                  <div className="flex flex-col items-center">
                    <span className="font-display font-medium text-lg text-primary">{totalPrayers}</span>
                    <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Total Submitted</span>
                  </div>
                  
                  <div className="h-8 w-px bg-border-color" />
                  
                  <div className="flex flex-col items-center">
                    <span className="font-display font-medium text-lg text-accent-gold">{answeredPrayers}</span>
                    <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Answered Praise</span>
                  </div>
                  
                  <div className="h-8 w-px bg-border-color" />
                  
                  <div className="flex flex-col items-center">
                    <span className="font-display font-medium text-lg text-primary">{pendingPrayers}</span>
                    <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Active Petitions</span>
                  </div>
                </div>

                {answeredPrayers > 0 && (
                  <p className="italic text-text-secondary text-center mt-1" style={{ fontSize: '10px' }}>
                    "Offer to God a sacrifice of thanksgiving, and perform your vows to the Most High." — Psalm 50:14
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Panel 4: General config */}
          {activePanel === 'general' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display font-medium text-lg text-primary flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary-moss" />
                  App Preferences
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Customize the appearance and settings of your workspace.
                </p>
              </div>

              {/* Theme selection */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                  <Sun className="h-3.5 w-3.5 text-primary-moss" />
                  Visual Theme Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleThemeChange('light')}
                    className={`btn py-2.5 text-xs ${
                      settings.theme === 'light' 
                        ? 'btn-primary font-semibold' 
                        : 'btn-secondary text-text-secondary'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                  
                  <button 
                    onClick={() => handleThemeChange('dark')}
                    className={`btn py-2.5 text-xs ${
                      settings.theme === 'dark' 
                        ? 'btn-primary font-semibold' 
                        : 'btn-secondary text-text-secondary'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                  
                  <button 
                    onClick={() => handleThemeChange('system')}
                    className={`btn py-2.5 text-xs ${
                      settings.theme === 'system' 
                        ? 'btn-primary font-semibold' 
                        : 'btn-secondary text-text-secondary'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Translation Selection */}
              <div className="flex flex-col gap-2.5 pt-2">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-primary-moss" />
                  Default Bible Translation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['ESV', 'KJV', 'WEB', 'NIV'].map((trans) => (
                    <button
                      key={trans}
                      onClick={() => handleTranslationChange(trans)}
                      className={`btn py-2 text-xs ${
                        settings.translation === trans 
                          ? 'btn-gold font-semibold' 
                          : 'btn-secondary text-text-secondary'
                      }`}
                    >
                      {trans}
                    </button>
                  ))}
                </div>
                <span className="text-text-tertiary" style={{ fontSize: '9px' }}>
                  Translation settings will apply to future search and text expansion modules.
                </span>
              </div>
            </div>
          )}

          {/* Panel 5: Support & Donate */}
          {activePanel === 'support' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div>
                <h2 className="font-display font-medium text-lg text-primary flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary-moss fill-current fill-opacity-20" />
                  Support ProjectAbide
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  ProjectAbide is 100% free and open source. If this extension has helped you build focus and connect with scripture, consider supporting its development!
                </p>
              </div>

              {/* Donation Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a 
                  href="https://www.buymeacoffee.com/projectabide" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color hover:border-accent-gold transition-all flex flex-col gap-2 cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-primary group-hover:text-accent-gold transition-colors">☕ Buy Me a Coffee</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Support with a small one-time gift of coffee.</span>
                </a>
                
                <a 
                  href="https://ko-fi.com/projectabide" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color hover:border-primary-moss transition-all flex flex-col gap-2 cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-primary group-hover:text-primary-moss transition-colors">❤️ Support on Ko-fi</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Support with a one-time gift or monthly pledge.</span>
                </a>

                <a 
                  href="https://www.paypal.me/projectabide" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg bg-bg-primary bg-opacity-50 border border-border-color hover:border-primary-moss transition-all flex flex-col gap-2 cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-primary group-hover:text-primary-moss transition-colors">💳 PayPal Secure</span>
                  <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Direct, secure one-time donations via PayPal.</span>
                </a>

                <div 
                  className="p-4 rounded-lg bg-primary-moss bg-opacity-5 border border-primary-moss border-opacity-20 flex flex-col gap-2"
                >
                  <span className="text-sm font-semibold text-primary-moss">⭐ Leave a Review</span>
                  <span className="text-text-secondary" style={{ fontSize: '10px' }}>Giving a 5-star review on the Chrome Web Store helps others discover ProjectAbide!</span>
                </div>
              </div>

              {/* Dev Note */}
              <div className="p-4 rounded-lg bg-bg-primary bg-opacity-30 border border-border-color text-center font-serif italic text-xs text-text-secondary mt-2">
                "Each one must give as he has decided in his heart, not reluctantly or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-text-tertiary z-10 border-t border-border-color border-opacity-30 mt-auto" style={{ fontSize: '10px' }}>
        <span>Made with ❤️ by ProjectAbide</span>
      </footer>
    </div>
  );
}
