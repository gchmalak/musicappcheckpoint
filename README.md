# VibeTunes 🎵

A sleek, dark-themed music player web app that streams 30-second song previews using the Deezer API. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

---

## Preview

![VibeTunes Screenshot](screenshot.png)

---

## Features

- 🎵 **Live music search** — search any song, artist, or album and get real results from Deezer
- ▶️ **Audio playback** — plays 30-second previews directly in the browser
- ⏮⏭ **Full player controls** — play, pause, next, previous, and seek
- ⌨️ **Keyboard shortcuts** — Space to play/pause, Arrow keys to skip tracks
- 🎨 **Animated progress bar** — real-time fill with clickable seek
- 🖼️ **Top Tracks row** — horizontally scrollable cards with cover art
- 🔄 **Fallback songs** — demo tracks load automatically if the API is unavailable
- 📱 **Responsive design** — works on mobile and desktop

---

## Project Structure
vibetunes/
├── index.html          # App markup and structure
├── style/
│   └── style.css       # All styles and CSS variables
└── js/
└── script.js       # Player logic, API calls, DOM interactions
Results replace the current track list and the first song loads automatically.

### Playback
Each Deezer track includes a `preview` field — a direct URL to a 30-second MP3. The app creates a native browser `Audio` object for each track and manages play/pause/seek using the Web Audio API.

---

## Getting Started

No build tools or installs needed. Just open the project in a browser.

### Option 1 — Open directly
Double-click `index.html` to open it in your browser.

> ⚠️ Some CORS proxies block requests from `file://` URLs. If you see the fallback warning, use Option 2 below.

### Option 2 — Local server (recommended)

Using VS Code with the **Live Server** extension:
1. Right-click `index.html`
2. Click **Open with Live Server**

Using Node.js:
```bash
npx serve .
```

Using Python:
```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` Arrow Left | Previous track |
| `→` Arrow Right | Next track |

---

## Customization

### Change the default search query
In `script.js`, find the `init` function at the bottom and change `"lofi"` to any genre or artist:
```js
fetchSongsFromDeezer("jazz");
```

### Change the color scheme
All colors are defined as CSS variables at the top of `style.css`:
```css
:root {
  --accent: #4f8cff;    /* Blue — progress bar, focus ring, glow */
  --accent-2: #ff5cdc;  /* Pink — gradient partner */
  --bg-1: #0b0a1a;      /* Darkest background */
  --bg-2: #1a1033;      /* Slightly lighter background */
}
```

### Add more fallback songs
In `script.js`, add entries to the `FALLBACK_SONGS` array:
```js
{
  id: 7,
  title: "Your Song Title",
  artist: "Artist Name",
  preview: "https://link-to-audio.mp3",
  cover: "https://link-to-cover-image.jpg"
}
```

---

## Known Limitations

- **30-second previews only** — Deezer's free API doesn't provide full tracks
- **CORS proxies are third-party** — they can go down or rate-limit requests at any time; a backend proxy is the proper long-term solution
- **No persistent state** — refreshing the page resets the player

---

## Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Structure and semantics |
| CSS3 | Styling, animations, responsive layout |
| JavaScript (ES6+) | Player logic, API calls, DOM manipulation |
| Deezer API | Song search and 30-second preview URLs |
| Web Audio API | Native browser `Audio` object for playback |
| allorigins / corsproxy / thingproxy | CORS proxy chain for API access |

---

## License

This project is for personal and educational use. Music previews are sourced from the [Deezer API](https://developers.deezer.com/) and remain the property of their respective rights holders.
