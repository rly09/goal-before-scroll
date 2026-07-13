# Goal before Scroll (GBS) 🌅

Goal before Scroll is an offline-first Chrome extension that helps you protect your focus, beat doom-scrolling, and stay committed to your personal goals using funny local memes. 

Unlike traditional website blockers that are rigid and stressful, GBS uses humor and soft friction to gently redirect your attention back to what matters.

## ✨ Features

- **Onboarding Experience**: A gentle walkthrough welcoming you to a calmer, distraction-free browsing flow.
- **Goal-Driven Sessions**: Configure a focus session, set your goal, and let the extension protect your time.
- **Local Meme Friction**: Replaces distracting sites with random offline memes matching your focus categories.
- **Strict Mode**: Locks the bypass/ignore button for 5 seconds to force you to reflect on your current goal.
- **Synthesized Sound Alerts**: Audio cues to pull your attention back when you stray.
- **Analytics & Insights**: Beautiful, interactive charts showing your distraction trends and saved time over time.
- **Custom Whitelists/Blacklists**: Tailor exactly which domains are allowed or blocked.
- **Offline & Private**: Runs 100% locally. No APIs, no tracking, no external network requests.
- **Clean Aesthetic**: Built with the **Soft Horizon** design system—rounded UI, calm pastel gradients, and dark mode support.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom variables, glassmorphism shadows, and smooth transitions)
- **Programming Language**: Vanilla JavaScript (ES6+, ES Modules)
- **Extension API**: Chrome Extensions Manifest V3
- **Data Visualization**: Chart.js
- **Utility Scripts**: Python (for asset processing)

## 📁 Directory Structure

```text
├── background/
│   ├── background.js       # Core service worker managing block lists & alarms
│   ├── detector.js         # URL/Tab interception logic
│   ├── meme_engine.js      # Local database loader & categorizer
│   └── storage.js          # Synchronized local state management
├── content/
│   ├── overlay.js          # Content script injecting the meme overlay
│   └── overlay.css         # Styling for the focus intervention screen
├── data/
│   ├── presets.json        # Built-in category configurations
│   ├── captions.json       # Caption data for the local memes
│   └── memes.json          # Processed list of local memes
├── images/
│   ├── logo.png            # Extension icon assets
│   └── images/             # Local memes (ignored in Git)
├── popup/
│   ├── popup.html          # Interactive extension popup
│   ├── popup.css           # Styling using the Soft Horizon Design System
│   ├── popup.js            # Tab navigation and onboarding controller
│   └── chart.js            # Performance chart visualization
├── scripts/
│   ├── generate_logo.py    # Python helper to generate logos
│   └── generate_memes_json.py # Python helper to index local memes
├── manifest.json           # Extension configuration metadata
└── .gitignore              # Files excluded from git
```

## 🚀 Installation & Development

To run this Chrome extension locally:

1. Clone or download this repository.
2. Open Google Chrome.
3. Navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** in the top left corner.
6. Select the folder `Goal before Scroll`.
7. Pin the extension to your toolbar and start focusing!

## ⚙️ Development Utilities

If you place new memes in the `images/images/` folder, you can run the provided Python script to re-generate the JSON registry file:

```bash
python scripts/generate_memes_json.py
```

## 📄 License

This project is open-source and free to use. Refer to local licensing policies for customization and redistribution.
