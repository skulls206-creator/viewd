import { useState } from 'react';
import { useTrending } from '../hooks/useInvidious.js';
import VideoCard, { VideoCardSkeleton } from '../components/VideoCard.jsx';

export default function HomePage() {
  const [region, setRegion] = useState('US');
  const { data: videos, isLoading, error } = useTrending(region);

  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Trending</h1>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none"
        >
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="JP">Japan</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
          <option value="BR">Brazil</option>
          <option value="IN">India</option>
          <option value="RU">Russia</option>
        </select>
      </div>

      {error && (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)] mb-2">Failed to load trending videos.</p>
          <p className="text-xs text-[var(--color-text-secondary)]">The Invidious instance may be unavailable. Try changing it in Settings.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
          : videos?.map((video) => <VideoCard key={video.videoId} video={video} />)}
      </div>

      {!isLoading && videos?.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          No videos found.
        </div>
      )}
    </div>
  );
}
