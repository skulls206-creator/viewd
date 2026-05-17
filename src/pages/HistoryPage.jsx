import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory } from '../lib/store.js';
import { getBestThumbnail, getBestAvatar, formatDuration, formatViews, formatPublished } from '../lib/utils.js';

export default function HistoryPage() {
  const [history, setHistory] = useState(() => getHistory());

  function handleClear() {
    clearHistory();
    setHistory([]);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
          >
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="text-lg font-medium mb-1">No history yet</p>
          <p className="text-sm">Videos you watch will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((v) => (
            <div key={v.videoId + v.watchedAt} className="group flex gap-3">
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
                  {v.authorThumbnails?.length > 0 && (
                    <img src={getBestAvatar(v.authorThumbnails)} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <Link to={`/channel/${v.authorId}`} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] truncate">
                    {v.author}
                  </Link>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Watched {formatPublished(new Date(v.watchedAt).toISOString())}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
