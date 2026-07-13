// popup.js - Controller for popup dashboard interface

import { renderFocusChart } from './chart.js';

let presets = [];
let activeTab = 'focus';
let timerInterval = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await loadPresets();
  await checkOnboarding();
  setupNavigation();
  setupSettingsListeners();
});

// Load the appropriate theme
async function initTheme() {
  const res = await chrome.storage.local.get('settings');
  const theme = res.settings ? res.settings.theme : 'system';
  applyTheme(theme);
}

function applyTheme(theme) {
  document.body.classList.remove('light-theme', 'dark-theme');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    // System theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.add(isDark ? 'dark-theme' : 'light-theme');
  }
}

// Fetch presets from JSON
async function loadPresets() {
  const res = await fetch(chrome.runtime.getURL('data/presets.json'));
  presets = await res.json();
}

// Check if onboarded, route screen
async function checkOnboarding() {
  const onboarded = await getFromStorage('onboarded', false);
  if (!onboarded) {
    showScreen('onboarding');
    initOnboarding();
  } else {
    showScreen('focus');
    await initFocusScreen();
  }
}

// Helper: Show/Hide HTML Screens
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`${screenId}-screen`);
  if (target) target.classList.add('active');
  
  // Show/Hide Nav Bar
  const navBar = document.getElementById('bottom-nav');
  if (screenId === 'onboarding') {
    navBar.style.display = 'none';
  } else {
    navBar.style.display = 'flex';
    
    // Highlight active nav item
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const tabEl = document.querySelector(`.nav-tab[data-tab="${screenId}"]`);
    if (tabEl) tabEl.classList.add('active');
  }
}

// Setup Bottom Navigation Bar
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const targetTab = tab.getAttribute('data-tab');
      if (activeTab === targetTab) return;
      
      activeTab = targetTab;
      showScreen(targetTab);
      
      if (targetTab === 'focus') {
        await initFocusScreen();
      } else if (targetTab === 'stats') {
        await initStatsScreen();
      } else if (targetTab === 'settings') {
        await initSettingsScreen();
      }
    });
  });
}

/* ==========================================================================
   ONBOARDING PROCESS
   ========================================================================== */
function initOnboarding() {
  let currentSlide = 0;
  const slides = document.querySelectorAll('.onboard-slide');
  const dots = document.querySelectorAll('.dot');
  
  const showSlide = (idx) => {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[idx].classList.add('active');
    dots[idx].classList.add('active');
  };

  // Next / Skip triggers
  document.getElementById('onboard-next-1').addEventListener('click', () => {
    currentSlide = 1;
    showSlide(1);
  });
  
  document.getElementById('onboard-next-2').addEventListener('click', () => {
    currentSlide = 2;
    showSlide(2);
  });
  
  document.getElementById('onboard-finish').addEventListener('click', async () => {
    await chrome.storage.local.set({ onboarded: true });
    showScreen('focus');
    await initFocusScreen();
  });
}

/* ==========================================================================
   FOCUS / ACTIVE MISSION SCREEN
   ========================================================================== */
async function initFocusScreen() {
  // Clear any existing local ticking timers
  if (timerInterval) clearInterval(timerInterval);

  const activeMission = await getFromStorage('activeMission', null);
  
  if (activeMission && activeMission.status === 'active') {
    renderActiveMission(activeMission);
  } else if (activeMission && activeMission.status === 'completed') {
    renderMissionCompleteSummary(activeMission);
  } else {
    renderMissionSetup();
  }
}

// Render Setup Form
function renderMissionSetup() {
  const container = document.getElementById('focus-screen');
  container.innerHTML = `
    <div class="header-area">
      <div>
        <div class="brand-subtitle">Goal before Scroll</div>
        <div class="brand-title">Start Focus Session</div>
      </div>
    </div>

    <div class="glass-card">
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label" for="custom-mission-name">What is your current mission?</label>
        <input type="text" id="custom-mission-name" class="text-input" placeholder="e.g. Learn DSA / Flutter Dev" autofocus>
      </div>
    </div>

    <div class="glass-card">
      <div class="section-title">Duration (Minutes)</div>
      <div class="durations-row" id="durations-container"></div>
    </div>

    <button id="btn-start-mission" class="btn btn-primary">
      🚀 Start Mission
    </button>
  `;

  // Draw Duration Chips
  const durationsContainer = document.getElementById('durations-container');
  const options = [15, 30, 45, 60, 90, 120];
  let selectedDuration = 30;

  options.forEach(mins => {
    const chip = document.createElement('div');
    chip.className = `duration-chip ${mins === selectedDuration ? 'active' : ''}`;
    chip.innerText = mins;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedDuration = mins;
    });
    durationsContainer.appendChild(chip);
  });

  // Focus the input field
  const inputEl = document.getElementById('custom-mission-name');
  if (inputEl) {
    inputEl.focus();
  }

  // Start Button Event
  document.getElementById('btn-start-mission').addEventListener('click', () => {
    const missionName = document.getElementById('custom-mission-name').value.trim();
    if (!missionName) {
      alert('Please enter your focus mission name!');
      return;
    }

    // Send message to background to start
    chrome.runtime.sendMessage({
      type: 'START_MISSION',
      name: missionName,
      presetId: 'custom',
      duration: selectedDuration
    }, (res) => {
      if (res && res.success) {
        renderActiveMission(res.mission);
      }
    });
  });
}

