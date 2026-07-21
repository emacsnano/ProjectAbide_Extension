import { getSettings, getBypasses } from '../utils/storage';

// Synchronizes the declarativeNetRequest rules with the user's blocked sites list
async function syncRules() {
  try {
    const settings = await getSettings();
    const bypasses = await getBypasses();
    const now = Date.now();

    // Clean up expired bypasses
    const activeBypasses = bypasses.filter(b => b.expiryTime > now);
    if (bypasses.length !== activeBypasses.length) {
      await chrome.storage.local.set({ bypasses: activeBypasses });
    }

    const bypassedDomains = new Set(activeBypasses.map(b => b.domain));

    // Get all current dynamic rules
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRuleIds = currentRules.map(r => r.id);

    const newRules: chrome.declarativeNetRequest.Rule[] = [];

    if (settings.isBlockingEnabled) {
      let ruleId = 1;
      
      for (const site of settings.blockedSites) {
        // Normalize the domain
        const cleanSite = site.trim().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        if (!cleanSite) continue;

        // Skip adding block rule if there is an active temporary bypass
        if (bypassedDomains.has(cleanSite)) {
          continue;
        }

        // Rule for direct domain access (e.g. example.com)
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
            redirect: { extensionPath: `/blocked.html?url=${cleanSite}` }
          },
          condition: {
            urlFilter: `*://${cleanSite}/*`,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
          }
        });

        // Rule for subdomains (e.g. *.example.com)
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
            redirect: { extensionPath: `/blocked.html?url=${cleanSite}` }
          },
          condition: {
            urlFilter: `*://*.${cleanSite}/*`,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
          }
        });
      }
    }

    // Update rules dynamically
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds,
      addRules: newRules
    });
    
    console.log(`Synced ${newRules.length} blocking rules. Active bypasses:`, Array.from(bypassedDomains));
  } catch (error) {
    console.error('Error synchronizing blocking rules:', error);
  }
}

// Set up alarms for temporary bypasses
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`Bypass alarm fired for: ${alarm.name}`);
  const bypasses = await getBypasses();
  
  // Remove the expired bypass
  const updatedBypasses = bypasses.filter(b => b.domain !== alarm.name);
  await chrome.storage.local.set({ bypasses: updatedBypasses });
  
  // Re-sync rules to apply the block again
  await syncRules();
  
  // Attempt to reload any tabs currently on this site to force the redirection back to blocked screen
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url && tab.url.includes(alarm.name)) {
      chrome.tabs.reload(tab.id);
    }
  }
});

// Message listener for runtime triggers
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'BYPASS_ADDED') {
    const { domain, durationMinutes } = message;
    console.log(`Setting alarm for bypass: ${domain} for ${durationMinutes} minutes.`);
    
    // Create alarm to restore the block after duration
    chrome.alarms.create(domain, { delayInMinutes: durationMinutes });
    
    // Immediately re-sync rules to disable the block
    syncRules().then(() => {
      sendResponse({ status: 'success' });
    });
    
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'SYNC_RULES') {
    syncRules().then(() => {
      sendResponse({ status: 'success' });
    });
    return true;
  }
});

// Watch settings and bypasses storage keys for changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.settings) {
    syncRules();
  }
  if (areaName === 'local' && changes.bypasses) {
    syncRules();
  }
});

// Run sync rules on extension install, update, or startup
chrome.runtime.onInstalled.addListener(() => {
  syncRules();
});

chrome.runtime.onStartup.addListener(() => {
  syncRules();
});
