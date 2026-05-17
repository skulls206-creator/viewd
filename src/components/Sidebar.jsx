import { Link, useLocation } from 'react-router-dom';
import { getSubscriptions } from '../lib/store.js';
import { useState, useEffect } from 'react';
import { getBestAvatar } from '../lib/utils.js';

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    setSubs(getSubscriptions());
  }, [open, location]);

  const navItems = [
    { path: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/trending', label: 'Trending', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { path: '/subscriptions', label: 'Subscriptions', icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
  ];

  const overlay = (
    <div
      className="fixed inset-0 bg-black/40 z-40 md:hidden"
      onClick={onClose}
    />
  );

  return (
    <>
      {open && overlay}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-[var(--color-bg)] border-r border-[var(--color-border)] transition-transform duration-200 md:translate-x-0 md:static md:z-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center h-14 px-4 border-b border-[var(--color-border)] md:hidden">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <nav className="py-3">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-4 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon}/>
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {subs.length > 0 && (
          <>
            <div className="px-5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Subscriptions
            </div>
            <div className="py-1">
              {subs.map((sub) => (
                <Link
                  key={sub.ucid}
                  to={`/channel/${sub.ucid}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                >
                  {sub.authorThumbnails && sub.authorThumbnails.length > 0 ? (
                    <img
                      src={getBestAvatar(sub.authorThumbnails)}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--color-surface)]" />
                  )}
                  <span className="truncate">{sub.author}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
