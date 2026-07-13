// meme_engine.js - Handles random selection, history cache, preloading, and captions.

let memesData = null;
let captionsData = null;

// Load JSON data files
async function loadData() {
  if (!memesData) {
    const res = await fetch(chrome.runtime.getURL('data/memes.json'));
    memesData = await res.json();
  }
  if (!captionsData) {
    const res = await fetch(chrome.runtime.getURL('data/captions.json'));
    captionsData = await res.json();
  }
}

// Convert image buffer to base64 (service worker compatible)
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Read extension file and return base64 data URL to bypass host CSP (Content Security Policy)
async function getBase64DataUrl(relativeImagePath) {
  try {
    const url = chrome.runtime.getURL(relativeImagePath);
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    let mimeType = 'image/jpeg';
    if (relativeImagePath.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (relativeImagePath.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp';
    }
    
    const base64 = arrayBufferToBase64(buffer);
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert image to base64:", e);
    return null;
  }
}

export const MemeEngine = {
  // Select a meme and caption based on selected category
  async getNextMeme(category = 'Random') {
    await loadData();
    
    // 1. Get memes for this category
    let pool = memesData[category] || memesData['Random'] || [];
    
    if (pool.length === 0) {
      // Fallback if empty category
      pool = memesData['Random'] || [];
    }

    // 2. Fetch history of recently shown memes
    const storage = await chrome.storage.local.get('recentMemes');
    let recent = storage.recentMemes || [];

    // 3. Filter pool to remove recently shown memes
    let available = pool.filter(img => !recent.includes(img));

    // If all memes have been shown recently (or pool is small), reset history for this category
    if (available.length === 0) {
      recent = recent.filter(img => !pool.includes(img));
      available = pool;
    }

    // 4. Select random meme
    const randomIndex = Math.floor(Math.random() * available.length);
    const chosenMeme = available[randomIndex];

    // 5. Update history
    recent.push(chosenMeme);
    if (recent.length > 100) {
      recent.shift(); // Keep history size capped at 100
    }
    await chrome.storage.local.set({ recentMemes: recent });

    // 6. Select a random caption
    const randomCaptionIndex = Math.floor(Math.random() * captionsData.length);
    const caption = captionsData[randomCaptionIndex];

    // 7. Resolve relative image path to base64
    const imagePath = `images/images/${chosenMeme}`;
    const dataUrl = await getBase64DataUrl(imagePath);

    return {
      imagePath: dataUrl || imagePath, // Fallback if conversion fails
      caption
    };
  }
};
