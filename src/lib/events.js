// Event bus for instance changes (auto-failover, manual switch)
const listeners = new Set();

export function onInstanceChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitInstanceChange(oldUrl, newUrl) {
  listeners.forEach((fn) => fn(oldUrl, newUrl));
}
