import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVideo } from '../hooks/useInvidious.js';
import { getComments } from '../lib/invidious.js';
import { getBestThumbnail, formatDuration, formatViews, formatPublished, abbreviateNumber, getBestAvatar } from '../lib/utils.js';
import { isSubscribed, subscribe, unsubscribe, getPlaylists, addToPlaylist, addToHistory, getPreventBgAutoplay, getPauseBgTabs, getLoopMode, setLoopMode, getHideComments, getPlaybackSpeed, getMiniPlayer } from '../lib/store.js';
import CommentCard from '../components/CommentCard.jsx';

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
  const playerContainerRef = useRef(null);
  const bgChannelRef = useRef(null);
  const [loopActive, setLoopActive] = useState(getLoopMode());
  const [commentsHidden, setCommentsHidden] = useState(getHideComments());
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const miniObservedRef = useRef(null);

  // Helper: post message to the YouTube iframe
  function postToPlayer(msg) {
    const iframe = document.querySelector('#player iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
    }
  }

  function pauseIframe() {
    postToPlayer({ event: 'command', func: 'pauseVideo', args: '' });
  }

  // Cross-tab background pause via BroadcastChannel
  useEffect(() => {
    const chan = new BroadcastChannel('viewd-video');
    bgChannelRef.current = chan;
    chan.onmessage = (e) => {
      if (e.data === 'pause') pauseIframe();
    };
    return () => chan.close();
  }, []);

  // Visibility-based pause + autoplay prevention
  // + broadcast 'pause' on user interaction (so clicking play mutes other tabs)
  useEffect(() => {
    const preventBg = getPreventBgAutoplay();
    const pauseBg = getPauseBgTabs();
    if (!preventBg && !pauseBg) return;

    function onVisibilityChange() {
      if (document.hidden) {
        if (pauseBg) pauseIframe();
      } else {
        try {
          bgChannelRef.current?.postMessage('pause');
        } catch {}
      }
    }

    function onUserInteraction() {
      if (!pauseBg) return;
      try {
        bgChannelRef.current?.postMessage('pause');
      } catch {}
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('click', onUserInteraction);
    document.addEventListener('keydown', onUserInteraction);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('click', onUserInteraction);
      document.removeEventListener('keydown', onUserInteraction);
    };
  }, []);

  // Should we autoplay? Depends on setting + whether we're the active tab
  const shouldAutoplay = !getPreventBgAutoplay() || !document.hidden;
  const autoplayQuery = shouldAutoplay ? 'autoplay=1' : 'autoplay=0';

  // Loop mode: listen for YouTube iframe state changes
  useEffect(() => {
    function onMessage(e) {
      if (!getLoopMode()) return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'onStateChange' && data.info === 0) {
          // Video ended — seek to 0 and play
          const iframe = document.querySelector('#player iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0] }), '*');
            setTimeout(() => {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
            }, 100);
          }
        }
      } catch {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Default playback speed
  useEffect(() => {
    if (!video) return;
    const speed = getPlaybackSpeed();
    if (speed === 1) return;
    const timer = setTimeout(() => {
      const iframe = document.querySelector('#player iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [speed] }), '*');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [video]);

  // Mini-player: IntersectionObserver on the player element itself
  useEffect(() => {
    const el = document.querySelector('#player');
    if (!el) return;
    if (!getMiniPlayer()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMiniPlayerVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoId]);

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

  // Use a ref to track the latest continuation so the effect always uses
  // the correct (null for fresh loads) value rather than stale closures
  const continuationRef = useRef(null);

  useEffect(() => {
    continuationRef.current = commentContinuation;
  }, [commentContinuation]);

  async function loadComments() {
    if (!videoId) return;
    setLoadingComments(true);
    try {
      const cont = continuationRef.current;
      const data = await getComments(videoId, cont);
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

  if (error && !video) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <div className="aspect-video rounded-xl overflow-hidden bg-black mb-6">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?${autoplayQuery}&rel=0`}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video player"
          />
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] text-center mb-3">
          Invidious can't retrieve details for this video — the player still works.
        </p>
        <div className="text-center">
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 ${theater ? 'max-w-full' : 'max-w-[1400px]'} mx-auto`}>
      <div className={`${theater ? '' : 'lg:flex'} gap-6`}>
        <div ref={playerContainerRef} className={`${theater ? 'w-full' : 'lg:w-[65%]'}`}>
          <div id="player" ref={playerRef} className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?${autoplayQuery}&rel=0`}
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
                <button
                  onClick={() => { const v = !loopActive; setLoopActive(v); setLoopMode(v); }}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    loopActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  title="Loop video"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
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
            {commentsHidden && comments.length > 0 ? (
              <div className="mt-6">
                <button
                  onClick={() => setCommentsHidden(false)}
                  className="w-full py-3 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                >
                  Show {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </button>
              </div>
            ) : (comments.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[var(--color-text)]">Comments</h2>
                  {getHideComments() && (
                    <button
                      onClick={() => setCommentsHidden(true)}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                    >
                      Hide
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {comments.map((comment, i) => (
                    <CommentCard key={comment.commentId || i} comment={comment} />
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
            ))}
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

        {/* Sidebar — recommended (hidden in theater mode) */}
        <div className={`${theater ? 'hidden' : 'hidden lg:block'} lg:w-[35%]`}>
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

        {/* Recommended videos below player (theater mode only) */}
        {theater && video?.recommendedVideos?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">Up next</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {video.recommendedVideos.filter((v) => v.videoId).map((v) => (
                <Link key={v.videoId} to={`/watch?v=${v.videoId}`} className="group">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)] mb-1.5">
                    {v.videoThumbnails?.length > 0 ? (
                      <img src={getBestThumbnail(v.videoThumbnails)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">No thumb</div>
                    )}
                    {v.lengthSeconds > 0 && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium">
                        {formatDuration(v.lengthSeconds)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-tight group-hover:text-[var(--color-primary)]">{v.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{v.author}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatViews(v.viewCount)} views</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating mini-player */}
      {miniPlayerVisible && videoId && (
        <div
          className="mini-player"
          onClick={() => window.location.hash = `#/watch?v=${videoId}`}
          title="Click to go to watch page"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1`}
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            title="Mini player"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setMiniPlayerVisible(false); }}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
