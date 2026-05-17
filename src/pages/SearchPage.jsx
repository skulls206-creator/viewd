import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useInvidious.js';
import VideoCard, { VideoCardRow, VideoCardSkeleton } from '../components/VideoCard.jsx';
import { useTrending } from '../hooks/useInvidious.js';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const { data, isLoading, error } = useSearch(query, page, sortBy);

  if (!query) {
    return <HomeFallback />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Results for "{query}"</h1>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none"
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Rating</option>
          <option value="date">Date</option>
          <option value="views">Views</option>
        </select>
      </div>

      {error && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          Search failed. The instance may be unavailable. VIEWD will attempt to auto-switch. If this persists, try changing the instance in Settings.
        </div>
      )}

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)
          : data?.map((video) => <VideoCardRow key={video.videoId} video={video} />)}
      </div>

      {!isLoading && data?.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          No results found for "{query}".
        </div>
      )}

      {data && data.length > 0 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-surface-hover)]"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data?.length < 20}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-surface-hover)]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function HomeFallback() {
  const { data: trending } = useTrending('US');
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-6">Trending</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {trending?.map((video) => <VideoCard key={video.videoId} video={video} />)}
      </div>
    </div>
  );
}
