import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import InstanceBanner from './components/InstanceBanner.jsx';
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import WatchPage from './pages/WatchPage.jsx';
import ChannelPage from './pages/ChannelPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { applyTheme, getTheme } from './lib/store.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <InstanceBanner />
          <div className="flex">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/watch" element={<WatchPage />} />
                <Route path="/channel/:id" element={<ChannelPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}
