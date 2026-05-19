// Event bus — used to notify the UI when auto-failover happens
const instanceChangeListeners = new Set();
function emitChange(oldUrl, newUrl) {
  instanceChangeListeners.forEach((fn) => fn(oldUrl, newUrl));
}
export function onInstanceChange(fn) {
  instanceChangeListeners.add(fn);
  return () => instanceChangeListeners.delete(fn);
}

// Instance records: { url, label? } — label is shown in Settings instead of the raw URL
const INSTANCE_RECORDS = [
  { url: 'https://viewd.replit.app', label: 'VIEWD Instance' },
  { url: 'https://inv.thepixora.com', label: 'The Pixora' },
];

// URLs only — used for auto-failover iteration
const KNOWN_INSTANCES = INSTANCE_RECORDS.map((r) => r.url);

// For Settings display: only the label, or the URL if no label
export function instanceDisplay(url) {
  const record = INSTANCE_RECORDS.find((r) => r.url === url);
  return record?.label || url;
}

const DEFAULT_INSTANCE = KNOWN_INSTANCES[0];
const INSTANCE_LIST_URL = 'https://api.invidious.io/instances.json';

/** Sanitize a search query: strip injection chars, truncate length */
function sanitizeQuery(q) {
  if (typeof q !== 'string') return '';
  return q.trim().replace(/[<>"'&|;$`\\]/g, '').slice(0, 200);
}

/** Validate a YouTube video ID: exactly 11 chars, alphanumeric + `-_` */
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
function isValidVideoId(id) {
  return typeof id === 'string' && YT_ID_RE.test(id);
}

let currentInstance = DEFAULT_INSTANCE;
let discoverRunning = false;

// Validate saved instance at init
try {
  const saved = localStorage.getItem('viewd_instance');
  if (saved) {
    currentInstance = saved;
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

export function setInstanceManual(url) {
  const old = currentInstance;
  currentInstance = url.replace(/\/+$/, '');
  localStorage.setItem('viewd_instance', currentInstance);
  // Manual changes don't trigger the auto-failover banner
}

/**
 * Validate that a response body is a JSON array of objects with the expected
 * Invidious video shape (at minimum, items should have `title` and `videoId`).
 */
function isValidVideoList(body) {
  try {
    const data = JSON.parse(body);
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // empty array is valid
    // Verify at least the first item has expected video properties
    const first = data[0];
    return (
      typeof first === 'object' &&
      first !== null &&
      (typeof first.title === 'string' || typeof first.videoId === 'string')
    );
  } catch {
    return false;
  }
}

async function checkAndResetIfDead(url) {
  try {
    const res = await fetch(`${url}/api/v1/search?q=test&page=1`, {
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const body = await res.text();
      if (isValidVideoList(body)) return;
    }
  } catch {}
  localStorage.removeItem('viewd_instance');
}

async function fetchApi(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, v);
  });
  const qString = qs.toString();
  const url = `${currentInstance}/api/v1${path}${qString ? '?' + qString : ''}`;

  try {
    // Aggressive 8s timeout on primary — fail fast so fallback kicks in sooner.
    // Total round-trip with fallback: ~8s primary + ~10s fallback discovery.
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
      err.message?.startsWith('HTTP ');

    if (isFailoverTrigger) {
      const switched = await discoverAndFailover();
      if (switched) {
        const nqs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) nqs.set(k, v);
        });
        const ns = nqs.toString();
        const nUrl = `${currentInstance}/api/v1${path}${ns ? '?' + ns : ''}`;
        const res = await fetch(nUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    }
    throw err;
  }
}

async function discoverAndFailover() {
  if (discoverRunning) return false;
  discoverRunning = true;

  try {
    const candidates = [];

    for (const u of KNOWN_INSTANCES) {
      if (u !== currentInstance) candidates.push(u);
    }

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

    for (const url of candidates) {
      try {
        const res = await fetch(`${url}/api/v1/search?q=test&page=1`, {
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        const body = await res.text();
        if (isValidVideoList(body)) {
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
  const sanitized = sanitizeQuery(q);
  if (!sanitized) throw new Error('Invalid search query');
  return fetchApi('/search', { q: sanitized, page, sort_by: sortBy, type, duration, features, region });
}

/** Try a different known instance as fallback, avoiding the current one */
async function fallbackToOtherInstance(path) {
  const candidates = KNOWN_INSTANCES.filter((u) => u !== currentInstance);
  for (const url of candidates) {
    try {
      const fullUrl = `${url.replace(/\/+$/, '')}${path}`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue;
      const body = await res.text();
      // Reject error responses (e.g. {"error":"Invidious returned invalid JSON"})
      if (body.trim().startsWith('{"error"')) continue;
      return JSON.parse(body);
    } catch {
      continue;
    }
  }
  throw new Error('All fallback instances failed');
}

export async function getVideo(id) {
  if (!isValidVideoId(id)) {
    throw new Error(`Invalid video ID: ${id}`);
  }
  const path = `/api/v1/videos/${id}`;
  try {
    return await fetchApi(`/videos/${id}`);
  } catch (err) {
    try {
      return await fallbackToOtherInstance(path);
    } catch {
      throw err;
    }
  }
}

export async function getComments(videoId, continuation = null) {
  const params = {};
  if (continuation) params.continuation = continuation;
  const qs = new URLSearchParams(params).toString();
  const path = `/api/v1/comments/${videoId}${qs ? '?' + qs : ''}`;
  try {
    return await fetchApi(`/comments/${videoId}`, params);
  } catch (err) {
    try {
      return await fallbackToOtherInstance(path);
    } catch {
      throw err;
    }
  }
}

export async function getChannel(channelId, sortBy = 'newest', page = 1) {
  const qs = new URLSearchParams({ sort_by: sortBy, page }).toString();
  const path = `/api/v1/channels/${channelId}?${qs}`;
  try {
    return await fetchApi(`/channels/${channelId}`, { sort_by: sortBy, page });
  } catch (err) {
    try {
      return await fallbackToOtherInstance(path);
    } catch {
      throw err;
    }
  }
}

export async function getChannelVideos(channelId, sortBy = 'newest', page = 1) {
  const qs = new URLSearchParams({ sort_by: sortBy, page }).toString();
  const path = `/api/v1/channels/${channelId}/videos?${qs}`;
  try {
    const data = await fetchApi(`/channels/${channelId}/videos`, { sort_by: sortBy, page });
    if (data && Array.isArray(data.videos)) return data.videos;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    try {
      return await fallbackToOtherInstance(path);
    } catch {
      throw err;
    }
  }
}

export async function getPlaylist(playlistId, page = 1) {
  return fetchApi(`/playlists/${playlistId}`, { page });
}

export async function getPopular() {
  return fetchApi('/popular');
}

export async function fetchInstances() {
  const seen = new Set();
  const merged = [];

  // Include labeled instances in the Settings list
  for (const rec of INSTANCE_RECORDS) {
    if (!seen.has(rec.url)) {
      seen.add(rec.url);
      merged.push({ url: rec.url, label: rec.label, flag: '', stats: {} });
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

export async function checkHealth(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/search?q=test&page=1`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return isValidVideoList(body);
  } catch {
    return false;
  }
}
