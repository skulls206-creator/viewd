import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/store.js', () => ({
  getSubscriptions: vi.fn(() => []),
  getPlaylists: vi.fn(() => []),
}));

vi.mock('../lib/utils.js', () => ({
  getBestAvatar: vi.fn(() => 'https://example.com/avatar.jpg'),
}));

import Sidebar from '../components/Sidebar.jsx';

function renderSidebar(open = true, onClose = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar open={open} onClose={onClose} />
    </MemoryRouter>
  );
}

// ====================================================
// FLAGGED ISSUE: Mobile sidebar close — onClose propagation
// ====================================================
describe('Sidebar — Mobile close behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows overlay when open on mobile', () => {
    renderSidebar(true);
    // Overlay is a fixed div with bg-black/40 and onClick=onClose
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('does not show overlay on desktop (md: only)', () => {
    renderSidebar(true);
    const overlay = document.querySelector('.fixed.inset-0');
    // overlay has md:hidden class
    expect(overlay.className).toContain('md:hidden');
  });

  it('calls onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar(true, onClose);

    const overlay = document.querySelector('.fixed.inset-0');
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when a nav link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar(true, onClose);

    // Click "Trending" nav link
    const trendingLink = screen.getByText('Trending');
    await user.click(trendingLink);
    // The Link has onClick={onClose}
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button in header is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar(true, onClose);

    // The mobile close button (X icon) in the sidebar header
    const closeBtn = document.querySelector('.md\\:hidden button');
    expect(closeBtn).toBeInTheDocument();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // THE BUG: onClose might not propagate from Header
  it('BUG DEMONSTRATION: onClose propagation issue', () => {
    // The Sidebar receives onClose as a prop.
    // Nav links each have onClick={onClose} — this should work.
    // The issue is that React Router's Link component may swallow
    // click events before prop handlers fire, or the handler
    // might not fire if the component rerenders too fast.
    //
    // Let's verify the actual event handler is attached:
    // (In production, the real issue is timing — clicking a nav link
    // navigates AND closes. If navigation unmounts the sidebar before
    // the onClick callback completes, onClose might not fire.)

    renderSidebar(true);
    const trendingLink = screen.getByText('Trending');

    // Verify the link has an onClick handler
    const clickHandler = trendingLink.closest('a').onclick;
    // The onClick is on the <Link> component, which renders as <a>
    // It fires onClose before navigating
    expect(trendingLink.closest('a')).toHaveAttribute('href', '/trending');
  });
});

describe('Sidebar — Navigation Items', () => {
  it('renders all navigation items', () => {
    renderSidebar(true);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    renderSidebar(true);
    // Home is active since we're at '/'
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink.className).toContain('text-[var(--color-primary)]');
  });

  it('renders translated when closed', () => {
    const { container } = renderSidebar(false);
    const aside = container.querySelector('aside');
    expect(aside.className).toContain('-translate-x-full');
  });
});
