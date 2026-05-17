const DEFAULT_INSTANCE = 'https://inv.thepixora.com';
const INSTANCE_LIST_URL = 'https://api.invidious.io/instances.json?pretty=1&sort_by=type,users';

// Cache for known-good instances and last health check
let currentInstance = DEFAULT_INSTANCE;
let fallbackInstances = [];
let lastHealthCheck = 0;

// Load saved instance, but validate it's not a known-dead one
try {
  const saved = localStorage.getItem('viewd_instance');
  if (saved) {
    currentInstance = saved;
  }
} catch {}

export function getInstance() {
  return currentInstance;
}

let previousInstance = currentInstance;

export function setInstance(url) {
  previousInstance = currentInstance;
  currentInstance = url.replace(/\/+$/, '');
  localStorage.setItem('viewd_instance', currentInstance);
  if (previousInstance !== currentInstance) {
    // notify listeners — use dynamic import to avoid circular deps
    import('./events.js').then((m) => {
      try { m.emitInstanceChange(previousInstance, currentInstance); } catch {}
    }).catch(() => {});
  }
}

export function getPreviousInstance() {
  return previousInstance;
}

async function fetchApi(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, v);
  });
  const qString = qs.toString();
  const url = `${currentInstance}/api/v1${path}${qString ? '?' + qString : ''}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `API error: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    // If this is a connectivity/fetch error (not a user-cancelled one), try auto-failover
    if (err.name === 'AbortError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      const switched = await tryFailover();
      if (switched) {
        // Retry with the new instance
        const url = `${currentInstance}/api/v1${path}${qString ? '?' + qString : ''}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `API error: ${res.status}`);
        }
        return res.json();
      }
    }
    throw err;
  }
}

async function tryFailover() {
  // Refresh the instance list if we haven't recently
  const age = Date.now() - lastHealthCheck;
  if (age > 30000 || fallbackInstances.length === 0) {
    try {
      const instances = await fetchInstancesFromList();
      fallbackInstances = instances.filter((i) => i.url !== currentInstance);
    } catch {
      // use hardcoded fallbacks
      fallbackInstances = [
        { url: 'https://inv.thepixora.com' },
      ].filter((i) => i.url !== currentInstance);
    }
    lastHealthCheck = Date.now();
  }

  // Mark current as bad
  const currentWas = currentInstance;
  localStorage.removeItem('viewd_instance');

  // Try each fallback until one works
  for (const inst of fallbackInstances) {
    try {
      const res = await fetch(`${inst.url}/api/v1/trending?region=US`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        setInstance(inst.url);
        return true;
      }
    } catch {
      continue;
    }
  }

  // Nothing worked, restore original
  if (currentWas !== currentInstance) {
    setInstance(currentWas);
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

async function fetchInstancesFromList() {
  const res = await fetch(INSTANCE_LIST_URL);
  const data = await res.json();
  return data
    .filter(([, meta]) => meta.cors === true && meta.api === true && meta.type === 'https' && meta.uri)
    .map(([, meta]) => ({ url: meta.uri.replace(/\/+$/, ''), flag: meta.flag, stats: meta.stats || {} }));
}

export async function fetchInstances() {
  const instances = await fetchInstancesFromList();
  return instances;
}

export async function checkHealth(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/trending?region=US`, { signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}
