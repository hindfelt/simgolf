import { useEffect, useRef } from 'react';
import { useUI, type TickerItem } from './store';
import CharacterPortrait from './CharacterPortrait';

const LIFETIME = 8200;

export function selectSimFotoTicker(tickers: readonly TickerItem[]): TickerItem | null {
  for (let index = tickers.length - 1; index >= 0; index--) {
    if (tickers[index].character) return tickers[index];
  }
  return null;
}

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

  const simFoto = selectSimFotoTicker(tickers);

  return (
    <div className="ticker" aria-live="polite" aria-label="Course activity">
      {simFoto?.character ? (
        <article className={'simFotoTicker' + (simFoto.cls ? ' ' + simFoto.cls : '')}>
          <CharacterPortrait
            name={simFoto.name}
            identity={simFoto.character.identity}
            shirt={simFoto.character.shirt}
            skin={simFoto.character.skin}
            cap={simFoto.character.cap}
            expression={simFoto.character.expression}
            variant="simfoto"
          />
          <div className="simFotoCopy"><b>{simFoto.name}</b><span>{simFoto.txt}</span></div>
        </article>
      ) : null}
      {tickers.map((t) => (
        t.id === simFoto?.id ? null :
        <div key={t.id} className={'tk' + (t.cls ? ' ' + t.cls : '')}>
          {t.name ? <b>{t.name}: </b> : null}
          {t.txt}
        </div>
      ))}
    </div>
  );
}
