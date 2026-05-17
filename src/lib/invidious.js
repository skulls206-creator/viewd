// Event bus — used to notify the UI when auto-failover happens
const instanceChangeListeners = new Set();
function emitChange(oldUrl, newUrl) {
  instanceChangeListeners.forEach((fn) => fn(oldUrl, newUrl));
}
export function onInstanceChange(fn) {
  instanceChangeListeners.add(fn);
  return () => instanceChangeListeners.delete(fn);
}

// Curated list of instances with working APIs and CORS support.
// When the official instance list returns no usable entries, these are tried.
const KNOWN_INSTANCES = [
  'https://inv.thepixora.com',
];

const DEFAULT_INSTANCE = KNOWN_INSTANCES[0];
const INSTANCE_LIST_URL = 'https://api.invidious.io/instances.json';

let currentInstance = DEFAULT_INSTANCE;
let discoverRunning = false;
let discoveredFallbacks = [];

// Validate saved instance at init — if it's known-broken, reset to default
// so the first page load can trigger auto-failover to a working one
try {
  const saved = localStorage.getItem('viewd_instance');
  if (saved) {
    currentInstance = saved;
    // Trigger async health check — if failed, reset so failover kicks in
    setTimeout(() => {
      checkAndResetIfDead(currentInstance);
    }, 0);
  }
} catch {}

export function getInstance() {
  return currentInstance;
}

export function setInstance(url) {
  const old = currentInstance;
  currentInstance = url.replace(/\/+$/, '');
  localStorage.setItem('viewd_instance', currentInstance);
  if (old !== currentInstance) emitChange(old, currentInstance);
}

async function checkAndResetIfDead(url) {
  try {
    const res = await fetch(`${url}/api/v1/trending?region=US`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const body = await res.text();
      if (body.trim().startsWith('[')) return; // healthy
    }
  } catch {}
  // Dead — reset to default so next API call triggers failover
  localStorage.removeItem('viewd_instance');
}

// Core fetch. On network/timeout errors triggers automatic failover.
async function fetchApi(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, v);
  });
  const qString = qs.toString();
  const url = `${currentInstance}/api/v1${path}${qString ? '?' + qString : ''}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    const isFailoverTrigger =
      err.name === 'AbortError' ||
      err.name === 'TypeError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Network request failed') ||
      err.message?.includes('loadfailed') ||
      err.message?.includes('The operation was aborted') ||
      err.message?.startsWith('HTTP '); // any non-200 triggers failover

    if (isFailoverTrigger) {
      const switched = await discoverAndFailover();
      if (switched) {
        // Retry once on the new instance
        const nqs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) nqs.set(k, v);
        });
        const ns = nqs.toString();
        const nUrl = `${currentInstance}/api/v1${path}${ns ? '?' + ns : ''}`;
        const res = await fetch(nUrl, { signal: AbortSignal.timeout(25000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    }

    // Re-throw non-network errors and network errors where failover failed
    throw err;
  }
}

async function discoverAndFailover() {
  if (discoverRunning) return false;
  discoverRunning = true;

  try {
    const candidates = [];

    // 1. Known instances (excluding current)
    for (const u of KNOWN_INSTANCES) {
      if (u !== currentInstance) candidates.push(u);
    }

    // 2. Official instance list
    try {
      const res = await fetch(INSTANCE_LIST_URL, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      for (const [, meta] of data) {
        if (meta.cors === true && meta.api === true && meta.type === 'https' && meta.uri) {
          const url = meta.uri.replace(/\/+$/, '');
          if (url !== currentInstance && !candidates.includes(url)) {
            candidates.push(url);
          }
        }
      }
    } catch {}

    // Try each candidate — use the actual trending endpoint as health check
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}/api/v1/trending?region=US`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const body = await res.text();
        if (body.trim().startsWith('[')) {
          setInstance(url);
          return true;
        }
      } catch {}
    }

    return false;
  } finally {
    discoverRunning = false;
  }
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

// Fetch the official CORS-enabled instance list (for the Settings page)
export async function fetchInstances() {
  const seen = new Set();
  const merged = [];

  // Known instances first
  for (const url of KNOWN_INSTANCES) {
    if (!seen.has(url)) {
      seen.add(url);
      merged.push({ url, flag: '', stats: {} });
    }
  }

  try {
    const res = await fetch(INSTANCE_LIST_URL, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    for (const [, meta] of data) {
      if (meta.cors === true && meta.api === true && meta.type === 'https' && meta.uri) {
        const url = meta.uri.replace(/\/+$/, '');
        if (!seen.has(url)) {
          seen.add(url);
          merged.push({ url, flag: meta.flag || '', stats: meta.stats || {} });
        }
      }
    }
  } catch {}

  return merged;
}

// Standalone health check for the Settings 'Test connection' button
export async function checkHealth(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/trending?region=US`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.trim().startsWith('[');
  } catch {
    return false;
  }
}
