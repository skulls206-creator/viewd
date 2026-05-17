import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSubscriptions, getPlaylists, createPlaylist, deletePlaylist, removeFromPlaylist } from '../lib/store.js';
import { getChannelVideos } from '../lib/invidious.js';
import { getBestAvatar, getBestThumbnail, formatDuration, formatViews, formatPublished } from '../lib/utils.js';
import { VideoCardSkeleton } from '../components/VideoCard.jsx';

const FEED_CACHE_KEY = 'viewd_feed_cache';

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState(() => getSubscriptions());
  const [playlists, setPlaylists] = useState(() => getPlaylists());
  const [tab, setTab] = useState('subscriptions');
  // Feed state
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [feedProgress, setFeedProgress] = useState(0);
  // Playlist state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  // Load cached feed on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) { // 5 min cache
          setFeedVideos(parsed.videos || []);
          return;
        }
      }
    } catch {}
    // No cache or stale — fetch
    fetchFeed();
  }, [subs.length]);

  const fetchFeed = useCallback(async () => {
    if (subs.length === 0) return;
    setFeedLoading(true);
    setFeedError(null);
    setFeedProgress(0);

    const allVideos = [];
    const total = subs.length;

    for (let i = 0; i < total; i++) {
      const sub = subs[i];
      setFeedProgress(i + 1);
      try {
        const data = await getChannelVideos(sub.ucid, 'newest', 1);
        if (Array.isArray(data)) {
          // Add channel info to each video
          data.forEach((v) => {
            v._channelAuthor = sub.author;
            v._channelUrl = `/channel/${sub.ucid}`;
            v._channelAvatar = sub.authorThumbnails;
          });
          allVideos.push(...data);
        }
      } catch {
        // skip failed channels
      }
    }

    // Sort by published date descending
    allVideos.sort((a, b) => {
      const aTime = a.published ? new Date(a.published).getTime() : 0;
      const bTime = b.published ? new Date(b.published).getTime() : 0;
      return bTime - aTime;
    });

    setFeedVideos(allVideos);
    setFeedLoading(false);
    setFeedProgress(0);

    // Cache
    try {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        videos: allVideos,
      }));
    } catch {}
  }, [subs]);

  function handleCreate() {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setPlaylists(getPlaylists());
    setNewName('');
    setShowCreate(false);
  }

  function handleDelete(id) {
    deletePlaylist(id);
    setPlaylists(getPlaylists());
  }

  function handleRemove(playlistId, videoId) {
    removeFromPlaylist(playlistId, videoId);
    setPlaylists(getPlaylists());
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4 mb-6 border-b border-[var(--color-border)]">
        <button
          onClick={() => setTab('subscriptions')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'subscriptions'
              ? 'border-[var(--color-primary)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => setTab('channels')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'channels'
              ? 'border-[var(--color-primary)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setTab('playlists')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'playlists'
              ? 'border-[var(--color-primary)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          Playlists
        </button>
      </div>

      {/* FEED TAB */}
      {tab === 'subscriptions' && (
        <>
          {subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
              <p className="text-lg font-medium mb-1">No subscriptions yet</p>
              <p className="text-sm">Subscribe to channels to see their latest videos here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--color-text)]">Latest from your subscriptions</h2>
                <button
                  onClick={fetchFeed}
                  disabled={feedLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-40"
                >
                  {feedLoading ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3"/></svg>
                      Refreshing {feedProgress}/{subs.length}...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>

              {feedError && (
                <div className="text-center py-6 text-sm text-[var(--color-text-secondary)]">
                  Failed to load some channels. Try refreshing.
                </div>
              )}

              {feedLoading && feedVideos.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-2 text-sm text-[var(--color-text-secondary)]">
                    Fetching videos from {feedProgress}/{subs.length} channels...
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
              )}

              {!feedLoading && feedVideos.length === 0 && (
                <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">
                  No recent videos from your subscriptions.
                </div>
              )}

              {feedVideos.length > 0 && (
                <div className="space-y-3">
                  {feedVideos.map((v) => (
                    <div key={v.videoId} className="group flex gap-3">
                      <Link to={`/watch?v=${v.videoId}`} className="relative shrink-0 w-40 sm:w-48 aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)]">
                        {v.videoThumbnails?.length > 0 ? (
                          <img src={getBestThumbnail(v.videoThumbnails)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">No thumbnail</div>
                        )}
                        {v.lengthSeconds > 0 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                            {formatDuration(v.lengthSeconds)}
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/watch?v=${v.videoId}`}>
                          <h3 className="text-sm font-semibold leading-tight text-[var(--color-text)] line-clamp-2 mb-1">
                            {v.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {v._channelAvatar?.length > 0 && (
                            <img src={getBestAvatar(v._channelAvatar)} alt="" className="w-5 h-5 rounded-full" />
                          )}
                          <Link to={v._channelUrl || `/channel/${v.authorId}`} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] truncate">
                            {v._channelAuthor || v.author}
                          </Link>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {v.viewCount > 0 && `${formatViews(v.viewCount)} views`}
                          {v.viewCount > 0 && v.publishedText && ' · '}
                          {v.publishedText || (v.published && formatPublished(v.published))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* CHANNELS TAB */}
      {tab === 'channels' && (
        <>
          {subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
              <p className="text-lg font-medium mb-1">No subscriptions yet</p>
              <p className="text-sm">Subscribe to channels to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {subs.map((sub) => (
                <Link
                  key={sub.ucid}
                  to={`/channel/${sub.ucid}`}
                  className="flex flex-col items-center p-4 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
                >
                  {sub.authorThumbnails?.length > 0 ? (
                    <img src={getBestAvatar(sub.authorThumbnails)} alt="" className="w-20 h-20 rounded-full" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[var(--color-surface)]" />
                  )}
                  <span className="mt-3 text-sm font-medium text-[var(--color-text)] text-center truncate w-full">
                    {sub.author}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* PLAYLISTS TAB */}
      {tab === 'playlists' && (
        <>
          <div className="mb-4">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-80"
            >
              New playlist
            </button>
          </div>

          {showCreate && (
            <div className="mb-6 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Playlist name"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] outline-none mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium">
                  Create
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <p className="text-lg font-medium mb-1">No playlists yet</p>
              <p className="text-sm">Create a playlist and save videos to it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {playlists.map((pl) => (
                <div key={pl.id} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-[var(--color-surface)]">
                    <div>
                      <h3 className="font-semibold text-[var(--color-text)]">{pl.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">{pl.videos.length} video{pl.videos.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(pl.id)}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    >
                      Delete
                    </button>
                  </div>
                  {pl.videos.length > 0 && (
                    <div className="divide-y divide-[var(--color-border)]">
                      {pl.videos.map((v) => (
                        <div key={v.videoId} className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface)]">
                          <Link to={`/watch?v=${v.videoId}`} className="relative shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)]">
                            {v.videoThumbnails?.length > 0 ? (
                              <img src={getBestThumbnail(v.videoThumbnails)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">No thumb</div>
                            )}
                            {v.lengthSeconds > 0 && (
                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium">
                                {formatDuration(v.lengthSeconds)}
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/watch?v=${v.videoId}`} className="text-sm font-medium text-[var(--color-text)] line-clamp-2 hover:underline">
                              {v.title}
                            </Link>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{v.author}</p>
                          </div>
                          <button
                            onClick={() => handleRemove(pl.id, v.videoId)}
                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] shrink-0"
                            title="Remove"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
