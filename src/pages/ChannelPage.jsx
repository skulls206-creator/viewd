import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChannel, useChannelVideos } from '../hooks/useInvidious.js';
import { getBestAvatar, getBestThumbnail, formatViews, formatPublished, abbreviateNumber } from '../lib/utils.js';
import VideoCard, { VideoCardSkeleton } from '../components/VideoCard.jsx';
import { isSubscribed, subscribe, unsubscribe } from '../lib/store.js';

export default function ChannelPage() {
  const { id } = useParams();
  const { data: channel, isLoading: loadingChannel, error: channelError } = useChannel(id);
  const [sortBy, setSortBy] = useState('newest');
  const { data: videos, isLoading: loadingVideos } = useChannelVideos(id, sortBy);
  const [subbed, setSubbed] = useState(isSubscribed(id));

  function handleSubscribe() {
    if (!channel) return;
    if (subbed) {
      unsubscribe(id);
      setSubbed(false);
    } else {
      subscribe({
        ucid: channel.authorId || id,
        author: channel.author,
        authorUrl: channel.authorUrl,
        authorThumbnails: channel.authorThumbnails,
      });
      setSubbed(true);
    }
  }

  if (loadingChannel) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-6 p-6 rounded-2xl bg-[var(--color-surface)]">
          <div className="w-20 h-20 rounded-full skeleton" />
          <div className="text-center sm:text-left flex-1 space-y-2">
            <div className="h-6 rounded skeleton w-48 mx-auto sm:mx-0" />
            <div className="h-4 rounded skeleton w-32 mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (channelError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-secondary)]">
        <p className="mb-2">Failed to load channel.</p>
        <p className="text-xs">Try again or change the instance in Settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-6 p-6 rounded-2xl bg-[var(--color-surface)]">
        {channel?.authorThumbnails?.length > 0 ? (
          <img src={getBestAvatar(channel.authorThumbnails)} alt="" className="w-20 h-20 rounded-full" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[var(--color-surface-hover)]" />
        )}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--color-text)]">{channel?.author}</h1>
          {channel?.subCount > 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {abbreviateNumber(channel.subCount)} subscribers
            </p>
          )}
          {channel?.totalViews > 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              {abbreviateNumber(channel.totalViews)} total views
            </p>
          )}
        </div>
        <button
          onClick={handleSubscribe}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            subbed
              ? 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
              : 'bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-80'
          }`}
        >
          {subbed ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>

      {channel?.description && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-surface)] text-sm text-[var(--color-text)]" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {channel.description.length > 300
            ? channel.description.slice(0, 300) + '...'
            : channel.description}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Videos</h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="popular">Popular</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {loadingVideos
          ? Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)
          : videos?.map((video) => <VideoCard key={video.videoId} video={video} />)}
      </div>
    </div>
  );
}
