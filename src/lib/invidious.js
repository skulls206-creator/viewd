const DEFAULT_INSTANCE = 'https://inv.nadeko.net';
const INSTANCE_LIST_URL = 'https://api.invidious.io/instances.json?pretty=1&sort_by=type,users';

let currentInstance = localStorage.getItem('viewd_instance') || DEFAULT_INSTANCE;

export function getInstance() {
  return currentInstance;
}

export function setInstance(url) {
  currentInstance = url.replace(/\/+$/, '');
  localStorage.setItem('viewd_instance', currentInstance);
}

async function fetchApi(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, v);
  });
  const url = `${currentInstance}/api/v1${path}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Invidious API error: ${res.status}`);
  return res.json();
}

export async function getTrending(region = 'US') {
  return fetchApi('/trending', { region });
}

export async function searchVideos(q, page = 1, sortBy = 'relevance', type = 'video', duration = '', features = '', region = 'US') {
  return fetchApi('/search', { q, page, sort_by: sortBy, type, duration, features, region });
}

export async function getVideo(id) {
  return fetchApi(`/videos/${id}`);
}

export async function getChannel(channelId, sortBy = 'newest', page = 1) {
  return fetchApi(`/channels/${channelId}`, { sort_by: sortBy, page });
}

export async function getChannelVideos(channelId, sortBy = 'newest', page = 1) {
  return fetchApi(`/channels/${channelId}/videos`, { sort_by: sortBy, page });
}

export async function getPlaylist(playlistId, page = 1) {
  return fetchApi(`/playlists/${playlistId}`, { page });
}

export async function getComments(videoId, continuation = null) {
  const params = {};
  if (continuation) params.continuation = continuation;
  return fetchApi(`/comments/${videoId}`, params);
}

export async function getPopular() {
  return fetchApi('/popular');
}

export async function fetchInstances() {
  const res = await fetch(INSTANCE_LIST_URL);
  const data = await res.json();
  return data
    .filter(([, meta]) => meta.cors === true && meta.type === 'https' && meta.uri)
    .map(([, meta]) => ({ url: meta.uri.replace(/\/+$/, ''), flag: meta.flag, stats: meta.stats || {} }));
}

export async function checkHealth(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/trending?region=US`, { signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}
