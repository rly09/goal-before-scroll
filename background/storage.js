// storage.js - Encapsulates all chrome.storage.local operations

const DEFAULT_SETTINGS = {
  theme: 'system',
  notificationEnabled: true,
  soundEnabled: true,
  animationEnabled: true,
  strictMode: false,
  customWhitelist: [],
  customBlacklist: [],
  memeCategory: 'Random'
};

const DEFAULT_STATS = {
  daily: {}, // format: { '2026-07-13': { focusTime: 0, sessions: 0, distractions: 0, recovered: 0, ignored: 0, memesSeen: 0 } }
  longestSession: 0, // in minutes
  commonDistractions: {}, // format: { 'youtube.com': 5 }
  totalMemesSeen: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastFocusDate: null // format: '2026-07-12'
};

// Helper: Get today's date string in YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const StorageManager = {
  async init() {
    const data = await chrome.storage.local.get(['settings', 'stats', 'onboarded']);
    const updates = {};
    
    if (!data.settings) {
      updates.settings = DEFAULT_SETTINGS;
    }
    if (!data.stats) {
      updates.stats = DEFAULT_STATS;
    }
    if (data.onboarded === undefined) {
      updates.onboarded = false;
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  },

  async getOnboarded() {
    const res = await chrome.storage.local.get('onboarded');
    return res.onboarded || false;
  },

  async setOnboarded(val) {
    await chrome.storage.local.set({ onboarded: val });
  },

  async getSettings() {
    const res = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...res.settings };
  },

  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    await chrome.storage.local.set({ settings: merged });
    return merged;
  },

  async getStats() {
    const res = await chrome.storage.local.get('stats');
    return { ...DEFAULT_STATS, ...res.stats };
  },

  async getActiveMission() {
    const res = await chrome.storage.local.get('activeMission');
    return res.activeMission || null;
  },

  async setActiveMission(mission) {
    await chrome.storage.local.set({ activeMission: mission });
  },

  async clearActiveMission() {
    await chrome.storage.local.remove('activeMission');
  },

  // Record a distraction event in active mission and statistics
  async recordDistraction(domain, action) {
    // 1. Update active mission
    const mission = await this.getActiveMission();
    if (mission && mission.status === 'active') {
      mission.distractionsCount = (mission.distractionsCount || 0) + 1;
      if (action === 'recovered') {
        mission.recoveredCount = (mission.recoveredCount || 0) + 1;
      } else if (action === 'ignored') {
        mission.ignoredCount = (mission.ignoredCount || 0) + 1;
      }
      await this.setActiveMission(mission);
    }

    // 2. Update overall stats
    const stats = await this.getStats();
    const today = getTodayString();

    if (!stats.daily[today]) {
      stats.daily[today] = { focusTime: 0, sessions: 0, distractions: 0, recovered: 0, ignored: 0, memesSeen: 0 };
    }
    
    stats.daily[today].distractions += 1;
    if (action === 'recovered') {
      stats.daily[today].recovered += 1;
    } else if (action === 'ignored') {
      stats.daily[today].ignored += 1;
    }

    // Record common distractions
    if (domain) {
      stats.commonDistractions[domain] = (stats.commonDistractions[domain] || 0) + 1;
    }

    await chrome.storage.local.set({ stats });
  },

  // Record that a meme was shown
  async recordMemeSeen() {
    const stats = await this.getStats();
    const today = getTodayString();

    if (!stats.daily[today]) {
      stats.daily[today] = { focusTime: 0, sessions: 0, distractions: 0, recovered: 0, ignored: 0, memesSeen: 0 };
    }

    stats.daily[today].memesSeen += 1;
    stats.totalMemesSeen = (stats.totalMemesSeen || 0) + 1;

    await chrome.storage.local.set({ stats });
  },

  // Complete mission: calculate metrics and award streaks
  async completeMission(mission) {
    const stats = await this.getStats();
    const today = getTodayString();
    
    if (!stats.daily[today]) {
      stats.daily[today] = { focusTime: 0, sessions: 0, distractions: 0, recovered: 0, ignored: 0, memesSeen: 0 };
    }

    const durationMinutes = Math.min(
      mission.duration, 
      Math.round((Date.now() - mission.startedAt) / 60000)
    );

    // Update session metrics
    stats.daily[today].focusTime += durationMinutes;
    stats.daily[today].sessions += 1;

    // Track longest session
    if (durationMinutes > stats.longestSession) {
      stats.longestSession = durationMinutes;
    }

    // Process streaks
    const lastDate = stats.lastFocusDate;
    if (lastDate !== today) {
      if (lastDate) {
        const diffTime = Math.abs(new Date(today) - new Date(lastDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.currentStreak += 1;
        } else if (diffDays > 1) {
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }
      
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      stats.lastFocusDate = today;
    }

    await chrome.storage.local.set({ stats });
    
    // Set mission status to completed and save
    mission.status = 'completed';
    mission.actualDuration = durationMinutes;
    await this.setActiveMission(mission);
    return mission;
  },

  async resetAllData() {
    await chrome.storage.local.clear();
    await this.init();
  },

  async exportSettings() {
    const data = await chrome.storage.local.get(['settings', 'stats', 'onboarded']);
    return JSON.stringify(data);
  },

  async importSettings(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const updates = {};
      if (parsed.settings) updates.settings = parsed.settings;
      if (parsed.stats) updates.stats = parsed.stats;
      if (parsed.onboarded !== undefined) updates.onboarded = parsed.onboarded;
      
      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
        return true;
      }
    } catch (e) {
      console.error("Failed to import settings:", e);
    }
    return false;
  }
};
