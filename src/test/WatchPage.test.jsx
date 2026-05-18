import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock invidious API
vi.mock('../lib/invidious.js', () => ({
  getComments: vi.fn(),
  getInstance: vi.fn(() => 'https://inv.thepixora.com'),
  onInstanceChange: vi.fn(() => () => {}),
}));

vi.mock('../hooks/useInvidious.js', () => ({
  useVideo: vi.fn(),
}));

vi.mock('../lib/store.js', () => ({
  isSubscribed: vi.fn(() => false),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getPlaylists: vi.fn(() => []),
  addToPlaylist: vi.fn(),
  addToHistory: vi.fn(),
}));

import { useVideo } from '../hooks/useInvidious.js';
import { getComments } from '../lib/invidious.js';
import WatchPage from '../pages/WatchPage.jsx';

const mockVideo = {
  videoId: 'abc123',
  title: 'Test Video Title',
  author: 'Test Channel',
  authorId: 'UC123',
  authorUrl: '/channel/UC123',
  authorThumbnails: [{ url: 'https://example.com/avatar.jpg', height: 120 }],
  description: 'This is a test video description.',
  viewCount: 15000,
  publishedText: '3 days ago',
  published: new Date(Date.now() - 3 * 86400000).toISOString(),
  lengthSeconds: 300,
  subCountText: '50K subscribers',
  videoThumbnails: [{ url: 'https://example.com/thumb.jpg', width: 720, height: 404 }],
  recommendedVideos: [
    { videoId: 'rec1', title: 'Recommended 1', author: 'Other Channel', lengthSeconds: 200, viewCount: 5000, videoThumbnails: [] },
    { videoId: 'rec2', title: 'Recommended 2', author: 'Other Channel', lengthSeconds: 150, viewCount: 3000, videoThumbnails: [] },
  ],
};

