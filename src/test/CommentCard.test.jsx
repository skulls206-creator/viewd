import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentCard from '../components/CommentCard.jsx';

const shortComment = {
  commentId: 'c1',
  author: '@shorty',
  content: 'Nice video!',
  likeCount: 42,
  publishedText: '1 day ago',
  authorThumbnails: [],
};

const longComment = {
  commentId: 'c2',
  author: '@tokenhiphop',
  content: 'BTW.. anyone who thought id get my numbers up and stop rapping.. tell em we about to make rapping fly again. \n\nLYRICS:\n\nDream draft\nlike im Steve Nash on a rampage\n' + Array.from({ length: 60 }, (_, i) => `Line ${i + 1} of a really long rap verse that goes on and on and on`).join('\n'),
  likeCount: 1200,
  publishedText: '9 months ago',
  authorThumbnails: [],
};

describe('CommentCard', () => {
  it('renders short comments in full', () => {
    render(<CommentCard comment={shortComment} />);
    expect(screen.getByText('Nice video!')).toBeInTheDocument();
    expect(screen.getByText('@shorty')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/Show more/)).not.toBeInTheDocument();
  });

  it('truncates long comments with Show more button', () => {
    render(<CommentCard comment={longComment} />);
    // Content is truncated — first 400 chars shown
    const contentEl = screen.getByText(/im Steve Nash/, { exact: false });
    expect(contentEl).toBeInTheDocument();
    // Button should appear
    const showMoreBtn = screen.getByText(/Show more/);
    expect(showMoreBtn).toBeInTheDocument();
    // Full content should NOT be visible
    expect(screen.queryByText(/Line 59 of a really long/)).not.toBeInTheDocument();
  });

  it('expands long comments on Show more click', async () => {
    const user = userEvent.setup();
    render(<CommentCard comment={longComment} />);
    
    // Click Show more
    await user.click(screen.getByText(/Show more/));
    
    // Full content should now be visible
    expect(screen.getByText(/Line 59 of a really long/)).toBeInTheDocument();
    // Button should toggle to Show less
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses back on Show less click', async () => {
    const user = userEvent.setup();
    render(<CommentCard comment={longComment} />);
    
    // Expand
    await user.click(screen.getByText(/Show more/));
    expect(screen.getByText('Show less')).toBeInTheDocument();
    
    // Collapse
    await user.click(screen.getByText('Show less'));
    expect(screen.queryByText(/Line 59 of a really long/)).not.toBeInTheDocument();
    expect(screen.getByText(/Show more/)).toBeInTheDocument();
  });

  it('shows like count when > 0', () => {
    render(<CommentCard comment={shortComment} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('hides like count when 0', () => {
    render(<CommentCard comment={{ ...shortComment, likeCount: 0 }} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows publishedText when available', () => {
    render(<CommentCard comment={shortComment} />);
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });
});
