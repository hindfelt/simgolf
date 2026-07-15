import { useEffect, useRef } from 'react';
import { useUI, type TickerItem } from './store';
import CharacterPortrait from './CharacterPortrait';
import type { GameMode } from '../game/types';
import { SPECIAL_GUESTS } from '../game/specialGuests';

const LIFETIME = 8200;

export function selectSimFotoTicker(tickers: readonly TickerItem[], mode: GameMode = 'build'): TickerItem | null {
  if (mode === 'play') return null;
  for (let index = tickers.length - 1; index >= 0; index--) {
    if (tickers[index].character) return tickers[index];
  }
  return null;
}

export default function Ticker() {
  const tickers = useUI((s) => s.tickers);
  const mode = useUI((s) => s.mode);
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

  // During a round the original game kept course chatter as light world text;
  // the portrait card would compete with aiming, wind, and the shot console.
  const simFoto = selectSimFotoTicker(tickers, mode);
  const specialGuest = simFoto?.character
    ? Object.values(SPECIAL_GUESTS).find((guest) => guest.visual.identity === simFoto.character?.identity)
    : undefined;
  const simFotoName = specialGuest?.name ?? simFoto?.name;

  return (
    <div className="ticker" aria-live="polite" aria-label="Course activity">
      {simFoto?.character ? (
        <article className={'simFotoTicker' + (simFoto.cls ? ' ' + simFoto.cls : '')} data-special-guest={specialGuest?.kind}>
          <CharacterPortrait
            name={simFotoName ?? simFoto.name}
            {...simFoto.character}
            variant="simfoto"
          />
          <div className="simFotoCopy">
            <b>{simFotoName}</b>
            {specialGuest ? <small>{specialGuest.title}</small> : null}
            <span>{simFoto.txt}</span>
          </div>
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
