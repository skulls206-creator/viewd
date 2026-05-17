const STORE_KEY = 'viewd_store';

const defaultStore = {
  subscriptions: [],
  playlists: [],
  theme: 'system',
  instance: '',
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
