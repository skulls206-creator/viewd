const STORE_KEY = 'viewd_store';

const defaultStore = {
  subscriptions: [],
  playlists: [],
  theme: 'system',
  instance: '',
  preventBgAutoplay: true,
  pauseBgTabs: true,
};

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...defaultStore, ...JSON.parse(raw) } : { ...defaultStore };
  } catch {
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
