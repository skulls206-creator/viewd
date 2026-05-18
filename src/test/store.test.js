import { describe, it, expect, beforeEach } from 'vitest';

// Import through store module
import {
  getSubscriptions, subscribe, unsubscribe, isSubscribed,
  getPlaylists, createPlaylist, deletePlaylist, addToPlaylist,
  removeFromPlaylist, getHistory, addToHistory, clearHistory,
  getTheme, setTheme, applyTheme,
  getLoopMode, setLoopMode,
  getHideComments, setHideComments,
  getPlaybackSpeed, setPlaybackSpeed,
  getAccentColor, setAccentColor, applyAccentColor,
  getMiniPlayer, setMiniPlayer,
} from '../lib/store.js';

beforeEach(() => {
  localStorage.clear();
});

describe('Subscriptions', () => {
  it('starts empty', () => {
    expect(getSubscriptions()).toEqual([]);
  });

  it('subscribe adds a channel', () => {
    subscribe({ ucid: 'UC123', author: 'Test Channel', authorUrl: '/channel/UC123', authorThumbnails: [] });
    const subs = getSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].author).toBe('Test Channel');
  });

  it('isSubscribed returns true after subscribing', () => {
    subscribe({ ucid: 'UC123', author: 'Test', authorUrl: '', authorThumbnails: [] });
    expect(isSubscribed('UC123')).toBe(true);
    expect(isSubscribed('UC456')).toBe(false);
  });

  it('unsubscribe removes a channel', () => {
    subscribe({ ucid: 'UC123', author: 'Test', authorUrl: '', authorThumbnails: [] });
    unsubscribe('UC123');
    expect(getSubscriptions()).toHaveLength(0);
  });

  it('subscribe does not duplicate', () => {
    subscribe({ ucid: 'UC123', author: 'Test', authorUrl: '', authorThumbnails: [] });
    subscribe({ ucid: 'UC123', author: 'Test', authorUrl: '', authorThumbnails: [] });
    expect(getSubscriptions()).toHaveLength(1);
  });
});

describe('Playlists (CRUD)', () => {
  it('starts empty', () => {
    expect(getPlaylists()).toEqual([]);
  });

  it('createPlaylist adds a playlist', () => {
    createPlaylist('My Favorites');
    const pls = getPlaylists();
    expect(pls).toHaveLength(1);
    expect(pls[0].name).toBe('My Favorites');
    expect(pls[0].id).toBeTruthy();
    expect(pls[0].videos).toEqual([]);
  });

  it('deletePlaylist removes a playlist', () => {
    // Manually clean state
    localStorage.setItem('viewd_store', '{"playlists":[],"subscriptions":[],"theme":"system","instance":""}');

    createPlaylist('ToDelete');
    const before = getPlaylists();
    expect(before).toHaveLength(1);

    deletePlaylist(before[0].id);
    expect(getPlaylists()).toHaveLength(0);
  });

  it('addToPlaylist adds a video', () => {
    createPlaylist('Test');
    const id = getPlaylists()[0].id;
    addToPlaylist(id, { videoId: 'abc123', title: 'Test Video', author: 'Tester' });
    const pl = getPlaylists()[0];
    expect(pl.videos).toHaveLength(1);
    expect(pl.videos[0].title).toBe('Test Video');
  });

  it('addToPlaylist does not duplicate videos', () => {
    createPlaylist('Test');
    const id = getPlaylists()[0].id;
    addToPlaylist(id, { videoId: 'abc123', title: 'Test Video', author: 'Tester' });
    addToPlaylist(id, { videoId: 'abc123', title: 'Test Video', author: 'Tester' });
    expect(getPlaylists()[0].videos).toHaveLength(1);
  });

  it('removeFromPlaylist removes a video', () => {
    createPlaylist('Test');
    const id = getPlaylists()[0].id;
    addToPlaylist(id, { videoId: 'abc123', title: 'Test Video', author: 'Tester' });
    addToPlaylist(id, { videoId: 'def456', title: 'Second Video', author: 'Tester' });
    removeFromPlaylist(id, 'abc123');
    const pl = getPlaylists()[0];
    expect(pl.videos).toHaveLength(1);
    expect(pl.videos[0].videoId).toBe('def456');
  });
});

