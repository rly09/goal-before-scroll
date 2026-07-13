// overlay.js - Injected content script for distraction block overlays

(async function () {
  // Flag to prevent double injection
  if (window.gbsOverlayInjected) return;
  window.gbsOverlayInjected = true;

  // Immediately request blocking check from background (anti-flash)
  const currentUrl = window.location.href;
  const currentTitle = document.title;

  // Temporarily hide document to prevent flashes
  const styleEl = document.createElement('style');
  styleEl.innerHTML = 'html { visibility: hidden !important; overflow: hidden !important; }';
  document.documentElement.appendChild(styleEl);

  chrome.runtime.sendMessage(
    { type: 'CHECK_URL', url: currentUrl, title: currentTitle },
    (response) => {
      if (chrome.runtime.lastError) {
        // Safe fallback: if background doesn't respond or error, show page
        removeHider();
        return;
      }

      if (response && response.blocked) {
        // Page is blocked! Initialize the overlay
        if (document.body) {
          initOverlay(response);
        } else {
          document.addEventListener('DOMContentLoaded', () => initOverlay(response));
        }
      } else {
        // Page is allowed. Reveal page.
        removeHider();
      }
    }
  );

  // Listen for dynamic overlay triggers (e.g. client-side SPA navigation updates)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_OVERLAY') {
      const existing = document.querySelector('.gbs-overlay-container');
      if (!existing) {
        if (document.body) {
          initOverlay(message);
        } else {
          document.addEventListener('DOMContentLoaded', () => initOverlay(message));
        }
      }
    }
  });

  // Remove the initial page hider style
  function removeHider() {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    document.documentElement.style.visibility = '';
    document.documentElement.style.overflow = '';
  }

  // Synthesize a funny cartoon buzzer / wah-wah sound using Web Audio API
  function playDistractionSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Wah-wah buzzer effect: oscillator pitching down rapidly
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('Web Audio play blocked or unsupported:', e);
    }
  }

  // Initialize and render the overlay
  function initOverlay(data) {
    // Keep page elements hidden, remove the temporary style and apply permanent blocker classes
    removeHider();
    document.body.classList.add('gbs-body-hidden');

    // Play synthesized sound if enabled
    if (data.soundEnabled) {
      playDistractionSound();
    }

    // Create container
    const container = document.createElement('div');
    container.className = 'gbs-overlay-container';
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('role', 'dialog');

    // Create card
    const card = document.createElement('div');
    card.className = 'gbs-card';

    // Header content
    const header = document.createElement('div');
    header.className = 'gbs-header';
    header.innerHTML = `
      <div class="gbs-logo-badge">Goal before Scroll</div>
      <h1 class="gbs-title">Distraction Interrupted!</h1>
      <p class="gbs-subtitle">You are on a mission to focus on <span class="gbs-mission-highlight">${escapeHtml(data.missionName)}</span>.</p>
    `;
    card.appendChild(header);

    // Meme Image Frame
    const memeFrame = document.createElement('div');
    memeFrame.className = 'gbs-meme-frame';
    const memeImg = document.createElement('img');
    memeImg.className = 'gbs-meme-img';
    if (data.meme.imagePath && data.meme.imagePath.startsWith('data:')) {
      memeImg.src = data.meme.imagePath;
    } else {
      memeImg.src = chrome.runtime.getURL(data.meme.imagePath);
    }
    memeImg.alt = "Funny local meme reminding you to stay focused";
    memeImg.style.setProperty('width', '100%', 'important');
    memeImg.style.setProperty('height', '100%', 'important');
    memeImg.style.setProperty('object-fit', 'contain', 'important');
    
    // Graceful fallback if image fails to load
    memeImg.onerror = () => {
      memeImg.src = chrome.runtime.getURL('images/logo.png'); // Fallback to logo or simple placeholder
      memeImg.style.width = '80px';
      memeImg.style.height = '80px';
    };
    
    memeFrame.appendChild(memeImg);
    card.appendChild(memeFrame);

    // Caption Box
    const captionBox = document.createElement('div');
    captionBox.className = 'gbs-caption-box';
    captionBox.innerText = `"${data.meme.caption}"`;
    card.appendChild(captionBox);

    // Actions Group
    const actions = document.createElement('div');
    actions.className = 'gbs-actions';

    // Back to Mission (Primary)
    const btnBack = document.createElement('button');
    btnBack.className = 'gbs-btn gbs-btn-primary';
    btnBack.innerText = 'Back To Mission';
    btnBack.addEventListener('click', handleBackToMission);

    // Ignore Once (Secondary)
    const btnIgnore = document.createElement('button');
    btnIgnore.className = 'gbs-btn gbs-btn-secondary';
    btnIgnore.innerText = 'Ignore Once';

    if (data.strictMode) {
      let secondsLeft = 5; // 5-second lock out in strict mode
      btnIgnore.disabled = true;
      btnIgnore.innerText = `Ignore Once (${secondsLeft}s)`;

      const interval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(interval);
          btnIgnore.disabled = false;
          btnIgnore.innerText = 'Ignore Once';
        } else {
          btnIgnore.innerText = `Ignore Once (${secondsLeft}s)`;
        }
      }, 1000);
    }

    btnIgnore.addEventListener('click', () => handleIgnoreOnce(container));

    actions.appendChild(btnBack);
    actions.appendChild(btnIgnore);
    card.appendChild(actions);

    container.appendChild(card);
    document.documentElement.appendChild(container);

    // Block keyboard navigation, particularly Escape key
    window.addEventListener('keydown', blockEscapeKey, true);
  }

  // Handle Return to Mission
  function handleBackToMission() {
    const domain = window.location.hostname;
    // Tell background to record the recovery
    chrome.runtime.sendMessage({ type: 'RECORD_DISTRACTION_ACTION', domain, action: 'recovered' });
    
    // Request redirect URL
    chrome.runtime.sendMessage({ type: 'GET_BACK_TO_MISSION_REDIRECT' }, (response) => {
      if (response && response.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else {
        window.location.href = 'https://www.google.com';
      }
    });
  }

  // Handle Ignore Once
  function handleIgnoreOnce(container) {
    const domain = window.location.hostname;
    chrome.runtime.sendMessage({ type: 'RECORD_DISTRACTION_ACTION', domain, action: 'ignored' });

    // Remove keyboard block
    window.removeEventListener('keydown', blockEscapeKey, true);

    // Trigger exit animation
    container.classList.add('gbs-overlay-dismiss');

    setTimeout(() => {
      // Restore page display
      document.body.classList.remove('gbs-body-hidden');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 300); // Matches CSS transitions
  }

  // Escape key blocker
  function blockEscapeKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  // Sanitizer
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
