export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatViews(views) {
  if (!views) return '0';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}m`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
  return String(views);
}

export function formatPublished(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export function getBestThumbnail(thumbnails) {
  if (!thumbnails || !thumbnails.length) return '';
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
}

export function getBestAvatar(avatars) {
  if (!avatars || !avatars.length) return '';
  return avatars[avatars.length - 1]?.url || avatars[0]?.url || '';
}

export function abbreviateNumber(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function timeAgo(dateStr) {
  return formatPublished(dateStr);
}