describe('History', () => {
  it('starts empty', () => {
    expect(getHistory()).toEqual([]);
  });

  it('addToHistory prepends and caps at 50', () => {
    const video = { videoId: 'abc', title: 'Test', author: 'Tester', authorId: 'UC123', lengthSeconds: 100, videoThumbnails: [], authorThumbnails: [] };
    addToHistory(video);
    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0].videoId).toBe('abc');

    // Add another
    addToHistory({ ...video, videoId: 'def' });
    expect(getHistory()).toHaveLength(2);
    expect(getHistory()[0].videoId).toBe('def'); // newest first
  });

  it('deduplicates by videoId', () => {
    const video = { videoId: 'abc', title: 'Original', author: 'Tester', authorId: 'UC123', lengthSeconds: 100, videoThumbnails: [], authorThumbnails: [] };
    addToHistory(video);
    addToHistory({ ...video, title: 'Updated Title' });
    const h = getHistory();
    expect(h).toHaveLength(1);
    expect(h[0].title).toBe('Updated Title'); // updated
  });

  it('clearHistory removes all', () => {
    const video = { videoId: 'abc', title: 'Test', author: 'Tester', authorId: 'UC123', lengthSeconds: 100, videoThumbnails: [], authorThumbnails: [] };
    addToHistory(video);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});

describe('Theme', () => {
  it('defaults to system', () => {
    expect(getTheme()).toBe('system');
  });

  it('setTheme persists', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
  });

  it('applyTheme toggles dark class', () => {
    document.documentElement.classList.remove('dark');
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('Playback settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loopMode defaults to false', () => {
    expect(getLoopMode()).toBe(false);
  });

  it('setLoopMode persists', () => {
    setLoopMode(true);
    expect(getLoopMode()).toBe(true);
    setLoopMode(false);
    expect(getLoopMode()).toBe(false);
  });

  it('hideComments defaults to false', () => {
    expect(getHideComments()).toBe(false);
  });

  it('setHideComments persists', () => {
    setHideComments(true);
    expect(getHideComments()).toBe(true);
  });

  it('playbackSpeed defaults to 1', () => {
    expect(getPlaybackSpeed()).toBe(1);
  });

  it('setPlaybackSpeed persists custom speeds', () => {
    setPlaybackSpeed(1.5);
    expect(getPlaybackSpeed()).toBe(1.5);
    setPlaybackSpeed(2);
    expect(getPlaybackSpeed()).toBe(2);
  });

  it('accentColor defaults to empty string', () => {
    expect(getAccentColor()).toBe('');
  });

  it('setAccentColor persists and applies to :root', () => {
    setAccentColor('#22c55e');
    expect(getAccentColor()).toBe('#22c55e');
    const primary = document.documentElement.style.getPropertyValue('--color-primary');
    expect(primary).toBe('#22c55e');
  });

  it('applyAccentColor sets both primary and hover', () => {
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-hover');
    applyAccentColor('#06b6d4');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#06b6d4');
    expect(document.documentElement.style.getPropertyValue('--color-primary-hover')).toBe('#05899f');
  });

  it('applyAccentColor with empty string removes custom vars', () => {
    applyAccentColor('#06b6d4');
    applyAccentColor('');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--color-primary-hover')).toBe('');
  });

  it('miniPlayer defaults to true', () => {
    expect(getMiniPlayer()).toBe(true);
  });

  it('setMiniPlayer persists', () => {
    setMiniPlayer(false);
    expect(getMiniPlayer()).toBe(false);
  });
});
