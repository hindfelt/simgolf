import { useCallback, useRef } from 'react';
import { useUI } from './store';
import { S } from '../game/state';
import Icon from './Icon';
import { financialYearAt } from '../game/finance';
import { membershipActive } from '../game/memberships';
import { fmt$ } from '../game/rng';
import CharacterPortrait from './CharacterPortrait';
import { useFloatingPanelFocus } from './panelA11y';

const STAT_LABEL: { key: 'length' | 'accuracy' | 'imagination'; label: string }[] = [
  { key: 'length', label: 'Length' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'imagination', label: 'Imagination' },
];

export default function RegularsPanel() {
  const open = useUI((s) => s.regularsPanel);
  useUI((s) => s.simTick); // subscribe so visit counts / relations stay live while open
  const setStore = useUI((s) => s.set);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setStore({ regularsPanel: false }), [setStore]);
  useFloatingPanelFocus(open, panelRef, close);
  if (!open) return null;

  const onCourse = new Set(S.golfers.map((g) => g.name));
  const year = financialYearAt(S.time);
  const roster = S.regulars.slice().sort((a, b) => b.visits - a.visits);

  return (
    <section className="managementPanel reportsPanel" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="regulars-title" tabIndex={-1}>
      <header className="panelHead">
        <div className="panelTitleMark"><Icon name="regulars" size={22} /></div>
        <div>
          <h2 id="regulars-title">Regulars</h2>
          <p>The club's named cast — {roster.length} on the books</p>
        </div>
        <button className="iconButton panelClose" aria-label="Close regulars roster" onClick={close}>
          <Icon name="close" size={16} />
        </button>
      </header>

      {roster.length === 0 && <p className="commentEmpty">Nobody's visited yet — open the gates and give it a minute.</p>}

      <div className="regularsList">
        {roster.map((r) => (
          <div className="regularCard" key={r.name}>
            <CharacterPortrait name={r.name} shirt={r.shirt} skin={r.skin} cap={r.cap} className={onCourse.has(r.name) ? 'onCourse' : ''} />
            <div className="regularCardBody">
              <div className="regularHead">
                <b className={onCourse.has(r.name) ? 'regularOnCourse' : ''}>{r.name}</b>
                {membershipActive(r.membership, year) && (
                  <span className="regularTag regularMember" title={r.membership?.tier === 'lifetime' ? 'Lifetime member' : `Annual member through year ${r.membership?.expiresYear}`}>
                    {r.membership?.tier === 'lifetime' ? 'Lifetime' : 'Member'}
                  </span>
                )}
                {r.celebrity && <span className="regularTag regularCeleb" title="Local celebrity">🌟</span>}
                {r.relation && (
                  <span className={`regularTag regular-${r.relation.type}`} title={`${r.relation.type} of ${r.relation.withName}`}>
                    {r.relation.type === 'rival' ? '⚔️' : '💛'} {r.relation.withName}
                  </span>
                )}
                <span className="regularVisits">{r.visits} visit{r.visits === 1 ? '' : 's'} · {r.holesPlayed ?? 0} holes · {fmt$(r.lifetimeSpend ?? 0)}</span>
              </div>
              <div className="regularStats">
                {STAT_LABEL.map(({ key, label }) => (
                  <div className="regularStat" key={key}>
                    <span>{label}</span>
                    <div className="regularStatBar" role="meter" aria-label={`${r.name} ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r[key] * 100)}>
                      <i style={{ width: `${Math.round(r[key] * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
