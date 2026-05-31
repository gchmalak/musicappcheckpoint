// ============================================================
// VibeTunes — Deezer Music Player
// Uses allorigins.win as a CORS proxy to fetch from Deezer API
// ============================================================

// -------------------------
// DOM Element References
// -------------------------
const coverImage = document.getElementById("cover-image");
const songTitle = document.getElementById("song-title");
const artistName = document.getElementById("artist-name");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progressFill = document.getElementById("progress-fill");
const currentTimeSpan = document.getElementById("current-time");
const totalTimeSpan = document.getElementById("total-time");
const progressContainer = document.getElementById("progress-container");
const searchInput = document.getElementById("search-input");
const topTracksScroll = document.getElementById("top-tracks-scroll");
const appTitle = document.getElementById("app-title");

// -------------------------
// Player State
// -------------------------
let songs = []; // Full list of songs fetched from Deezer
let currentAudio = null; // The active Audio object
let isPlaying = false; // Whether audio is currently playing
let currentFilteredSongs = []; // Songs currently shown (after search)
let activeFilteredIndex = 0; // Index of the current song in currentFilteredSongs
let progressAnimationId = null; // requestAnimationFrame ID for progress bar

// -------------------------
// Fallback Songs
// Used when the Deezer API is unavailable
// -------------------------
const FALLBACK_SONGS = [
  {
    id: 1,
    title: "Midnight City",
    artist: "M83",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
  },
  {
    id: 2,
    title: "Neon Dreams",
    artist: "Aurora Bay",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
  },
  {
    id: 3,
    title: "Echoes",
    artist: "Lumen",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
  },
  {
    id: 4,
    title: "Skyline",
    artist: "Vela",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80",
  },
  {
    id: 5,
    title: "Afterglow",
    artist: "Nova Kid",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
  },
  {
    id: 6,
    title: "Drift",
    artist: "Halcyon",
    preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    cover:
      "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&q=80",
  },
];

// -------------------------
// Utility: Format seconds into M:SS string
// e.g. 125 => "2:05"
// -------------------------
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === undefined || seconds === Infinity)
    return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// -------------------------
// Progress Bar: Smooth real-time update using requestAnimationFrame
// Runs continuously while a song is playing
// -------------------------
function startProgressAnimation() {
  if (progressAnimationId) cancelAnimationFrame(progressAnimationId);

  function update() {
    if (
      currentAudio &&
      isPlaying &&
      currentAudio.duration &&
      !isNaN(currentAudio.duration)
    ) {
      const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
      progressFill.style.width = `${percent}%`;
      currentTimeSpan.textContent = formatTime(currentAudio.currentTime);
      totalTimeSpan.textContent = formatTime(currentAudio.duration);
    }
    progressAnimationId = requestAnimationFrame(update);
  }

  progressAnimationId = requestAnimationFrame(update);
}

// Stop the progress animation loop (called on pause or song end)
function stopProgressAnimation() {
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
}

// Update the progress bar once without looping (called after seeking)
function updateProgressStatic() {
  if (currentAudio && currentAudio.duration && !isNaN(currentAudio.duration)) {
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressFill.style.width = `${percent}%`;
    currentTimeSpan.textContent = formatTime(currentAudio.currentTime);
    totalTimeSpan.textContent = formatTime(currentAudio.duration);
  }
}

// -------------------------
// Load a song by index from currentFilteredSongs
// Sets up the Audio object but doesn't auto-play unless isPlaying is true
// -------------------------
function loadSong(index) {
  if (!currentFilteredSongs.length) return;

  // Clamp index to valid range
  if (index < 0) index = 0;
  if (index >= currentFilteredSongs.length)
    index = currentFilteredSongs.length - 1;

  activeFilteredIndex = index;
  const song = currentFilteredSongs[activeFilteredIndex];

  // Update the player UI with song info
  songTitle.textContent = song.title;
  artistName.textContent = song.artist;
  coverImage.src = song.cover;
  coverImage.alt = `${song.title} album cover`;
  document.title = `${song.title} - VibeTunes`;

  // Destroy the previous Audio instance before creating a new one
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeEventListener("ended", handleSongEnd);
    currentAudio = null;
  }

  // Create a new Audio object for the selected song's preview URL
  if (song.preview) {
    currentAudio = new Audio(song.preview);
    currentAudio.addEventListener("ended", handleSongEnd);
    currentAudio.load();
  }

  // Reset the progress bar visually
  progressFill.style.width = "0%";
  currentTimeSpan.textContent = "0:00";
  totalTimeSpan.textContent = "0:00";

  // Highlight this track in the Top Tracks section
  highlightCurrentTrack();

  // If the player was already playing, continue playing the new song
  if (isPlaying && currentAudio) playSong();
}

