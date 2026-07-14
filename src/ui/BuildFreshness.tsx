import { useCallback, useEffect, useState } from 'react';

const FRESHNESS_CHECK_MS = 60_000;

export function deployedEntryPath(html: string, baseUrl: string): string | null {
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  for (const script of scripts) {
    if (!/\btype\s*=\s*(?:["']module["']|module)(?:\s|>)/i.test(script)) continue;
    const source = script.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const value = source?.[1] ?? source?.[2] ?? source?.[3];
    if (!value) continue;
    try {
      return new URL(value, baseUrl).pathname;
    } catch {
      return null;
    }
  }
  return null;
}

export function entryIsStale(currentEntry: string, deployedHtml: string, baseUrl: string): boolean {
  const deployedEntry = deployedEntryPath(deployedHtml, baseUrl);
  return deployedEntry !== null && deployedEntry !== currentEntry;
}

export default function BuildFreshness() {
  const [updateReady, setUpdateReady] = useState(false);
  const currentEntry = new URL(import.meta.url).pathname;

  const checkForUpdate = useCallback(async () => {
    if (import.meta.env.DEV || updateReady) return;
    try {
      const response = await fetch(`/?freshness=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'text/html' },
      });
      if (!response.ok) return;
      const html = await response.text();
      if (entryIsStale(currentEntry, html, response.url)) setUpdateReady(true);
    } catch {
      // A lost connection should never interrupt the simulation. The interval
      // and focus listeners will try again when the course is reachable.
    }
  }, [currentEntry, updateReady]);

  useEffect(() => {
    document.documentElement.dataset.buildEntry = currentEntry;
    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), FRESHNESS_CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkForUpdate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkForUpdate, currentEntry]);

  if (!updateReady) return null;
  return (
    <aside className="buildUpdateNotice" role="status" aria-live="polite">
      <span><b>Course update ready</b><small>Reload to replace the old controls with the latest build.</small></span>
      <button type="button" onClick={() => window.location.reload()}>Reload now</button>
    </aside>
  );
}
