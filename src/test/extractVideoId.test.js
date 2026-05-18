import { describe, it, expect } from 'vitest';
import { extractVideoId } from '../lib/extractVideoId.js';

describe('extractVideoId', () => {
  it('extracts from bare 11-char ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects non-11-char bare strings', () => {
    expect(extractVideoId('hello')).toBeNull();
    expect(extractVideoId('dQw4w9WgXcQ123')).toBeNull();
    expect(extractVideoId('')).toBeNull();
  });

  it('extracts from full youtube.com URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PL123')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com/shorts', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtube.com/embed', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from m.youtube.com', () => {
    expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from URL without protocol', () => {
    expect(extractVideoId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from Invidious API URL', () => {
    expect(extractVideoId('https://inv.thepixora.com/api/v1/videos/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://viewd.replit.app/api/v1/videos/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from VIEWD hash URL', () => {
    expect(extractVideoId('https://viewd.khurk.xyz/#/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('viewd.khurk.xyz/#/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from http (not https) URL', () => {
    expect(extractVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('q8holiIirgo')).toBe('q8holiIirgo');
    expect(extractVideoId('a-b_c-d_e-f')).toBe('a-b_c-d_e-f');
  });

  it('returns null for gibberish', () => {
    expect(extractVideoId('not a video')).toBeNull();
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId(null)).toBeNull();
    expect(extractVideoId(undefined)).toBeNull();
  });
});
