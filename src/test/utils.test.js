import { describe, it, expect } from 'vitest';
import {
  formatDuration, formatViews, formatPublished,
  getBestThumbnail, getBestAvatar, abbreviateNumber, timeAgo,
} from '../lib/utils.js';

describe('formatDuration', () => {
  it('formats seconds only', () => expect(formatDuration(65)).toBe('1:05'));
  it('formats hours', () => expect(formatDuration(3661)).toBe('1:01:01'));
  it('returns 0:00 for falsy', () => expect(formatDuration(0)).toBe('0:00'));
  it('pads minutes', () => expect(formatDuration(5)).toBe('0:05'));
});

describe('formatViews', () => {
  it('returns 0 for falsy', () => expect(formatViews(0)).toBe('0'));
  it('formats thousands', () => expect(formatViews(1500)).toBe('1.5k'));
  it('formats millions', () => expect(formatViews(2500000)).toBe('2.5m'));
  it('returns plain number for small', () => expect(formatViews(999)).toBe('999'));
});

describe('formatPublished', () => {
  it('returns empty for falsy', () => expect(formatPublished('')).toBe(''));
  it('handles recent minutes', () => {
    const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatPublished(iso)).toMatch(/minute/);
  });
  it('handles hours', () => {
    const iso = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatPublished(iso)).toBe('3 hours ago');
  });
  it('handles days', () => {
    const iso = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    expect(formatPublished(iso)).toBe('5 days ago');
  });
});

describe('getBestThumbnail', () => {
  it('returns highest quality', () => {
    const thumbs = [
      { url: 'https://example.com/small.jpg', width: 120 },
      { url: 'https://example.com/large.jpg', width: 720 },
    ];
    expect(getBestThumbnail(thumbs)).toBe('https://example.com/large.jpg');
  });

  it('returns empty for empty array', () => expect(getBestThumbnail([])).toBe(''));
  it('returns empty for null', () => expect(getBestThumbnail(null)).toBe(''));
});

describe('getBestAvatar', () => {
  it('returns highest quality', () => {
    const avatars = [
      { url: 'https://example.com/small.jpg', height: 48 },
      { url: 'https://example.com/large.jpg', height: 120 },
    ];
    expect(getBestAvatar(avatars)).toBe('https://example.com/large.jpg');
  });
  it('returns empty for empty', () => expect(getBestAvatar([])).toBe(''));
});

describe('abbreviateNumber', () => {
  it('returns 0 for falsy', () => expect(abbreviateNumber(0)).toBe('0'));
  it('abbreviates thousands', () => expect(abbreviateNumber(1234)).toBe('1.2K'));
  it('abbreviates millions', () => expect(abbreviateNumber(1234567)).toBe('1.2M'));
  it('returns plain number for small', () => expect(abbreviateNumber(999)).toBe('999'));
});

describe('timeAgo', () => {
  it('is same as formatPublished', () => {
    const iso = new Date(Date.now() - 3600000).toISOString();
    expect(timeAgo(iso)).toBe(formatPublished(iso));
  });
});