// Render active countdown view
function renderActiveMission(mission) {
  const container = document.getElementById('focus-screen');
  container.innerHTML = `
    <div class="header-area">
      <div>
        <div class="brand-subtitle">Current Mission</div>
        <div class="brand-title" id="active-mission-title">${escapeHtml(mission.name)}</div>
      </div>
    </div>

    <div class="glass-card">
      <div class="timer-container">
        <div class="timer-circle" id="timer-display">00:00</div>
        <div class="timer-label">Remaining Time</div>
        
        <div class="timer-metrics">
          <div class="metric-box">
            <div class="metric-num" id="metric-distractions">0</div>
            <div class="metric-label">Distractions</div>
          </div>
          <div class="metric-box">
            <div class="metric-num" id="metric-recovered">0</div>
            <div class="metric-label">Recovered</div>
          </div>
          <div class="metric-box">
            <div class="metric-num" id="metric-ignored">0</div>
            <div class="metric-label">Ignored</div>
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 12px;">
      <button id="btn-complete-mission" class="btn btn-primary" style="flex: 1.5;">
        🌟 Done (Complete)
      </button>
      <button id="btn-cancel-mission" class="btn btn-secondary" style="flex: 1;">
        Give Up
      </button>
    </div>
  `;

  // Start tick counter
  const updateTimer = () => {
    const remainingMs = mission.endsAt - Date.now();
    if (remainingMs <= 0) {
      clearInterval(timerInterval);
      initFocusScreen(); // Trigger completed screen
      return;
    }

    // Format MM:SS
    const totalSecs = Math.floor(remainingMs / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    document.getElementById('timer-display').innerText = `${mins}:${secs}`;
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);

  // Load metrics from storage
  const syncMetrics = async () => {
    const updated = await getFromStorage('activeMission', null);
    if (updated) {
      document.getElementById('metric-distractions').innerText = updated.distractionsCount || 0;
      document.getElementById('metric-recovered').innerText = updated.recoveredCount || 0;
      document.getElementById('metric-ignored').innerText = updated.ignoredCount || 0;
    }
  };
  
  syncMetrics();
  // Poll storage metrics every 2 seconds
  const metricsInterval = setInterval(syncMetrics, 2000);

  // Complete Mission Event
  document.getElementById('btn-complete-mission').addEventListener('click', () => {
    clearInterval(timerInterval);
    clearInterval(metricsInterval);
    chrome.runtime.sendMessage({ type: 'COMPLETE_MISSION' }, (res) => {
      if (res && res.success) {
        renderMissionCompleteSummary(res.mission);
      }
    });
  });

  // Cancel/Give Up Event
  document.getElementById('btn-cancel-mission').addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel your mission? Your progress won\'t count.')) {
      clearInterval(timerInterval);
      clearInterval(metricsInterval);
      chrome.runtime.sendMessage({ type: 'CANCEL_MISSION' }, () => {
        renderMissionSetup();
      });
    }
  });
}