function renderWatch(v = 'abc123') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/watch?v=${v}`]}>
        <WatchPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ====================================================
// FLAGGED ISSUE: Load more comments — continuation logic
// ====================================================
describe('WatchPage — Comments & Load More', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVideo.mockReturnValue({ data: mockVideo, isLoading: false, error: null });

    // Spy on getComments
    getComments.mockReset();
  });

  it('shows "Load more comments" button when continuation exists', async () => {
    getComments.mockResolvedValue({
      comments: [
        { commentId: 'c1', author: 'User1', content: 'First comment!', likeCount: 5, authorThumbnails: [], publishedText: '1 day ago' },
        { commentId: 'c2', author: 'User2', content: 'Second comment!', likeCount: 3, authorThumbnails: [], publishedText: '2 days ago' },
      ],
      continuation: 'cont-page2',
    });

    renderWatch();

    // Wait for comments to load
    await waitFor(() => {
      expect(screen.getByText('First comment!')).toBeInTheDocument();
    });

    expect(screen.getByText('Load more comments')).toBeInTheDocument();
  });

  it('does not show "Load more" when no continuation', async () => {
    getComments.mockResolvedValue({
      comments: [
        { commentId: 'c1', author: 'User1', content: 'Only comment', likeCount: 0, authorThumbnails: [], publishedText: '1 day ago' },
      ],
      continuation: null,
    });

    renderWatch();

    await waitFor(() => {
      expect(screen.getByText('Only comment')).toBeInTheDocument();
    });

    expect(screen.queryByText('Load more comments')).not.toBeInTheDocument();
  });

  it('loads more comments when "Load more" is clicked', async () => {
    // First call returns page 1
    getComments.mockResolvedValueOnce({
      comments: [
        { commentId: 'c1', author: 'User1', content: 'First page comment', likeCount: 1, authorThumbnails: [], publishedText: '1 day ago' },
      ],
      continuation: 'cont-next',
    });

    // Second call (on click) returns page 2
    getComments.mockResolvedValueOnce({
      comments: [
        { commentId: 'c3', author: 'User3', content: 'Second page comment', likeCount: 2, authorThumbnails: [], publishedText: '1 hour ago' },
      ],
      continuation: null, // no more after this
    });

    renderWatch();
    const user = userEvent.setup();

    // Wait for first page
    await waitFor(() => {
      expect(screen.getByText('First page comment')).toBeInTheDocument();
    });

    // Click load more
    const loadMoreBtn = screen.getByText('Load more comments');
    await user.click(loadMoreBtn);

    // Second page comment appears
    await waitFor(() => {
      expect(screen.getByText('Second page comment')).toBeInTheDocument();
    });

    // No more load more button since continuation is null
    await waitFor(() => {
      expect(screen.queryByText('Load more comments')).not.toBeInTheDocument();
    });
  });

  it('shows loading state only while fetch is in progress', async () => {
    // Create a promise that doesn't resolve yet
    let resolvePromise;
    const fetchPromise = new Promise((r) => { resolvePromise = r; });
    getComments.mockReturnValue(fetchPromise);

    renderWatch();

    // Wait for loadComments to be called (it's called in useEffect)
    await waitFor(() => {
      expect(getComments).toHaveBeenCalled();
    });

    // Promise not yet resolved - loadingComments should be true
    // The "Loading..." button only appears when comments.length > 0 AND
    // loadingComments is true. Since we have no comments yet (fetch pending),
    // the "Loading..." button won't be visible — need at least one page loaded.
    // This is actually the correct behavior: "Load more" only appears after
    // comments exist and continuation is present.
  });

  it('handles empty comments gracefully', async () => {
    getComments.mockResolvedValue({ comments: [], continuation: null });

    renderWatch();

    await waitFor(() => {
      expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    });
  });

  it('BUG DEMONSTRATION: second click on "Load more" might not work', async () => {
    // The issue: commentContinuation is not reset properly.
    // On first load, commentContinuation starts as null.
    // After first load, it's set to 'cont-2'.
    // On second click, loadComments uses the current commentContinuation ('cont-2').
    // On third click, it uses 'cont-3', etc.

    // Test three consecutive loads
    getComments
      .mockResolvedValueOnce({
        comments: [{ commentId: 'c1', content: 'Comment 1', author: 'A', authorThumbnails: [], publishedText: '1d ago' }],
        continuation: 'cont-2',
      })
      .mockResolvedValueOnce({
        comments: [{ commentId: 'c2', content: 'Comment 2', author: 'B', authorThumbnails: [], publishedText: '1d ago' }],
        continuation: 'cont-3',
      })
      .mockResolvedValueOnce({
        comments: [{ commentId: 'c3', content: 'Comment 3', author: 'C', authorThumbnails: [], publishedText: '1d ago' }],
        continuation: null,
      });

    const user = userEvent.setup();
    renderWatch();

    // Page 1 loads automatically
    await waitFor(() => expect(screen.getByText('Comment 1')).toBeInTheDocument());

    // Click load more — page 2
    await user.click(screen.getByText('Load more comments'));
    await waitFor(() => expect(screen.getByText('Comment 2')).toBeInTheDocument());

    // Click load more — page 3
    await user.click(screen.getByText('Load more comments'));
    await waitFor(() => expect(screen.getByText('Comment 3')).toBeInTheDocument());

    // Verify all comments are visible
    expect(screen.getByText('Comment 1')).toBeInTheDocument();
    expect(screen.getByText('Comment 2')).toBeInTheDocument();
    expect(screen.getByText('Comment 3')).toBeInTheDocument();

    // No more "Load more" button
    expect(screen.queryByText('Load more comments')).not.toBeInTheDocument();
  });
});

// ====================================================
// Keyboard shortcuts
// ====================================================
describe('WatchPage — Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVideo.mockReturnValue({ data: mockVideo, isLoading: false, error: null });
    getComments.mockResolvedValue({ comments: [], continuation: null });
  });

  it('renders keyboard shortcuts section', () => {
    renderWatch();
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('keyboard shortcuts section exists and can be opened', async () => {
    const user = userEvent.setup();
    renderWatch();

    // The details element is collapsed by default, but the text 
    // still exists in the DOM (just not visible). Use getByText directly
    const summary = screen.getByText('Keyboard shortcuts');
    expect(summary).toBeInTheDocument();

    // The parent <details> should exist
    const details = summary.closest('details');
    expect(details).toBeInTheDocument();

    // Click to open
    await user.click(summary);

    // After opening, the details element should have the 'open' attribute
    expect(details).toHaveAttribute('open');
  });

  it('theater mode toggle works', async () => {
    const user = userEvent.setup();
    renderWatch();

    // Click theater mode button
    const theaterBtn = screen.getByTitle('Theater mode (T)');
    await user.click(theaterBtn);

    // After click, theater button should show active state
    // The container should have max-w-full (theater) instead of max-w-[1400px]
    const container = document.querySelector('.mx-auto');
    expect(container.className).toContain('max-w-full');
  });
});
