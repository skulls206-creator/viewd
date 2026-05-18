import { useState } from 'react';
import { getBestAvatar, formatPublished } from '../lib/utils.js';

const TRUNCATE_LENGTH = 400;

export default function CommentCard({ comment }) {
  const [expanded, setExpanded] = useState(false);
  const content = comment.content || '';
  const isLong = content.length > TRUNCATE_LENGTH;
  const displayText = isLong && !expanded ? content.slice(0, TRUNCATE_LENGTH) : content;

  return (
    <div className="flex gap-3">
      {comment.authorThumbnails?.length > 0 ? (
        <img src={getBestAvatar(comment.authorThumbnails)} alt="" className="w-8 h-8 rounded-full shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] shrink-0" />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[200px]">{comment.author}</span>
          <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
            {comment.publishedText || formatPublished(comment.published)}
          </span>
        </div>
        <p
          className={`text-sm text-[var(--color-text)] mt-0.5 ${!expanded && isLong ? 'line-clamp-6' : ''}`}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            {expanded ? 'Show less' : `Show more (${(content.length - TRUNCATE_LENGTH).toLocaleString()} more characters)`}
          </button>
        )}
        {comment.likeCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            {comment.likeCount}
          </div>
        )}
      </div>
    </div>
  );
}
