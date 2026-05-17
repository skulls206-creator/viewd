import { useState, useEffect } from 'react';
import { onInstanceChange } from '../lib/invidious.js';

export default function InstanceBanner() {
  const [changed, setChanged] = useState(null);

  useEffect(() => {
    return onInstanceChange((oldUrl, newUrl) => {
      setChanged({ oldUrl, newUrl });
    });
  }, []);

  if (!changed) return null;

  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>
          The previous instance (<span className="font-mono text-xs">{changed.oldUrl}</span>) was unreachable. Auto-switched to <span className="font-mono text-xs">{changed.newUrl}</span>.
        </span>
      </div>
      <button
        onClick={() => setChanged(null)}
        className="shrink-0 text-amber-600 dark:text-amber-400 hover:opacity-70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}
