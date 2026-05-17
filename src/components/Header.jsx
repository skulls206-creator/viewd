import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSubscriptions } from '../lib/store.js';

export default function Header({ onToggleSidebar }) {
  const [query, setQuery] = useState('');
  const [showSubs, setShowSubs] = useState(false);
  const [subs, setSubs] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const subRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (subRef.current && !subRef.current.contains(e.target)) setShowSubs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setSubs(getSubscriptions());
  }, [showSubs]);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)]" style={{ backdropFilter: 'blur(12px)', background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)'}}>
      <div className="flex items-center justify-between h-14 px-4 max-w-[1800px] mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <Link to="/" className="flex items-center gap-1.5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-primary)"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
            <span className="text-lg font-semibold tracking-tight text-[var(--color-text)]">VIEWD</span>
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          className="hidden sm:flex flex-1 max-w-[600px] mx-4"
        >
          <div className="flex w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-l-full bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] text-sm"
            />
            <button type="submit" className="px-5 border border-l-0 border-[var(--color-border)] rounded-r-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link to="/subscriptions" className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </Link>
          <Link to="/settings" className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
          }
        }}
        className="sm:hidden px-4 pb-3"
      >
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos..."
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-l-full bg-[var(--color-surface)] text-[var(--color-text)] outline-none text-sm"
          />
          <button type="submit" className="px-4 border border-l-0 border-[var(--color-border)] rounded-r-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </form>
    </header>
  );
}