// Render Session Completed Summary Screen
async function renderMissionCompleteSummary(mission) {
  const totalDistractions = mission.distractionsCount || 0;
  const recovered = mission.recoveredCount || 0;
  const ignored = mission.ignoredCount || 0;
  const completionPercentage = totalDistractions === 0 ? 100 : Math.round((recovered / totalDistractions) * 100);

  // Fetch a funny complete ending meme
  const settings = await getFromStorage('settings', {});
  const res = await fetch(chrome.runtime.getURL('data/memes.json'));
  const memes = await res.json();
  
  // Pick random image for the completed overlay
  const categoryMemes = memes[settings.memeCategory || 'Random'] || memes['Random'];
  const endingMeme = categoryMemes[Math.floor(Math.random() * categoryMemes.length)];
  const memeUrl = chrome.runtime.getURL(`images/images/${endingMeme}`);

  const container = document.getElementById('focus-screen');
  container.innerHTML = `
    <div class="header-area">
      <div>
        <div class="brand-subtitle">Session Over</div>
        <div class="brand-title">Mission Accomplished! 🏆</div>
      </div>
    </div>

    <div class="glass-card" style="text-align: center; padding: 16px;">
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--color-sage-mist)">
        Focused on: "${escapeHtml(mission.name)}"
      </div>
      
      <div class="timer-metrics" style="margin-bottom: 16px;">
        <div class="metric-box">
          <div class="metric-num">${mission.actualDuration || mission.duration}m</div>
          <div class="metric-label">Focus Time</div>
        </div>
        <div class="metric-box">
          <div class="metric-num">${completionPercentage}%</div>
          <div class="metric-label">Recovery Rate</div>
        </div>
        <div class="metric-box">
          <div class="metric-num">${totalDistractions}</div>
          <div class="metric-label">Distractions</div>
        </div>
      </div>

      <div class="details-list" style="margin-bottom: 16px;">
        <div class="detail-row">
          <div class="detail-lbl">Recovered back to work</div>
          <div class="detail-val" style="color: var(--color-sage-mist)">${recovered} times</div>
        </div>
        <div class="detail-row">
          <div class="detail-lbl">Bypassed/Ignored</div>
          <div class="detail-val" style="color: var(--color-terracotta)">${ignored} times</div>
        </div>
      </div>

      <div class="gbs-meme-frame" style="height: 150px; margin-bottom: 0; border-radius: 12px; overflow: hidden; background: #ECE8E3;">
        <img src="${memeUrl}" style="width: 100%; height: 100%; object-fit: contain;">
      </div>
    </div>

    <button id="btn-finish-summary" class="btn btn-primary">
      Start Another Session
    </button>
  `;

  document.getElementById('btn-finish-summary').addEventListener('click', async () => {
    // Clear completed activeMission from storage to return to setup
    await chrome.storage.local.remove('activeMission');
    renderMissionSetup();
  });
}

/* ==========================================================================
   STATISTICS TAB SCREEN
   ========================================================================== */
async function initStatsScreen() {
  const stats = await getFromStorage('stats', null);
  const container = document.getElementById('stats-screen');
  
  if (!stats) return;

  // Calculate statistics metrics
  let totalFocusMinutes = 0;
  let totalSessions = 0;
  let totalDistractions = 0;
  let totalRecovered = 0;

  Object.values(stats.daily || {}).forEach(day => {
    totalFocusMinutes += day.focusTime || 0;
    totalSessions += day.focus; // wait, let's look at key name. In storage we set focusTime and sessions.
    totalSessions += day.sessions || 0;
    totalDistractions += day.distractions || 0;
    totalRecovered += day.recovered || 0;
  });

  const recoveryRate = totalDistractions === 0 ? 100 : Math.round((totalRecovered / totalDistractions) * 100);

  // Find most common distraction domain
  let commonDistraction = 'None';
  let maxDistractionCount = 0;
  Object.entries(stats.commonDistractions || {}).forEach(([domain, count]) => {
    if (count > maxDistractionCount) {
      maxDistractionCount = count;
      commonDistraction = domain;
    }
  });

  container.innerHTML = `
    <div class="header-area">
      <div>
        <div class="brand-subtitle">Goal before Scroll</div>
        <div class="brand-title">Focus Analytics</div>
      </div>
    </div>

    <div class="stats-header-grid">
      <div class="stat-header-card">
        <div class="stat-header-val">${totalFocusMinutes}m</div>
        <div class="stat-header-lbl">Focus Time</div>
      </div>
      <div class="stat-header-card">
        <div class="stat-header-val">${recoveryRate}%</div>
        <div class="stat-header-lbl">Recovery Rate</div>
      </div>
      <div class="stat-header-card">
        <div class="stat-header-val">${stats.currentStreak || 0}d</div>
        <div class="stat-header-lbl">Focus Streak</div>
      </div>
    </div>

    <div class="glass-card">
      <div class="section-title">Weekly Focus Hours</div>
      <div class="chart-container" id="focus-chart-container"></div>
    </div>

    <div class="glass-card">
      <div class="section-title">Performance Metrics</div>
      <div class="details-list">
        <div class="detail-row">
          <div class="detail-lbl">Longest session</div>
          <div class="detail-val">${stats.longestSession || 0} mins</div>
        </div>
        <div class="detail-row">
          <div class="detail-lbl">Total memes seen</div>
          <div class="detail-val">${stats.totalMemesSeen || 0} memes</div>
        </div>
        <div class="detail-row">
          <div class="detail-lbl">Most common distraction</div>
          <div class="detail-val" style="color: var(--color-terracotta)">${escapeHtml(commonDistraction)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-lbl">Total sessions completed</div>
          <div class="detail-val">${totalSessions} sessions</div>
        </div>
        <div class="detail-row">
          <div class="detail-lbl">All-time best streak</div>
          <div class="detail-val" style="color: var(--color-sage-mist)">${stats.bestStreak || 0} days</div>
        </div>
      </div>
    </div>
  `;

  // Draw SVG Focus Chart
  const chartBox = document.getElementById('focus-chart-container');
  renderFocusChart(chartBox, stats.daily || {});
}