// -------------------------
// Play the current song
// Uses the Promise-based play() API to handle autoplay restrictions
// -------------------------
function playSong() {
  if (currentAudio && currentFilteredSongs.length) {
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
          isPlaying = true;
          playBtn.style.display = "none";
          pauseBtn.style.display = "grid";
          startProgressAnimation();
        })
        .catch((error) => {
          // Autoplay was blocked or another error occurred
          console.warn("Playback error:", error);
          isPlaying = false;
          playBtn.style.display = "grid";
          pauseBtn.style.display = "none";
        });
    }
  }
}

// Pause the current song and stop the progress animation
function pauseSong() {
  if (currentAudio) {
    currentAudio.pause();
    isPlaying = false;
    playBtn.style.display = "grid";
    pauseBtn.style.display = "none";
    stopProgressAnimation();
    updateProgressStatic();
  }
}

// Skip to the next song, wrapping around to the start if at the end
function nextSong() {
  if (!currentFilteredSongs.length) return;
  let nextIndex = activeFilteredIndex + 1;
  if (nextIndex >= currentFilteredSongs.length) nextIndex = 0;
  loadSong(nextIndex);
  if (isPlaying) playSong();
}

// Go back to the previous song, wrapping around to the end if at the start
function prevSong() {
  if (!currentFilteredSongs.length) return;
  let prevIndex = activeFilteredIndex - 1;
  if (prevIndex < 0) prevIndex = currentFilteredSongs.length - 1;
  loadSong(prevIndex);
  if (isPlaying) playSong();
}

// Called automatically when the current song finishes playing
function handleSongEnd() {
  nextSong();
}

// -------------------------
// Seek: Jump to a position in the song by clicking the progress bar
// -------------------------
function seekTo(e) {
  if (!currentAudio || !currentAudio.duration || isNaN(currentAudio.duration))
    return;

  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  let percent = Math.min(1, Math.max(0, clickX / rect.width)); // Clamp between 0 and 1

  currentAudio.currentTime = percent * currentAudio.duration;
  updateProgressStatic();
}

// -------------------------
// Render the Top Tracks horizontal scroll section
// Called after songs are fetched or updated
// -------------------------
function renderTopTracks() {
  if (!topTracksScroll) return;
  topTracksScroll.innerHTML = ""; // Clear previous cards

  // Show a loading message if no songs are available yet
  if (!songs.length) {
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading-text";
    loadingDiv.textContent = "Loading tracks...";
    topTracksScroll.appendChild(loadingDiv);
    return;
  }

  // Create a card for each song
  songs.forEach((song) => {
    const trackCard = document.createElement("article");
    trackCard.className = "track-card";

    const trackImg = document.createElement("img");
    trackImg.className = "track-cover";
    trackImg.src = song.cover;
    trackImg.alt = `${song.title} cover`;
    trackImg.loading = "lazy"; // Lazy load images for performance

    const trackNameDiv = document.createElement("div");
    trackNameDiv.className = "track-name";
    trackNameDiv.textContent = song.title;

    const trackArtistDiv = document.createElement("div");
    trackArtistDiv.className = "track-artist";
    trackArtistDiv.textContent = song.artist;

    trackCard.appendChild(trackImg);
    trackCard.appendChild(trackNameDiv);
    trackCard.appendChild(trackArtistDiv);

    // Clicking a track card loads and plays that song
    trackCard.addEventListener("click", () => {
      const filteredIndex = currentFilteredSongs.findIndex(
        (s) => s.id === song.id,
      );
      if (filteredIndex !== -1) {
        loadSong(filteredIndex);
      } else {
        // Song not in current filter, reset to full list
        currentFilteredSongs = [...songs];
        activeFilteredIndex = songs.findIndex((s) => s.id === song.id);
        loadSong(activeFilteredIndex);
      }
      playSong();
    });

    topTracksScroll.appendChild(trackCard);
  });

  highlightCurrentTrack();
}

// -------------------------
// Highlight the currently playing track card in the Top Tracks section
// -------------------------
function highlightCurrentTrack() {
  if (!currentFilteredSongs.length) return;
  const currentSong = currentFilteredSongs[activeFilteredIndex];
  if (!currentSong) return;

  document.querySelectorAll(".track-card").forEach((card) => {
    card.classList.remove("playing");
    const name = card.querySelector(".track-name");
    const artist = card.querySelector(".track-artist");
    // Match by title and artist text content
    if (
      name &&
      artist &&
      name.textContent === currentSong.title &&
      artist.textContent === currentSong.artist
    ) {
      card.classList.add("playing");
    }
  });
}

