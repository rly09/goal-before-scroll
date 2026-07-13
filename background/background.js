// background.js - Main orchestrator for GBS Chrome Extension (Manifest V3)

import { StorageManager } from './storage.js';
import { MemeEngine } from './meme_engine.js';
import { Detector } from './detector.js';

// Keep track of the last productive URL in memory
let lastProductiveUrl = 'https://www.google.com';

// Cache to keep track of bypassed tabs (tabId -> url) and already blocked tab urls (tabId -> url)
const bypassedTabs = new Map();
const lastBlockedTabUrl = new Map();

function clearBypassState() {
  bypassedTabs.clear();
  lastBlockedTabUrl.clear();
}

// Monitor tab removals to clean up cache
chrome.tabs.onRemoved.addListener((tabId) => {
  bypassedTabs.delete(tabId);
  lastBlockedTabUrl.delete(tabId);
});

// Update the badge with the remaining time
async function updateBadge() {
  const mission = await StorageManager.getActiveMission();
  if (mission && mission.status === 'active') {
    const remainingMs = mission.endsAt - Date.now();
    if (remainingMs <= 0) {
      await endMissionDueToTimeout();
      return;
    }
    const remainingMins = Math.ceil(remainingMs / 60000);
    chrome.action.setBadgeText({ text: `${remainingMins}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#BDD1C5' }); // Morning Mint
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Alarm listener for MV3 persistence
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'mission_alarm') {
    await endMissionDueToTimeout();
  } else if (alarm.name === 'badge_alarm') {
    await updateBadge();
  }
});

// Handle mission timeout expiration
async function endMissionDueToTimeout() {
  chrome.alarms.clearAll();
  clearBypassState();
  const mission = await StorageManager.getActiveMission();
  if (mission && mission.status === 'active') {
    const completed = await StorageManager.completeMission(mission);
    chrome.action.setBadgeText({ text: 'Done' });
    chrome.action.setBadgeBackgroundColor({ color: '#9EABA2' }); // Sage Mist

    // Send notifications if enabled
    const settings = await StorageManager.getSettings();
    if (settings.notificationEnabled) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../images/logo.png',
        title: 'Mission Accomplished! 🌟',
        message: `Great job! You focused on "${mission.name}" for ${mission.duration} minutes.`,
        priority: 2
      });
    }

    // Notify any open tabs (like content scripts or popup) that mission is complete
    chrome.runtime.sendMessage({ type: 'MISSION_COMPLETED', mission: completed }).catch(() => {});
  }
}

// Check if tab is blocked and handle it
async function checkTabState(tabId, url, title) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }

  const activeMission = await StorageManager.getActiveMission();
  if (!activeMission || activeMission.status !== 'active') {
    return;
  }

  // If this tab-url is bypassed, do not block
  if (bypassedTabs.get(tabId) === url) {
    return;
  }

  const settings = await StorageManager.getSettings();
  const checkResult = await Detector.checkUrl(url, title, settings, activeMission);

  if (checkResult.blocked) {
    // If we've already registered this block for this tab-url, don't duplicate count
    if (lastBlockedTabUrl.get(tabId) === url) {
      // Just re-send the message in case the content script needs rendering
      const meme = await MemeEngine.getNextMeme(settings.memeCategory);
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_OVERLAY',
        meme,
        missionName: activeMission.name,
        strictMode: settings.strictMode,
        soundEnabled: settings.soundEnabled
      }).catch(() => {});
      return;
    }

    // Record the distraction
    const domain = new URL(url).hostname;
    await StorageManager.recordDistraction(domain, 'blocked');
    await StorageManager.recordMemeSeen();
    
    lastBlockedTabUrl.set(tabId, url);
    
    // Fetch a fresh meme
    const meme = await MemeEngine.getNextMeme(settings.memeCategory);
    
    // Tell content script to show overlay
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_OVERLAY',
      meme,
      missionName: activeMission.name,
      strictMode: settings.strictMode,
      soundEnabled: settings.soundEnabled
    }).catch(() => {});
  } else {
    // Save this as last productive URL
    lastProductiveUrl = url;
    // Clear last blocked tab url since they are on a productive page
    lastBlockedTabUrl.delete(tabId);
  }
}

// Monitor tab updates (URL change, title load)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    const urlToCheck = changeInfo.url || tab.url;
    const titleToCheck = changeInfo.title || tab.title;
    checkTabState(tabId, urlToCheck, titleToCheck);
  }
});

// Monitor tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    checkTabState(activeInfo.tabId, tab.url, tab.title);
  } catch (e) {
    console.error("onActivated tab retrieval failed:", e);
  }
});

// Extension Installation Initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  await StorageManager.init();
  if (details.reason === 'install') {
    console.log("Goal before Scroll initialized.");
  }
});

// Handle incoming messages from popup & content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const settings = await StorageManager.getSettings();
      const activeMission = await StorageManager.getActiveMission();

      if (message.type === 'START_MISSION') {
        const { name, presetId, duration } = message;
        const startedAt = Date.now();
        const endsAt = startedAt + duration * 60 * 1000;

        const newMission = {
          name,
          presetId,
          duration,
          startedAt,
          endsAt,
          distractionsCount: 0,
          recoveredCount: 0,
          ignoredCount: 0,
          status: 'active'
        };

        clearBypassState();
        await StorageManager.setActiveMission(newMission);
        
        // Setup alarms
        chrome.alarms.clearAll();
        chrome.alarms.create('mission_alarm', { when: endsAt });
        chrome.alarms.create('badge_alarm', { periodInMinutes: 1 });
        
        await updateBadge();
        sendResponse({ success: true, mission: newMission });

      } else if (message.type === 'CANCEL_MISSION') {
        chrome.alarms.clearAll();
        clearBypassState();
        if (activeMission) {
          activeMission.status = 'cancelled';
          await StorageManager.setActiveMission(activeMission);
        }
        await updateBadge();
        sendResponse({ success: true });

      } else if (message.type === 'COMPLETE_MISSION') {
        chrome.alarms.clearAll();
        clearBypassState();
        if (activeMission) {
          const completed = await StorageManager.completeMission(activeMission);
          await updateBadge();
          sendResponse({ success: true, mission: completed });
        } else {
          sendResponse({ success: false });
        }

      } else if (message.type === 'CHECK_URL') {
        // Content script request on page load (anti-flash check)
        const { url, title } = message;
        const tabId = sender.tab ? sender.tab.id : null;

        if (!activeMission || activeMission.status !== 'active') {
          sendResponse({ blocked: false });
          return;
        }

        // If this tab-url is bypassed, do not block
        if (tabId && bypassedTabs.get(tabId) === url) {
          sendResponse({ blocked: false });
          return;
        }

        const checkResult = await Detector.checkUrl(url, title, settings, activeMission);
        if (checkResult.blocked) {
          const domain = new URL(url).hostname;

          // Check if we already recorded this block for this tab-url
          if (tabId && lastBlockedTabUrl.get(tabId) === url) {
            const meme = await MemeEngine.getNextMeme(settings.memeCategory);
            sendResponse({
              blocked: true,
              meme,
              missionName: activeMission.name,
              strictMode: settings.strictMode,
              soundEnabled: settings.soundEnabled
            });
            return;
          }

          await StorageManager.recordDistraction(domain, 'blocked');
          await StorageManager.recordMemeSeen();
          
          if (tabId) {
            lastBlockedTabUrl.set(tabId, url);
          }
          
          const meme = await MemeEngine.getNextMeme(settings.memeCategory);
          sendResponse({
            blocked: true,
            meme,
            missionName: activeMission.name,
            strictMode: settings.strictMode,
            soundEnabled: settings.soundEnabled
          });
        } else {
          lastProductiveUrl = url;
          if (tabId) {
            lastBlockedTabUrl.delete(tabId);
          }
          sendResponse({ blocked: false });
        }

      } else if (message.type === 'RECORD_DISTRACTION_ACTION') {
        const { domain, action } = message;
        await StorageManager.recordDistraction(domain, action);
        
        if (action === 'ignored' && sender.tab) {
          bypassedTabs.set(sender.tab.id, sender.tab.url);
        }
        sendResponse({ success: true });

      } else if (message.type === 'GET_BACK_TO_MISSION_REDIRECT') {
        // Find default whitelist site as fallback
        let fallbackUrl = 'https://www.google.com';
        if (activeMission) {
          // Attempt to find whitelisted site in active preset
          const res = await fetch(chrome.runtime.getURL('data/presets.json'));
          const presets = await res.json();
          const preset = presets.find(p => p.id === activeMission.presetId);
          if (preset && preset.whitelist && preset.whitelist.length > 0) {
            // Find first whitelist item that is not google
            const productive = preset.whitelist.find(d => !d.includes('google.com'));
            if (productive) {
              fallbackUrl = `https://${productive}`;
            } else {
              fallbackUrl = `https://${preset.whitelist[0]}`;
            }
          }
        }
        
        let customFallback = null;
        if (settings && settings.customWhitelist && settings.customWhitelist.length > 0) {
          customFallback = `https://${settings.customWhitelist[0]}`;
        }

        const redirectUrl = lastProductiveUrl && !lastProductiveUrl.includes('youtube.com/watch') && !lastProductiveUrl.includes('instagram.com')
          ? lastProductiveUrl 
          : (customFallback || fallbackUrl);

        sendResponse({ redirectUrl });
      }
    } catch (err) {
      console.error("Message handling error:", err);
      sendResponse({ error: err.message });
    }
  })();
  
  return true; // Keep message channel open for async sendResponse
});