/* ==========================================================================
   SETTINGS TAB SCREEN
   ========================================================================== */
async function initSettingsScreen() {
  const settings = await getFromStorage('settings', {});
  
  // Set toggle control states
  document.getElementById('setting-theme').value = settings.theme || 'system';
  document.getElementById('setting-strict').checked = settings.strictMode || false;
  document.getElementById('setting-sound').checked = settings.soundEnabled !== false; // default true
  document.getElementById('setting-notif').checked = settings.notificationEnabled !== false;
  document.getElementById('setting-category').value = settings.memeCategory || 'Random';
  
  document.getElementById('setting-whitelist').value = (settings.customWhitelist || []).join('\n');
  document.getElementById('setting-blacklist').value = (settings.customBlacklist || []).join('\n');
}

function setupSettingsListeners() {
  // Theme dropdown change
  document.getElementById('setting-theme').addEventListener('change', async (e) => {
    const theme = e.target.value;
    await updateSettings({ theme });
    applyTheme(theme);
  });

  // Toggles change listeners
  document.getElementById('setting-strict').addEventListener('change', async (e) => {
    await updateSettings({ strictMode: e.target.checked });
  });

  document.getElementById('setting-sound').addEventListener('change', async (e) => {
    await updateSettings({ soundEnabled: e.target.checked });
  });

  document.getElementById('setting-notif').addEventListener('change', async (e) => {
    await updateSettings({ notificationEnabled: e.target.checked });
  });

  // Meme Category selector
  document.getElementById('setting-category').addEventListener('change', async (e) => {
    await updateSettings({ memeCategory: e.target.value });
  });

  // Custom lists save button
  document.getElementById('btn-save-lists').addEventListener('click', async () => {
    const whitelist = document.getElementById('setting-whitelist').value
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
      
    const blacklist = document.getElementById('setting-blacklist').value
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    await updateSettings({ customWhitelist: whitelist, customBlacklist: blacklist });
    alert('Custom lists saved successfully!');
  });

  // Export settings click
  document.getElementById('btn-export-settings').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['settings', 'stats', 'onboarded']);
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create text file download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gbs_settings_export.json';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import settings trigger
  document.getElementById('btn-import-settings').addEventListener('click', async () => {
    const jsonText = prompt('Paste your exported settings JSON here:');
    if (!jsonText) return;

    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.settings || parsed.stats) {
        await chrome.storage.local.set(parsed);
        alert('Settings imported successfully! Reloading...');
        window.location.reload();
      } else {
        alert('Invalid settings backup format.');
      }
    } catch (e) {
      alert('Failed to parse JSON backup text.');
    }
  });

  // Reset all data button
  document.getElementById('btn-reset-data').addEventListener('click', async () => {
    if (confirm('WARNING: Are you sure you want to reset all data? This deletes your configurations, statistics, and focus history.')) {
      await chrome.storage.local.clear();
      alert('Extension reset successfully!');
      window.location.reload();
    }
  });
}

// Storage Helpers
async function getFromStorage(key, defaultValue) {
  const res = await chrome.storage.local.get(key);
  return res[key] !== undefined ? res[key] : defaultValue;
}

async function updateSettings(newSettings) {
  const current = await getFromStorage('settings', {});
  const merged = { ...current, ...newSettings };
  await chrome.storage.local.set({ settings: merged });
}

// Sanitization helper
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
