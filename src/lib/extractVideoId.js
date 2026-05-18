/**
 * Extract a YouTube video ID from various input formats.
 * Returns the video ID or null if no match.
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  // Direct 11-char video ID (YouTube IDs are always 11 chars: A-Za-z0-9_-)
  const bareMatch = s.match(/^([A-Za-z0-9_-]{11})$/);
  if (bareMatch) return bareMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  let m = s.match(/youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // youtu.be/VIDEO_ID
  m = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // youtube.com/shorts/VIDEO_ID
  m = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // youtube.com/embed/VIDEO_ID
  m = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // Invidious instance URLs: /api/v1/videos/VIDEO_ID or /api/v1/videos?vid=VIDEO_ID
  m = s.match(/\/api\/v1\/videos\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // VIEWD hash route: /#/watch?v=VIDEO_ID
  m = s.match(/\/watch\?v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  // Generic: look for v=VIDEO_ID in query params
  m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];

  return null;
}
