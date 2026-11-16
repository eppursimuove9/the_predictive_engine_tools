// Tiny History API router (no dependency). Routes: "/" and "/tools/<slug>".
import { useEffect, useState, useCallback } from 'react';

const EVENT = 'tpe:navigate';
const currentPath = () => {
  try { return window.location.pathname.replace(/\/+$/, '') || '/'; } catch { return '/'; }
};

export function navigate(to) {
  try {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new Event(EVENT));
    window.scrollTo(0, 0);
  } catch { window.location.href = to; }
}

export function usePath() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const sync = () => setPath(currentPath());
    window.addEventListener('popstate', sync);
    window.addEventListener(EVENT, sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener(EVENT, sync); };
  }, []);
  return path;
}

export function Link({ to, children, className, onClick, ...rest }) {
  const handle = useCallback((e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  }, [to, onClick]);
  return <a href={to} onClick={handle} className={className} {...rest}>{children}</a>;
}
