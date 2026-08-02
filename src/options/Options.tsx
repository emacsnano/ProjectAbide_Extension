import React, { useEffect, useState } from 'react';
import {
  Shield, Bookmark, BarChart3, Settings, Plus, Trash2,
  Copy, Check, Sun, Moon, Monitor, Sparkles,
  CheckSquare, Award, Flame, Hourglass, Globe, Heart,
  Database, Download, HardDrive, RefreshCw, AlertCircle,
  Layout, HeartHandshake, Search, BookOpen,
  Image, Upload, Sliders
} from 'lucide-react';
import {
  getSettings, updateSettings, ExtensionSettings,
  BookmarkedVerse
} from '../utils/storage';
import { applyTheme, initTheme } from '../utils/theme';
import { hasOfflineKJV, downloadAndSaveKJV, clearOfflineKJV } from '../utils/kjvStorage';

export default function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [activePanel, setActivePanel] = useState<'blocker' | 'bookmarks' | 'stats' | 'general' | 'support'>('blocker');

  // Blocker panel state
  const [newSiteInput, setNewSiteInput] = useState('');
  const [blockError, setBlockError] = useState('');

  // Bookmark state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // KJV Offline Storage state
  const [isKjvDownloaded, setIsKjvDownloaded] = useState<boolean>(false);
  const [isDownloadingKjv, setIsDownloadingKjv] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [kjvError, setKjvError] = useState<string>('');

  useEffect(() => {
    initTheme();
    loadSettings();
    checkKjvStatus();

    // Check URL parameters for active panel routing
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['blocker', 'bookmarks', 'stats', 'general', 'support'].includes(tab)) {
      setActivePanel(tab as any);
    }
  }, []);

  const checkKjvStatus = async () => {
    const downloaded = await hasOfflineKJV();
    setIsKjvDownloaded(downloaded);
  };

  const handleDownloadKjv = async () => {
    setIsDownloadingKjv(true);
    setDownloadProgress(0);
    setKjvError('');
    try {
      await downloadAndSaveKJV((percent) => {
        setDownloadProgress(percent);
      });
      setIsKjvDownloaded(true);
    } catch (e: any) {
      setKjvError(e.message || 'Failed to download KJV Bible');
    } finally {
      setIsDownloadingKjv(false);
    }
  };

  const handleClearKjv = async () => {
    if (confirm('Are you sure you want to remove the offline KJV Bible database? Search will revert to using the online API.')) {
      await clearOfflineKJV();
      setIsKjvDownloaded(false);
    }
  };

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

    // Validate domain format (e.g. website.com or sub.website.co)
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i;
    if (!domainRegex.test(domain)) {
      setBlockError('Please enter a valid domain name (e.g., website.com).');
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

  // Toggle New Tab Module visibility
  const handleToggleTabModule = async (key: 'showReflectionTab' | 'showSearchTab' | 'showJournalTab') => {
    if (!settings) return;
    const updated = await updateSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  // Wallpaper Handlers
  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Image file size should be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url && settings) {
        const updated = await updateSettings({ customWallpaper: base64Url });
        setSettings(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearWallpaper = async () => {
    if (!settings) return;
    const updated = await updateSettings({ customWallpaper: '' });
    setSettings(updated);
  };

  const handleOverlayChange = async (val: number) => {
    if (!settings) return;
    const updated = await updateSettings({ wallpaperOverlay: val });
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
    <div className="min-h-screen flex flex-col bg-bg-primary relative overflow-y-auto overflow-x-hidden">
      {/* Background Calm Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10 z-0">
        <div className="absolute rounded-full bg-primary-moss" style={{ top: '-10%', left: '-10%', width: '50%', height: '50%', filter: 'blur(130px)' }}></div>
        <div className="absolute rounded-full bg-accent-gold" style={{ bottom: '-10%', right: '-10%', width: '50%', height: '50%', filter: 'blur(130px)' }}></div>
      </div>

      {/* Settings Layout */}
      <div className="options-container" style={{ maxWidth: '1200px' }}>

        {/* Left Sidebar Navigation */}
        <aside className="options-sidebar">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${activePanel === 'blocker'
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
            >
              <Shield className="h-4 w-4" />
              <span>Focus Blocker</span>
            </button>

            <button
              onClick={() => setActivePanel('bookmarks')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${activePanel === 'bookmarks'
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>Saved Scriptures</span>
            </button>

            <button
              onClick={() => setActivePanel('stats')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${activePanel === 'stats'
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Focus Statistics</span>
            </button>

            <button
              onClick={() => setActivePanel('general')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${activePanel === 'general'
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
            >
              <Settings className="h-4 w-4" />
              <span>App Preferences</span>
            </button>

            <button
              onClick={() => setActivePanel('support')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium text-left transition-all ${activePanel === 'support'
                  ? 'bg-primary-moss-light text-primary-moss font-semibold border-l-4 border-primary-moss'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
            >
              <Heart className="h-4 w-4" />
              <span>Support & Donate</span>
            </button>
          </nav>
        </aside>

        {/* Right Details Panel Column */}
        <div className="options-content-col">
          <main className="card p-6 bg-bg-secondary bg-opacity-70 glass animate-fade-in border border-border-color options-main-card">

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
                      className={`btn py-2.5 text-xs ${settings.theme === 'light'
                          ? 'btn-primary font-semibold'
                          : 'btn-secondary text-text-secondary'
                        }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span>Light</span>
                    </button>

                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`btn py-2.5 text-xs ${settings.theme === 'dark'
                          ? 'btn-primary font-semibold'
                          : 'btn-secondary text-text-secondary'
                        }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span>Dark</span>
                    </button>

                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`btn py-2.5 text-xs ${settings.theme === 'system'
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
                        className={`btn py-2 text-xs ${settings.translation === trans
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

                {/* New Tab Modules Customization */}
                <div className="flex flex-col gap-3 pt-2 border-t border-border-color mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      <Layout className="h-3.5 w-3.5 text-primary-moss" />
                      New Tab Dashboard Modules
                    </label>
                    <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Customize visible dashboard widgets</span>
                  </div>

                  <div className="flex flex-col gap-2 bg-bg-primary bg-opacity-40 p-3 rounded-lg border border-border-color">
                    {/* Reflection / Daily Checklist toggle */}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="h-4 w-4 text-primary-moss shrink-0" />
                        <div>
                          <span className="text-xs font-semibold block text-primary">Reflection Checklist</span>
                          <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Daily spiritual focus and breathing pause checklist</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTabModule('showReflectionTab')}
                        className={`switch-track ${settings.showReflectionTab ? 'active' : ''}`}
                      >
                        <div className="switch-thumb" />
                      </button>
                    </div>

                    {/* Bible Search toggle */}
                    <div className="flex items-center justify-between py-1.5 border-t border-border-color border-opacity-40">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary-moss shrink-0" />
                        <div>
                          <span className="text-xs font-semibold block text-primary">Bible Search</span>
                          <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Scripture search and topical study module</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTabModule('showSearchTab')}
                        className={`switch-track ${settings.showSearchTab ? 'active' : ''}`}
                      >
                        <div className="switch-thumb" />
                      </button>
                    </div>

                    {/* Prayer Journal toggle */}
                    <div className="flex items-center justify-between py-1.5 border-t border-border-color border-opacity-40">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary-moss shrink-0" />
                        <div>
                          <span className="text-xs font-semibold block text-primary">Prayer Journal</span>
                          <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Personal prayer log and praise tracker</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTabModule('showJournalTab')}
                        className={`switch-track ${settings.showJournalTab ? 'active' : ''}`}
                      >
                        <div className="switch-thumb" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Wallpaper Background */}
                <div className="flex flex-col gap-3 pt-2 border-t border-border-color mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      <Image className="h-3.5 w-3.5 text-primary-moss" />
                      Custom Background Wallpaper
                    </label>
                    <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Upload your own photo or choose serene presets</span>
                  </div>

                  <div className="p-4 rounded-lg bg-bg-primary bg-opacity-40 border border-border-color flex flex-col gap-3">
                    {/* Active Wallpaper Preview & Controls */}
                    {settings.customWallpaper ? (
                      <div className="flex flex-col gap-3">
                        <div className="relative w-full h-44 rounded-lg overflow-hidden border border-border-color shadow-inner">
                          <img 
                            src={settings.customWallpaper} 
                            alt="Custom Wallpaper Preview" 
                            className="w-full h-full object-cover"
                          />
                          <div 
                            className="absolute inset-0 bg-black transition-opacity"
                            style={{ opacity: settings.wallpaperOverlay }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-white text-xs font-serif italic text-center px-4 drop-shadow">
                              "Trust in Jehovah with all thy heart..."
                            </span>
                          </div>
                        </div>

                        {/* Dark Overlay Slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Sliders className="h-3 w-3 text-primary-moss" />
                              Dark Overlay Opacity
                            </span>
                            <span>{Math.round(settings.wallpaperOverlay * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="0.8" 
                            step="0.05"
                            value={settings.wallpaperOverlay}
                            onChange={(e) => handleOverlayChange(parseFloat(e.target.value))}
                            className="w-full accent-primary-moss cursor-pointer"
                          />
                          <span className="text-text-tertiary" style={{ fontSize: '9px' }}>
                            Increase overlay darkness to ensure scripture text is always readable over bright wallpapers.
                          </span>
                        </div>

                        {/* Change / Remove Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-border-color border-opacity-40">
                          <label className="btn btn-secondary py-2 text-xs flex-1 flex items-center justify-center gap-1.5 cursor-pointer">
                            <Upload className="h-3.5 w-3.5 text-primary-moss" />
                            <span>Change Image</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleWallpaperUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={handleClearWallpaper}
                            className="btn py-2 text-xs text-red-500 border border-red-500 border-opacity-30 hover:bg-red-500 hover:bg-opacity-10 flex items-center justify-center gap-1.5 cursor-pointer flex-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove Wallpaper</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Upload Button */}
                        <label className="p-4 rounded-lg border-2 border-dashed border-border-color hover:border-primary-moss transition-all flex flex-col items-center justify-center gap-2 cursor-pointer bg-bg-secondary bg-opacity-30 group">
                          <Upload className="h-6 w-6 text-primary-moss group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium text-text-primary">Click to Upload Wallpaper Image</span>
                          <span className="text-text-tertiary" style={{ fontSize: '10px' }}>Supports JPG, PNG, WebP (Max 8MB)</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleWallpaperUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Preset Wallpapers */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <span className="text-xs text-text-tertiary">Or pick a Serene Preset Wallpaper:</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { name: 'Misty Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80' },
                              { name: 'Mountain Calm', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80' },
                              { name: 'Peaceful Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80' }
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                onClick={async () => {
                                  if (settings) {
                                    const updated = await updateSettings({ customWallpaper: preset.url });
                                    setSettings(updated);
                                  }
                                }}
                                className="relative h-16 rounded-md overflow-hidden border border-border-color group hover:border-accent-gold transition-all cursor-pointer"
                              >
                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                  <span className="text-white text-xxs font-medium drop-shadow">{preset.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Offline KJV Bible Database */}
                <div className="flex flex-col gap-3 pt-2 border-t border-border-color mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-primary-moss" />
                      Offline Bible Translations
                    </label>
                    <span className={`px-2 py-0.5 rounded-full text-xxs font-medium ${isKjvDownloaded
                        ? 'bg-primary-moss-light text-primary-moss'
                        : 'bg-bg-secondary text-text-tertiary border border-border-color'
                      }`}>
                      {isKjvDownloaded ? 'Downloaded (Offline Ready)' : 'Online API Mode'}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-bg-primary bg-opacity-40 border border-border-color flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                          <HardDrive className="h-3.5 w-3.5 text-accent-gold" />
                          King James Version (KJV)
                        </span>
                        <p className="text-text-tertiary leading-normal" style={{ fontSize: '10px' }}>
                          {isKjvDownloaded
                            ? 'Complete KJV Bible stored locally in IndexedDB. Instant search available offline without internet connection.'
                            : 'Download full KJV Bible for fast offline searching (~4.5 MB). When not downloaded, search queries use the online API.'}
                        </p>
                      </div>
                    </div>

                    {isDownloadingKjv && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex justify-between text-xxs text-text-secondary" style={{ fontSize: '10px' }}>
                          <span>Downloading & Indexing KJV...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-moss transition-all duration-300 rounded-full"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {kjvError && (
                      <div className="p-2 rounded bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 text-red-500 text-xxs flex items-center gap-1.5" style={{ fontSize: '10px' }}>
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{kjvError}</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      {!isKjvDownloaded ? (
                        <button
                          onClick={handleDownloadKjv}
                          disabled={isDownloadingKjv}
                          className="btn btn-primary py-2 text-xs flex items-center gap-1.5 justify-center w-full"
                        >
                          {isDownloadingKjv ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Downloading... ({downloadProgress}%)</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              <span>Download KJV for Offline Search</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleClearKjv}
                          className="btn btn-secondary py-2 text-xs text-red-500 border-red-500 border-opacity-30 hover:bg-red-500 hover:bg-opacity-10 flex items-center gap-1.5 justify-center w-full"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove Offline KJV Database</span>
                        </button>
                      )}
                    </div>
                  </div>
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

          {/* Footer centered under main content */}
          <footer className="text-center py-4 mt-auto text-text-tertiary" style={{ fontSize: '10px' }}>
            <span>Made with ❤️ by ProjectAbide</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
