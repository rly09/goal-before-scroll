// detector.js - Handles matching URLs and titles against presets, whitelists, and blacklists.

let presetsData = null;

async function loadPresets() {
  if (!presetsData) {
    const res = await fetch(chrome.runtime.getURL('data/presets.json'));
    presetsData = await res.json();
  }
}

export const Detector = {
  // Returns { blocked: boolean, reason: string }
  async checkUrl(urlStr, title, settings, activeMission) {
    if (!activeMission || activeMission.status !== 'active') {
      return { blocked: false };
    }

    await loadPresets();

    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return { blocked: false }; // Invalid URL
    }

    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // 1. Check Custom Whitelist (highest priority)
    for (const domain of settings.customWhitelist || []) {
      const d = domain.trim().toLowerCase();
      if (d && (hostname === d || hostname.endsWith('.' + d))) {
        return { blocked: false, reason: 'custom_whitelist' };
      }
    }

    // 2. Check Custom Blacklist
    for (const domain of settings.customBlacklist || []) {
      const d = domain.trim().toLowerCase();
      if (d && (hostname === d || hostname.endsWith('.' + d))) {
        return { blocked: true, reason: 'custom_blacklist' };
      }
    }

    // 3. Find active preset
    const preset = presetsData.find(p => p.id === activeMission.presetId);
    if (!preset) {
      // If it's a custom mission and not a pre-defined preset
      return { blocked: false };
    }

    // 4. Match domain against preset whitelist
    let inWhitelist = false;
    for (const domain of preset.whitelist || []) {
      const d = domain.toLowerCase();
      if (hostname === d || hostname.endsWith('.' + d)) {
        inWhitelist = true;
        break;
      }
    }

    // 5. Match domain against preset blacklist
    let inBlacklist = false;
    for (const domain of preset.blacklist || []) {
      const d = domain.toLowerCase();
      if (hostname === d || hostname.endsWith('.' + d)) {
        inBlacklist = true;
        break;
      }
    }

    // 6. Smart YouTube Detection
    const isYouTube = hostname === 'youtube.com' || hostname.endsWith('.youtube.com');
    if (isYouTube) {
      // For custom preset, block watch and shorts pages by default
      if (activeMission.presetId === 'custom') {
        const isWatchPage = pathname === '/watch' || url.searchParams.has('v');
        const isShortsPage = pathname.startsWith('/shorts/');
        if (isWatchPage || isShortsPage) {
          return { blocked: true, reason: 'youtube_custom_block' };
        }
        return { blocked: false };
      }

      // If YouTube is explicitly in the preset's blacklist, block it entirely
      if (inBlacklist) {
        return { blocked: true, reason: 'youtube_blacklisted' };
      }

      // If we are on YouTube search results, home feed, or channel pages, we allow navigation
      const isWatchPage = pathname === '/watch' || url.searchParams.has('v');
      const isShortsPage = pathname.startsWith('/shorts/');
      
      if (!isWatchPage && !isShortsPage) {
        return { blocked: false }; // Allow searching and home navigation
      }

      // If it's a watch/shorts page, check the title if we have it
      if (title) {
        const lowerTitle = title.toLowerCase();

        // Check blacklist terms first
        for (const word of preset.youtube_blacklist || []) {
          if (word === '*') {
            return { blocked: true, reason: 'youtube_all_blocked' };
          }
          if (lowerTitle.includes(word.toLowerCase())) {
            return { blocked: true, reason: `youtube_blacklist_match: ${word}` };
          }
        }

        // Check whitelist terms
        let matchedWhitelist = false;
        for (const word of preset.youtube_whitelist || []) {
          if (lowerTitle.includes(word.toLowerCase())) {
            matchedWhitelist = true;
            break;
          }
        }

        // If it doesn't match any whitelist terms and the whitelist isn't empty, it is blocked
        if (!matchedWhitelist && (preset.youtube_whitelist && preset.youtube_whitelist.length > 0)) {
          return { blocked: true, reason: 'youtube_no_whitelist_match' };
        }
      }
      return { blocked: false };
    }

    // 7. General domain evaluation
    if (inWhitelist) {
      return { blocked: false, reason: 'preset_whitelist' };
    }

    if (inBlacklist) {
      return { blocked: true, reason: 'preset_blacklist' };
    }

    // If it's a Custom Mission preset, we block blacklisted domains and allow everything else.
    // Otherwise, for predefined presets, if it's not whitelisted, we default to block if it's on a known distraction domain.
    // Let's check if the domain is a known distraction domain.
    const standardDistractions = [
      'facebook.com', 'instagram.com', 'reddit.com', 'twitter.com', 'x.com', 
      'netflix.com', 'hotstar.com', 'primevideo.com', 'twitch.tv', 'tiktok.com',
      'pinterest.com', 'tumblr.com', 'disneyplus.com', 'hbo.com', 'youtube.com'
    ];

    const isDistractionDomain = standardDistractions.some(d => hostname === d || hostname.endsWith('.' + d));
    if (isDistractionDomain) {
      return { blocked: true, reason: 'default_distraction_block' };
    }

    return { blocked: false };
  }
};