// -------------------------
// Fetch songs from the Deezer API via the allorigins CORS proxy
//
// Why allorigins.win?
// Deezer's API blocks direct browser requests (no CORS headers).
// allorigins.win acts as a middleman: it fetches the Deezer response
// server-side and returns it to us wrapped in a JSON object under .contents
// -------------------------
async function fetchSongsFromDeezer(query = "lofi") {
  // List of proxies to try in order — if one fails, the next is attempted
  const proxies = [
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  // Helper: try fetching through a single proxy and parse the Deezer response
  async function tryProxy(proxyFn, apiUrl) {
    const response = await fetch(proxyFn(apiUrl));
    if (!response.ok) throw new Error("HTTP error: " + response.status);

    const raw = await response.json();

    // allorigins wraps the response in { contents: "..." }
    // corsproxy.io and thingproxy return the data directly
    const data = raw.contents ? JSON.parse(raw.contents) : raw;

    if (!data.data || !data.data.length)
      throw new Error("No tracks in response");
    return data;
  }

  try {
    appTitle.textContent = `VibeTunes 🎵 ${query}`;

    if (topTracksScroll) {
      topTracksScroll.innerHTML = "";
      const loadingDiv = document.createElement("div");
      loadingDiv.className = "loading-text";
      loadingDiv.textContent = "⏳ Loading tracks from Deezer...";
      topTracksScroll.appendChild(loadingDiv);
    }

    const apiUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`;

    let data = null;

    // Try each proxy until one works
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`Trying proxy ${i + 1}...`);
        data = await tryProxy(proxies[i], apiUrl);
        console.log(`Proxy ${i + 1} succeeded`);
        break; // Stop trying once one works
      } catch (err) {
        console.warn(`Proxy ${i + 1} failed:`, err.message);
      }
    }

    // If all proxies failed, throw to trigger the fallback
    if (!data) throw new Error("All proxies failed");

    songs = data.data.map((track, idx) => ({
      id: track.id || idx,
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      preview: track.preview,
      cover: track.album.cover_medium || track.album.cover,
      duration: track.duration,
    }));

    currentFilteredSongs = [...songs];
    activeFilteredIndex = 0;

    // Remove any previous warning if the API now works
    const existingWarning = document.getElementById("api-warning");
    if (existingWarning) existingWarning.remove();

    renderTopTracks();
    loadSong(0);
  } catch (error) {
    console.warn("All proxies failed, using fallback songs:", error);

    songs = FALLBACK_SONGS;
    currentFilteredSongs = [...songs];
    activeFilteredIndex = 0;
    renderTopTracks();
    loadSong(0);

    const searchBar = document.getElementById("search-bar");
    if (searchBar && !document.getElementById("api-warning")) {
      const searchHint = document.createElement("div");
      searchHint.id = "api-warning";
      searchHint.style.cssText =
        "text-align:center; font-size:12px; color:#ffaa44; margin-top:8px;";
      searchHint.textContent = "⚠️ Using demo tracks (Deezer API unavailable)";
      searchBar.appendChild(searchHint);
    }
  }
}

// -------------------------
// Search: Fetch fresh results from Deezer for the typed query
// Pressing Enter triggers a new API call, not just local filtering
// -------------------------
function searchDeezer() {
  const query = searchInput.value.trim();
  fetchSongsFromDeezer(query || "lofi"); // Fall back to "lofi" if search is empty
}

// -------------------------
// Keyboard Controls
// Space = play/pause | ArrowLeft = previous | ArrowRight = next
// -------------------------
function setupKeyboardControls() {
  window.addEventListener("keydown", (e) => {
    // Prevent default scroll/page behavior for these keys
    if (["Space", "ArrowLeft", "ArrowRight"].includes(e.code))
      e.preventDefault();

    if (e.code === "Space") isPlaying ? pauseSong() : playSong();
    else if (e.code === "ArrowLeft") prevSong();
    else if (e.code === "ArrowRight") nextSong();
  });
}

// -------------------------
// Event Listeners: Wire up all interactive controls
// -------------------------
function initEventListeners() {
  playBtn.addEventListener("click", () => {
    // If no audio is loaded yet, load the current song first
    if (currentFilteredSongs.length && !currentAudio)
      loadSong(activeFilteredIndex);
    if (currentFilteredSongs.length) playSong();
  });

  pauseBtn.addEventListener("click", pauseSong);
  nextBtn.addEventListener("click", nextSong);
  prevBtn.addEventListener("click", prevSong);

  // Click on the progress bar to seek
  progressContainer.addEventListener("click", seekTo);

  if (searchInput) {
    // Pressing Enter in the search box triggers a Deezer API search
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchDeezer();
    });
  }
}

// -------------------------
// Init: Entry point — sets up listeners and loads initial tracks
// -------------------------
function init() {
  initEventListeners();
  setupKeyboardControls();
  fetchSongsFromDeezer("lofi"); // Load lofi tracks on startup
}

// Wait for the DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", init);
