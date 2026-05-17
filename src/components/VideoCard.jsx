import { Link } from 'react-router-dom';
import { getBestThumbnail, formatDuration, formatViews, formatPublished } from '../lib/utils.js';

export default function VideoCard({ video }) {
  const thumbnail = getBestThumbnail(video.videoThumbnails);
  const href = `/watch?v=${video.videoId}`;

  return (
    <div className="group">
      <Link to={href} className="block relative aspect-video rounded-xl overflow-hidden bg-[var(--color-surface)]">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
            No thumbnail
          </div>
        )}
        {video.lengthSeconds > 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
            {formatDuration(video.lengthSeconds)}
          </span>
        )}
      </Link>
      <div className="flex gap-3 mt-3">
        {video.authorId && (
          <Link to={`/channel/${video.authorId}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {video.authorThumbnails && video.authorThumbnails.length > 0 ? (
              <img
                src={getBestThumbnail(video.authorThumbnails)}
                alt=""
                className="w-9 h-9 rounded-full bg-[var(--color-surface)]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[var(--color-surface)]" />
            )}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link to={href}>
            <h3 className="text-sm font-semibold leading-tight text-[var(--color-text)] line-clamp-2 mb-1">
              {video.title}
            </h3>
          </Link>
          {video.author && (
            <Link
              to={`/channel/${video.authorId}`}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] block truncate"
            >
              {video.author}
            </Link>
          )}
          <p className="text-xs text-[var(--color-text-secondary)]">
            {video.viewCount > 0 && `${formatViews(video.viewCount)} views`}
            {video.viewCount > 0 && video.publishedText && ' · '}
            {video.publishedText || (video.published && formatPublished(video.published))}
          </p>
        </div>
      </div>
    </div>
  );
}

export function VideoCardRow({ video }) {
  const thumbnail = getBestThumbnail(video.videoThumbnails);
  const href = `/watch?v=${video.videoId}`;

  return (
    <div className="group flex gap-3">
      <Link to={href} className="relative shrink-0 w-40 sm:w-48 aspect-video rounded-lg overflow-hidden bg-[var(--color-surface)]">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">
            No thumbnail
          </div>
        )}
        {video.lengthSeconds > 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
            {formatDuration(video.lengthSeconds)}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={href}>
          <h3 className="text-sm font-semibold leading-tight text-[var(--color-text)] line-clamp-2 mb-1">
            {video.title}
          </h3>
        </Link>
        {video.author && (
          <Link to={`/channel/${video.authorId}`} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] block">
            {video.author}
          </Link>
        )}
        <p className="text-xs text-[var(--color-text-secondary)]">
          {video.viewCount > 0 && `${formatViews(video.viewCount)} views`}
          {video.viewCount > 0 && video.publishedText && ' · '}
          {video.publishedText || (video.published && formatPublished(video.published))}
        </p>
        {video.description && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2 hidden sm:block">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div>
      <div className="aspect-video rounded-xl skeleton" />
      <div className="flex gap-3 mt-3">
        <div className="w-9 h-9 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded skeleton w-full" />
          <div className="h-3 rounded skeleton w-2/3" />
          <div className="h-2.5 rounded skeleton w-1/3" />
        </div>
      </div>
    </div>
  );
}
