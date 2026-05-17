// Event bus — used to notify the UI when auto-failover happens
const instanceChangeListeners = new Set();
function emitChange(oldUrl, newUrl) {
  instanceChangeListeners.forEach((fn) => fn(oldUrl, newUrl));
}
export function onInstanceChange(fn) {
  instanceChangeListeners.add(fn);
  return () => instanceChangeListeners.delete(fn);
}

// Curated list of instances known to have working APIs with CORS enabled.
// Updated periodically. The instance list API is the primary source; this is
// a fallback when the API list is unreachable or contains no CORS instances.
const KNOWN_INSTANCES = [
  'https://inv.thepixora.com',
  'https://invidious.nerdvpn.de',
  'https://yt.chocolatemoo53.com',
];

const DEFAULT_INSTANCE = 'https://inv.thepixora.com';
const INSTANCE_LIST_URL = 'https://api.invidious.io/instances.json?pretty=1&sort_by=type,users';

let currentInstance = DEFAULT_INSTANCE;
let workingInstances = [];
let lastHealthCheck = 0;

try {
  const saved = localStorage.getItem('viewd_instance');
  if (saved) {
    currentInstance = saved;
  }
} catch {}

export function getInstance() {
  return currentInstance;
}

export function setInstance(url) {
  const old = currentInstance;
  currentInstance = url.replace(/\/+$/, '');
  localStorage.setItem('viewd_instance', currentInstance);
  if (old !== currentInstance) {
    emitChange(old, currentInstance);
  }
}

export function getWorkingInstances() {
  return workingInstances;
}

// Core fetch with retry & auto-failover
async function fetchApi(path, params = {}, retries = 2) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, v);
  });
  const qString = qs.toString();
  const url = `${currentInstance}/api/v1${path}${qString ? '?' + qString : ''}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `API error: ${res.status}`);
      }
      return JSON.parse(text);
    } catch (err) {
      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('loadfailed');

      if (isNetworkError && attempt < retries) {
        // Try failover
        const switched = await findWorkingInstance();
        if (switched) {
          // Retry with new instance
          const newQString = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) newQString.set(k, v);
          });
          const nqs = newQString.toString();
          const newUrl = `${currentInstance}/api/v1${path}${nqs ? '?' + nqs : ''}`;
          const res = await fetch(newUrl, { signal: AbortSignal.timeout(15000) });
          const text = await res.text();
          if (!res.ok) throw new Error(text || `API error: ${res.status}`);
          return JSON.parse(text);
        }
        // No fallback found, throw the original error
        throw err;
      }
      // Non-network error or out of retries
      throw err;
    }
  }
}

async function findWorkingInstance() {
  const candidates = new Set();

  // 1. Try the official instance list (filter for CORS+API)
  try {
    const res = await fetch(INSTANCE_LIST_URL, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    data.forEach(([, meta]) => {
      if (meta.cors === true && meta.api === true && meta.type === 'https' && meta.uri) {
        candidates.add(meta.uri.replace(/\/+$/, ''));
      }
    });
  } catch {}

  // 2. Always include curated fallbacks if not already in the list
  KNOWN_INSTANCES.forEach((u) => candidates.add(u));

  // Remove current instance from candidates
  candidates.delete(currentInstance);

  // Sort: known instances first, then from API list
  const sorted = [...candidates].sort((a, b) => {
    const aKnown = KNOWN_INSTANCES.indexOf(a);
    const bKnown = KNOWN_INSTANCES.indexOf(b);
    if (aKnown !== -1 && bKnown !== -1) return aKnown - bKnown;
    if (aKnown !== -1) return -1;
    if (bKnown !== -1) return 1;
    return 0;
  });

  // Try each candidate with health check
  for (const url of sorted) {
    try {
      const hres = await fetch(`${url}/api/v1/trending?region=US`, {
        signal: AbortSignal.timeout(8000),
      });
      if (hres.ok) {
        const body = await hres.text();
        if (body.startsWith('[')) {
          setInstance(url);
          workingInstances = sorted.filter((u) => u !== url);
          return true;
        }
      }
    } catch {
      continue;
    }
  }

  return false;
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
  try {
    const res = await fetch(INSTANCE_LIST_URL, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const fromApi = data
      .filter(([, meta]) => meta.cors === true && meta.api === true && meta.type === 'https' && meta.uri)
      .map(([, meta]) => ({ url: meta.uri.replace(/\/+$/, ''), flag: meta.flag, stats: meta.stats || {} }));

    // Merge with known instances (deduped)
    const seen = new Set();
    const merged = [];
    KNOWN_INSTANCES.forEach((url) => {
      if (!seen.has(url)) {
        seen.add(url);
        merged.push({ url, flag: '', stats: {} });
      }
    });
    fromApi.forEach((inst) => {
      if (!seen.has(inst.url)) {
        seen.add(inst.url);
        merged.push(inst);
      }
    });
    return merged;
  } catch {
    // Fallback to known instances
    return KNOWN_INSTANCES.map((url) => ({ url, flag: '', stats: {} }));
  }
}

export async function checkHealth(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/trending?region=US`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.startsWith('[');
  } catch {
    return false;
  }
}
