// ⚠️  Single localStorage key for ALL settings ('viewd_store').
// Consider migrating to multiple keys or adding a version number to enable
// schema migrations. The read() function below handles JSON corruption
// gracefully by falling back to defaults.
//
// TODO: Add version field to schema for future migration support.
// Usage: read().version → if stale, migrate and write back.

const STORE_KEY = 'viewd_store';
const STORE_VERSION = 1;

const defaultStore = {
  version: STORE_VERSION,
  subscriptions: [],
  playlists: [],
  theme: 'system',
  instance: '',
  preventBgAutoplay: true,
  pauseBgTabs: true,
  loopMode: false,
  hideComments: false,
  playbackSpeed: 1,
  accentColor: '',
  miniPlayer: true,
};

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultStore };
    const parsed = JSON.parse(raw);
    // Ensure default fields exist even if the stored object is incomplete
    return { ...defaultStore, ...parsed };
  } catch {
    // JSON parse error or corrupted data — fall back to defaults
    return { ...defaultStore };
  }
}

function write(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function getSubscriptions() {
  return read().subscriptions;
}

export function subscribe(channel) {
  const data = read();
  if (!data.subscriptions.find((s) => s.ucid === channel.ucid)) {
    data.subscriptions.push({ ucid: channel.ucid, author: channel.author, authorUrl: channel.authorUrl, authorThumbnails: channel.authorThumbnails, subscribed: Date.now() });
    write(data);
  }
}

export function unsubscribe(ucid) {
  const data = read();
  data.subscriptions = data.subscriptions.filter((s) => s.ucid !== ucid);
  write(data);
}

export function isSubscribed(ucid) {
  return read().subscriptions.some((s) => s.ucid === ucid);
}

export function getPlaylists() {
  return read().playlists;
}

export function createPlaylist(name) {
  const data = read();
  const playlist = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    videos: [],
  };
  data.playlists.push(playlist);
  write(data);
  return playlist;
}

export function deletePlaylist(id) {
  const data = read();
  data.playlists = data.playlists.filter((p) => p.id !== id);
  write(data);
}

export function addToPlaylist(playlistId, video) {
  const data = read();
  const pl = data.playlists.find((p) => p.id === playlistId);
  if (pl && !pl.videos.find((v) => v.videoId === video.videoId)) {
    pl.videos.push({ videoId: video.videoId, title: video.title, author: video.author, authorId: video.authorId, lengthSeconds: video.lengthSeconds, videoThumbnails: video.videoThumbnails, addedAt: Date.now() });
    write(data);
  }
}

export function removeFromPlaylist(playlistId, videoId) {
  const data = read();
  const pl = data.playlists.find((p) => p.id === playlistId);
  if (pl) {
    pl.videos = pl.videos.filter((v) => v.videoId !== videoId);
    write(data);
  }
}

export function getTheme() {
  return read().theme;
}

export function setTheme(theme) {
  const data = read();
  data.theme = theme;
  write(data);
  applyTheme(theme);
}

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function getSavedInstance() {
  return read().instance;
}

export function saveInstance(url) {
  const data = read();
  data.instance = url;
  write(data);
}

// Background tab behavior
export function getPreventBgAutoplay() {
  return read().preventBgAutoplay;
}

export function setPreventBgAutoplay(val) {
  const data = read();
  data.preventBgAutoplay = val;
  write(data);
}

export function getPauseBgTabs() {
  return read().pauseBgTabs;
}

export function setPauseBgTabs(val) {
  const data = read();
  data.pauseBgTabs = val;
  write(data);
}

// Loop mode
export function getLoopMode() {
  return read().loopMode;
}
export function setLoopMode(val) {
  const data = read(); data.loopMode = val; write(data);
}

// Hide comments by default
export function getHideComments() {
  return read().hideComments;
}
export function setHideComments(val) {
  const data = read(); data.hideComments = val; write(data);
}

// Default playback speed
export function getPlaybackSpeed() {
  return read().playbackSpeed;
}
export function setPlaybackSpeed(val) {
  const data = read(); data.playbackSpeed = val; write(data);
}

// Accent color
export function getAccentColor() {
  return read().accentColor;
}
export function setAccentColor(val) {
  const data = read(); data.accentColor = val; write(data);
  applyAccentColor(val);
}
export function applyAccentColor(color) {
  if (color) {
    const darker = darkenColor(color, 0.75);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', darker);
  } else {
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-hover');
  }
}
function isValidHex(hex) {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
}

function darkenColor(hex, factor) {
  if (!isValidHex(hex)) return hex || '';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r,g,b].map(c => Math.round(c * factor).toString(16).padStart(2,'0')).join('');
}

// Mini player
export function getMiniPlayer() {
  return read().miniPlayer;
}
export function setMiniPlayer(val) {
  const data = read(); data.miniPlayer = val; write(data);
}

// History — last 50 watched videos
const HISTORY_KEY = 'viewd_history';

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

export function addToHistory(video) {
  let history = getHistory();
  // Remove duplicate if exists
  history = history.filter((v) => v.videoId !== video.videoId);
  // Add to front
  history.unshift({
    videoId: video.videoId,
    title: video.title,
    author: video.author,
    authorId: video.authorId,
    lengthSeconds: video.lengthSeconds,
    videoThumbnails: video.videoThumbnails,
    authorThumbnails: video.authorThumbnails,
    watchedAt: Date.now(),
  });
  // Keep last 50
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
