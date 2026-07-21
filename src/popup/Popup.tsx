import { useEffect, useState } from 'react';
import { 
  Shield, ShieldAlert, Sparkles, Flame, Copy, Check, 
  ExternalLink, Ban, Unlock, Settings
} from 'lucide-react';
import { getSettings, updateSettings, ExtensionSettings } from '../utils/storage';
import { getVerseOfTheDay, Verse } from '../utils/bible';
import { initTheme } from '../utils/theme';

export default function Popup() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [dailyVerse, setDailyVerse] = useState<Verse>({ reference: '', verse: '' });
  const [copied, setCopied] = useState(false);
  
  // Active tab state
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [isCurrentBlocked, setIsCurrentBlocked] = useState(false);

  useEffect(() => {
    initTheme();
    loadPopupData();
  }, []);

  const loadPopupData = async () => {
    // 1. Get settings
    const data = await getSettings();
    setSettings(data);
    
    // 2. Load daily verse
    setDailyVerse(getVerseOfTheDay());

    // 3. Inspect current tab domain
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url) {
          try {
            const url = new URL(activeTab.url);
            // Only process http/https domains
            if (url.protocol.startsWith('http')) {
              const domainName = url.hostname.replace('www.', '');
              setCurrentDomain(domainName);
              
              const isBlocked = data.blockedSites.some(site => {
                const cleanSite = site.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
                return domainName === cleanSite || domainName.endsWith('.' + cleanSite);
              });
              setIsCurrentBlocked(isBlocked);
            }
          } catch (e) {
            console.error('Error parsing tab URL:', e);
          }
        }
      });
    }
  };

  const handleToggleBlocker = async () => {
    if (!settings) return;
    const updated = await updateSettings({ isBlockingEnabled: !settings.isBlockingEnabled });
    setSettings(updated);
    
    // Notify background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
    }
  };

  const handleBlockCurrentSite = async () => {
    if (!settings || !currentDomain) return;
    
    let updatedSites = [...settings.blockedSites];
    if (isCurrentBlocked) {
      // Remove it
      updatedSites = updatedSites.filter(site => {
        const cleanSite = site.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        return currentDomain !== cleanSite && !currentDomain.endsWith('.' + cleanSite);
      });
    } else {
      // Add it
      updatedSites.push(currentDomain);
    }
    
    const updated = await updateSettings({ blockedSites: updatedSites });
    setSettings(updated);
    setIsCurrentBlocked(!isCurrentBlocked);
    
    // Notify background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
      
      // Reload the current tab to apply the block/unblock immediately
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    }
  };

  const handleCopyText = () => {
    const textToCopy = `"${dailyVerse.verse}" — ${dailyVerse.reference}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openFullPage = (page: 'newtab' | 'options') => {
    const url = page === 'newtab' ? 'newtab.html' : 'options.html';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  if (!settings) {
    return (
      <div className="p-6 flex justify-center items-center bg-bg-primary" style={{ width: '320px' }}>
        <div className="animate-spin-slow rounded-full h-6 w-6 border-b-2 border-primary-moss"></div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 bg-bg-primary select-none border border-border-color rounded-lg" style={{ width: '320px' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center pb-2.5 border-b border-border-color">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-primary-moss flex items-center justify-center text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">ProjectAbide</span>
        </div>
        <div className="flex items-center gap-1 text-primary-moss font-semibold text-xs bg-primary-moss-light px-2 py-0.5 rounded-full">
          <Flame className="h-3 w-3 fill-current" />
          <span>{settings.streak}</span>
        </div>
      </div>

      {/* Main Switch Card */}
      <div className="card p-3.5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {settings.isBlockingEnabled ? (
              <Shield className="h-4.5 w-4.5 text-primary-moss fill-current fill-opacity-20" />
            ) : (
              <ShieldAlert className="h-4.5 w-4.5 text-danger" />
            )}
            <span className="text-xs font-semibold text-text-primary">
              Focus Blocker: {settings.isBlockingEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          
          {/* Toggle Switch */}
          <button 
            onClick={handleToggleBlocker}
            className={`switch-track ${settings.isBlockingEnabled ? 'active' : ''}`}
          >
            <div className="switch-thumb" />
          </button>
        </div>

        {/* Current Domain Blocker Button */}
        {currentDomain && (
          <button
            onClick={handleBlockCurrentSite}
            className={`btn w-full py-2 text-xxs flex items-center justify-center gap-1.5 ${
              isCurrentBlocked 
                ? 'btn-danger bg-opacity-90 hover:bg-opacity-100' 
                : 'btn-secondary text-text-secondary hover:text-text-primary'
            }`}
            style={{ fontSize: '0.75rem' }}
          >
            {isCurrentBlocked ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Unblock this site</span>
              </>
            ) : (
              <>
                <Ban className="h-3.5 w-3.5 text-danger" />
                <span>Block this site</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Verse Card */}
      <div className="card p-3 flex flex-col gap-2 relative bg-bg-secondary bg-opacity-65">
        <span className="font-semibold text-primary-moss tracking-wider uppercase" style={{ fontSize: '9px' }}>Verse of the Day</span>
        <p className="font-serif text-xs leading-relaxed text-text-primary line-clamp-3">
          "{dailyVerse.verse}"
        </p>
        <div className="flex justify-between items-center mt-1 pt-1 border-t border-border-color border-opacity-50">
          <span className="text-accent-gold font-medium" style={{ fontSize: '10px' }}>{dailyVerse.reference}</span>
          <button 
            onClick={handleCopyText}
            className="text-text-secondary hover:text-text-primary flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
            style={{ fontSize: '9px' }}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Footer launch controls */}
      <div className="flex gap-2">
        <button 
          onClick={() => openFullPage('newtab')}
          className="btn btn-primary flex-1 py-2 text-xxs font-medium"
          style={{ fontSize: '0.725rem' }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => openFullPage('options')}
          className="btn btn-secondary py-2 px-2.5"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}
