import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVideo } from '../hooks/useInvidious.js';
import { getComments } from '../lib/invidious.js';
import { getBestThumbnail, formatDuration, formatViews, formatPublished, abbreviateNumber, getBestAvatar } from '../lib/utils.js';
import { isSubscribed, subscribe, unsubscribe, getPlaylists, addToPlaylist, addToHistory } from '../lib/store.js';

export default function WatchPage() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('v');
  const { data: video, isLoading, error } = useVideo(videoId);
  const [theater, setTheater] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentContinuation, setCommentContinuation] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [subbed, setSubbed] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const playerRef = useRef(null);
  const playlistRef = useRef(null);

  useEffect(() => {
    if (video) {
      setSubbed(isSubscribed(video.authorId));
      addToHistory(video);
    }
  }, [video]);

  useEffect(() => {
    if (videoId) {
      setComments([]);
      setCommentContinuation(null);
      loadComments();
    }
  }, [videoId]);

  async function loadComments() {
    if (!videoId) return;
    setLoadingComments(true);
    try {
      const data = await getComments(videoId, commentContinuation);
      setComments((prev) => [...prev, ...(data.comments || [])]);
      setCommentContinuation(data.continuation || null);
    } catch {
      // comments may not be available on all instances
    }
    setLoadingComments(false);
  }

  useEffect(() => {
    const handler = (e) => {
      if (playlistRef.current && !playlistRef.current.contains(e.target)) setShowPlaylistMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSubscribe() {
    if (!video) return;
    if (subbed) {
      unsubscribe(video.authorId);
      setSubbed(false);
    } else {
      subscribe({ ucid: video.authorId, author: video.author, authorUrl: video.authorUrl, authorThumbnails: video.authorThumbnails });
      setSubbed(true);
    }
  }

  function handleAddToPlaylist(playlistId) {
    if (!video) return;
    addToPlaylist(playlistId, {
      videoId: video.videoId,
      title: video.title,
      author: video.author,
      authorId: video.authorId,
      lengthSeconds: video.lengthSeconds,
      videoThumbnails: video.videoThumbnails,
    });
    setShowPlaylistMenu(false);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const iframe = document.querySelector('#player iframe');
      const playerEl = playerRef.current;

      if (e.key === 'f' || e.key === 'F') {
        if (playerEl) {
          if (document.fullscreenElement) document.exitFullscreen();
          else playerEl.requestFullscreen();
        }
      }
      if (e.key === 't' || e.key === 'T') setTheater((v) => !v);
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"' + (e.key === ' ' ? 'togglePlay' : 'togglePlay') + '","args":""}', '*');
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (iframe && iframe.contentWindow) {
          const dir = e.key === 'ArrowLeft' ? -10 : 10;
          iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":["seekby"],"seekBy":' + dir + '}', '*');
        }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[10]}', '*');
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[-10]}', '*');
        }
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[0]}', '*');
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        // Toggle captions — post to iframe
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"toggleCaptions","args":""}', '*');
        }
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const percent = parseInt(e.key) / 10;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":["seekpercent"],"seekPercent":' + percent + '}', '*');
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-text-secondary)]">
        No video specified.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <div className="text-center py-4 text-sm text-[var(--color-text-secondary)]">
          Loading video...
        </div>
        <div className="lg:flex gap-6">
          <div className="lg:w-[65%]">
            <div className="aspect-video rounded-xl skeleton mb-4" />
            <div className="h-5 rounded skeleton w-3/4 mb-2" />
            <div className="h-4 rounded skeleton w-1/4 mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full skeleton" />
              <div className="h-4 rounded skeleton w-24" />
            </div>
          </div>
          <div className="lg:w-[35%] mt-4 lg:mt-0">
            <div className="text-sm text-[var(--color-text-secondary)] mb-3">Up next</div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <div className="w-40 aspect-video rounded-lg skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded skeleton w-full" />
                  <div className="h-3 rounded skeleton w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-secondary)]">
        <p className="mb-2">Failed to load video.</p>
        <p className="text-xs">The instance may be unavailable. Try changing it in Settings.</p>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 ${theater ? 'max-w-full' : 'max-w-[1400px]'} mx-auto`}>
      <div className="lg:flex gap-6">
        <div className={`${theater ? 'w-full' : 'lg:w-[65%]'}`}>
          <div id="player" ref={playerRef} className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              title={video?.title || 'Video player'}
            />
          </div>

          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text)] mb-2">
              {video?.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-4">
              <span>{formatViews(video?.viewCount)} views</span>
              <span aria-hidden="true">·</span>
              <span>{video?.publishedText || formatPublished(video?.published)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Link to={`/channel/${video?.authorId}`} className="shrink-0">
                  {video?.authorThumbnails?.length > 0 ? (
                    <img
                      src={getBestAvatar(video.authorThumbnails)}
                      alt=""
                      className="w-10 h-10 rounded-full bg-[var(--color-surface)]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface)]" />
                  )}
                </Link>
                <div>
                  <Link to={`/channel/${video?.authorId}`} className="text-sm font-semibold text-[var(--color-text)] hover:underline">
                    {video?.author}
                  </Link>
                  {video?.subCountText && (
                    <p className="text-xs text-[var(--color-text-secondary)]">{video.subCountText}</p>
                  )}
                </div>
                <button
                  onClick={handleSubscribe}
                  className={`ml-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    subbed
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                      : 'bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-80'
                  }`}
                >
                  {subbed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => { setPlaylists(getPlaylists()); setShowPlaylistMenu(!showPlaylistMenu); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--color-surface)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Save
                  </button>
                  {showPlaylistMenu && (
                    <div ref={playlistRef} className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl z-50 py-2">
                      <p className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider">Save to playlist</p>
                      {playlists.length === 0 && (
                        <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">No playlists. Create one on the Subscriptions page.</p>
                      )}
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => handleAddToPlaylist(pl.id)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setTheater(!theater)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    theater ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  title="Theater mode (T)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
                </button>
              </div>
            </div>

            {/* Description */}
            {video?.description && (
              <div className="mb-6">
                <div
                  className={`bg-[var(--color-surface)] rounded-xl p-4 text-sm text-[var(--color-text)] ${
                    !showDesc ? 'line-clamp-3' : ''
                  }`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {video.description}
                </div>
                {video.description.length > 200 && (
                  <button
                    onClick={() => setShowDesc(!showDesc)}
                    className="mt-1 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    {showDesc ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {/* Recommended Videos */}
            {video?.recommendedVideos?.length > 0 && (
              <div className="lg:hidden mt-6">
                <h2 className="text-base font-bold text-[var(--color-text)] mb-3">Up next</h2>
                <div className="space-y-3">
                  {video.recommendedVideos.filter((v) => v.videoId).map((v) => (
                    <Link key={v.videoId} to={`/watch?v=${v.videoId}`} className="flex gap-2 group">
                      <div className="relative shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)]">
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
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-tight">{v.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{v.author}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{formatViews(v.viewCount)} views</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {comments.length > 0 && (
              <div className="mt-6">
                <h2 className="text-base font-bold text-[var(--color-text)] mb-4">Comments</h2>
                <div className="space-y-4">
                  {comments.map((comment, i) => (
                    <div key={comment.commentId || i} className="flex gap-3">
                      {comment.authorThumbnails?.length > 0 ? (
                        <img src={getBestAvatar(comment.authorThumbnails)} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-text)]">{comment.author}</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {comment.publishedText || formatPublished(comment.published)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text)] mt-0.5" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {comment.content}
                        </p>
                        {comment.likeCount > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            {comment.likeCount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {commentContinuation && (
                  <button
                    onClick={loadComments}
                    disabled={loadingComments}
                    className="mt-4 w-full py-3 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-lg"
                  >
                    {loadingComments ? 'Loading...' : 'Load more comments'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mb-6">
            <details className="group">
              <summary className="cursor-pointer text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                Keyboard shortcuts
              </summary>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">K</kbd> Play/pause</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">F</kbd> Fullscreen</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">T</kbd> Theater mode</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">J</kbd> Back 10s</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">L</kbd> Forward 10s</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">←</kbd><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">→</kbd> Seek -/+ 10s</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">↑</kbd><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">↓</kbd> Vol +/- 10</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">M</kbd> Mute</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">C</kbd> Captions</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] font-mono text-[11px]">0-9</kbd> Seek to 0%-90%</div>
              </div>
            </details>
          </div>
        </div>

        {/* Sidebar — recommended */}
        <div className="hidden lg:block lg:w-[35%]">
          {video?.recommendedVideos?.length > 0 && (
            <div className="space-y-3">
              {video.recommendedVideos.filter((v) => v.videoId).map((v) => (
                <Link key={v.videoId} to={`/watch?v=${v.videoId}`} className="flex gap-2 group">
                  <div className="relative shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)]">
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
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-tight">{v.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{v.author}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{formatViews(v.viewCount)} views</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
