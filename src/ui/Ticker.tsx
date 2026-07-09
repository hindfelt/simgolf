import { useEffect, useRef } from 'react';
import { useUI } from './store';

const LIFETIME = 8200;

export default function Ticker() {
  const tickers = useUI((s) => s.tickers);
  const dropTicker = useUI((s) => s.dropTicker);
  const scheduled = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const t of tickers) {
      if (scheduled.current.has(t.id)) continue;
      scheduled.current.add(t.id);
      window.setTimeout(() => {
        dropTicker(t.id);
        scheduled.current.delete(t.id);
      }, LIFETIME);
    }
  }, [tickers, dropTicker]);

  return (
    <div className="ticker" aria-live="polite" aria-label="Course activity">
      {tickers.map((t) => (
        <div key={t.id} className={'tk' + (t.cls ? ' ' + t.cls : '')}>
          {t.name ? <b>{t.name}: </b> : null}
          {t.txt}
        </div>
      ))}
    </div>
  );
}
