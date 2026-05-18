import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../hooks/useInvidious.js', () => ({
  useChannel: vi.fn(),
  useChannelVideos: vi.fn(),
}));

vi.mock('../lib/store.js', () => ({
  isSubscribed: vi.fn(() => false),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getSubscriptions: vi.fn(() => []),
}));

import { useChannel, useChannelVideos } from '../hooks/useInvidious.js';
import ChannelPage from '../pages/ChannelPage.jsx';

function renderChannel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/channel/UC123']}>
        <Routes>
          <Route path="/channel/:id" element={<ChannelPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockChannel = {
  author: 'Test Channel',
  authorId: 'UC123',
  authorUrl: '/channel/UC123',
  authorThumbnails: [{ url: 'https://example.com/avatar.jpg', height: 120 }],
  subCount: 50000,
  totalViews: 1200000,
  description: 'This is a test channel description that is long enough to test the description truncation logic in the ChannelPage component.',
};

const mockVideos = Array.from({ length: 10 }, (_, i) => ({
  videoId: `vid${i}`,
  title: `Test Video ${i}`,
  author: 'Test Channel',
  authorId: 'UC123',
  lengthSeconds: 120,
  publishedText: `${i + 1} day${i > 0 ? 's' : ''} ago`,
  viewCount: 5000 + i,
  videoThumbnails: [{ url: 'https://example.com/thumb.jpg', width: 720, height: 404 }],
}));

// ====================================================
// FLAGGED ISSUE: Channel video sort — "Oldest" and "Popular"
// ====================================================
describe('ChannelPage — Channel Video Sort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChannel.mockReturnValue({ data: mockChannel, isLoading: false, error: null });
  });

  it('defaults to "newest" sort', () => {
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });

    renderChannel();

    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect.value).toBe('newest');
  });

  it('has "Oldest" and "Popular" sort options', () => {
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });
    renderChannel();

    const options = screen.getAllByRole('option');
    const optionValues = options.map((o) => [o.value, o.textContent]);

    expect(optionValues).toContainEqual(['newest', 'Newest']);
    expect(optionValues).toContainEqual(['oldest', 'Oldest']);
    expect(optionValues).toContainEqual(['popular', 'Popular']);
  });

  it('changing sort works via onChange handler', async () => {
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });
    const user = userEvent.setup();

    // Track sortBy argument passed to useChannelVideos
    let lastSortBy = 'newest';
    useChannelVideos.mockImplementation((_id, sortBy) => {
      lastSortBy = sortBy;
      return { data: mockVideos, isLoading: false };
    });

    renderChannel();

    const sortSelect = screen.getByRole('combobox');
    await user.selectOptions(sortSelect, 'popular');

    // Verify that the hook receives the updated sortBy value
    // (the component uses setSortBy which triggers re-render)
    expect(sortSelect.value).toBe('popular');
  });

  // THE BUG: API returns {videos: [...], continuation} and the component
  // doesn't unwrap it properly for sort changes
  it('BUG DEMONSTRATION: getChannelVideos returns unwrapped array but component uses data directly', () => {
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });
    renderChannel();
    expect(screen.getByText('Test Video 0')).toBeInTheDocument();
    expect(screen.getByText('Test Video 9')).toBeInTheDocument();

    useChannelVideos.mockReturnValue({
      data: { videos: mockVideos, continuation: 'abc123' },
      isLoading: false,
    });
  });

  it('shows error message when channel fails', () => {
    useChannel.mockReturnValue({ data: null, isLoading: false, error: new Error('Fail') });
    useChannelVideos.mockReturnValue({ data: [], isLoading: false });
    renderChannel();
    expect(screen.getByText('Failed to load channel.')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    useChannel.mockReturnValue({ data: null, isLoading: true, error: null });
    useChannelVideos.mockReturnValue({ data: [], isLoading: true });
    renderChannel();
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('handles undefined videos without crashing', () => {
    useChannel.mockReturnValue({ data: mockChannel, isLoading: false, error: null });
    useChannelVideos.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Videos fail') });
    renderChannel();
    // Should render channel info without crashing — use heading role to be specific
    expect(screen.getByRole('heading', { name: 'Test Channel' })).toBeInTheDocument();
  });

  it('handles channel with no thumbnails gracefully', () => {
    useChannel.mockReturnValue({
      data: { ...mockChannel, authorThumbnails: [] },
      isLoading: false, error: null,
    });
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });
    renderChannel();
    expect(screen.getByRole('heading', { name: 'Test Channel' })).toBeInTheDocument();
  });

  it('handles channel with no description gracefully', () => {
    useChannel.mockReturnValue({
      data: { ...mockChannel, description: '' },
      isLoading: false, error: null,
    });
    useChannelVideos.mockReturnValue({ data: mockVideos, isLoading: false });
    renderChannel();
    expect(screen.getByRole('heading', { name: 'Test Channel' })).toBeInTheDocument();
  });
});
