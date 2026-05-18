import { useState, useEffect } from 'react';
import { getTheme, setTheme, applyTheme, getSavedInstance, saveInstance } from '../lib/store.js';
import { getInstance, setInstance as setApiInstance, fetchInstances, checkHealth } from '../lib/invidious.js';
import { useInstances, useHealthCheck } from '../hooks/useInvidious.js';

export default function SettingsPage() {
  const [theme, setThemeState] = useState(getTheme());
  const [copied, setCopied] = useState(false);
  const [apiInstances, setApiInstances] = useState(getInstance());
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState(null);
  const [customInstance, setCustomInstance] = useState('');
  const { data: publicInstances } = useInstances();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleThemeChange(t) {
    setThemeState(t);
    setTheme(t);
  }

  function handleInstanceSelect(url) {
    setApiInstances(url);
    setApiInstance(url);
    saveInstance(url);
    setHealthResult(null);
  }

  function handleCustomInstance() {
    const url = customInstance.trim().replace(/\/+$/, '');
    if (!url) return;
    setApiInstances(url);
    setApiInstance(url);
    saveInstance(url);
    setCustomInstance('');
    setHealthResult(null);
  }

  async function testCurrentHealth() {
    setTestingHealth(true);
    setHealthResult(null);
    const ok = await checkHealth(apiInstances);
    setHealthResult(ok ? 'healthy' : 'unreachable');
    setTestingHealth(false);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[700px] mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-8">Settings</h1>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Appearance</h2>
        <div className="flex gap-3">
          {['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                theme === t
                  ? 'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {t === 'light' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : t === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                )}
                <span className="capitalize">{t}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Instance */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Invidious Instance</h2>
        <div className="mb-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Current instance</p>
          <div className="relative">
            <p
              className="text-sm font-mono text-[var(--color-text)] break-all cursor-pointer hover:text-[var(--color-primary)]"
              onClick={() => {
                navigator.clipboard.writeText(apiInstances);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Click to copy"
            >
              {apiInstances}
            </p>
            {copied && (
              <span className="absolute -top-1 right-0 text-[10px] font-medium text-green-500">
                Copied!
              </span>
            )}
          </div>
          <button
            onClick={testCurrentHealth}
            disabled={testingHealth}
            className="mt-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
          >
            {testingHealth ? 'Testing...' : 'Test connection'}
          </button>
          {healthResult && (
            <p className={`mt-2 text-xs ${healthResult === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>
              {healthResult === 'healthy' ? 'Instance is reachable' : 'Instance is unreachable'}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Public CORS-enabled instances
          </p>
          {publicInstances?.length > 0 ? (
            <div className="space-y-2">
              {publicInstances.slice(0, 20).map((inst) => (
                <button
                  key={inst.url}
                  onClick={() => handleInstanceSelect(inst.url)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                    apiInstances === inst.url
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[var(--color-text)] truncate text-xs">{inst.url}</span>
                    {inst.flag && <span className="text-xs text-[var(--color-text-secondary)]">{inst.flag}</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-text-secondary)] py-4">Loading public instances...</div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Custom instance
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInstance}
              onChange={(e) => setCustomInstance(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomInstance()}
              placeholder="https://..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] outline-none"
            />
            <button
              onClick={handleCustomInstance}
              disabled={!customInstance.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-text)] text-[var(--color-bg)] text-sm font-medium disabled:opacity-40"
            >
              Set
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">About</h2>
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-sm text-[var(--color-text)] font-medium">VIEWD</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            A modern, privacy-first YouTube alternative frontend powered by the Invidious API.
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
            All subscriptions and playlists are stored locally in your browser.
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-3 pt-3 border-t border-[var(--color-border)]">
            Build: <span className="font-mono">{__APP_VERSION__}</span>
          </p>
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">Data</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (window.confirm('Clear your watch history?')) {
                localStorage.removeItem('viewd_history');
                alert('History cleared.');
              }
            }}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            Clear watch history
          </button>
          <button
            onClick={() => {
              if (window.confirm('This will clear all subscriptions, playlists, and settings. Are you sure?')) {
                localStorage.removeItem('viewd_store');
                localStorage.removeItem('viewd_instance');
                window.location.reload();
              }
            }}
            className="px-4 py-2 rounded-lg border border-red-500 text-sm text-red-500 hover:bg-red-500/10"
          >
            Clear all local data
          </button>
        </div>
      </section>
    </div>
  );
}
