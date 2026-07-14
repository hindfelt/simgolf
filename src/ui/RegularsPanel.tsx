import { useCallback, useRef } from 'react';
import { useUI } from './store';
import { S } from '../game/state';
import Icon from './Icon';
import { financialYearAt } from '../game/finance';
import { membershipActive } from '../game/memberships';
import { fmt$ } from '../game/rng';
import CharacterPortrait from './CharacterPortrait';
import { useFloatingPanelFocus } from './panelA11y';
import { REGULAR_SKILL_FACILITY, regularTrainingRates } from '../game/regularTraining';
import { centerOnGolfer, selectGolfer, setTool } from '../game/engine';

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
  const onCourseByName = new Map(S.golfers.map((golfer) => [golfer.name, golfer]));
  const year = financialYearAt(S.time);
  const roster = S.regulars.slice().sort((a, b) => b.visits - a.visits);
  const campus = regularTrainingRates(S.buildings);

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

      <div className="regularTrainingCampus" role="region" aria-label="Golfer practice campus">
        <div><small>PLAYER DEVELOPMENT</small><b>Practice campus</b><span>Skills improve after every completed hole</span></div>
        {STAT_LABEL.map(({ key, label }) => {
          const facility = REGULAR_SKILL_FACILITY[key];
          const rate = campus[key];
          return (
            <span className={rate ? 'active' : ''} key={key} aria-label={`${facility.name}, trains ${label}, ${rate ? `${rate} practice per hole` : 'not built or offline'}`}>
              <i aria-hidden="true">{facility.mark}</i><b>{facility.name}</b><small>{rate ? `+${rate} / HOLE` : 'OFFLINE'}</small>
            </span>
          );
        })}
      </div>

      {roster.length === 0 && <p className="commentEmpty">Nobody's visited yet — open the gates and give it a minute.</p>}

      <div className="regularsList">
        {roster.map((r) => (
          <div className="regularCard" key={r.name}>
            <CharacterPortrait
              name={r.name}
              shirt={r.shirt}
              skin={r.skin}
              cap={r.cap}
              expression={onCourse.has(r.name) ? 'pleased' : 'neutral'}
              className={onCourse.has(r.name) ? 'onCourse' : ''}
            />
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
                {!!r.training?.holes && <span className="regularTag regularTrainingTag" title={`${r.training.holes} holes trained at club practice facilities`}>Academy {r.training.holes}</span>}
                <span className="regularVisits">{r.visits} visit{r.visits === 1 ? '' : 's'} · {r.holesPlayed ?? 0} holes · {fmt$(r.lifetimeSpend ?? 0)}</span>
              </div>
              <div className="regularStats">
                {STAT_LABEL.map(({ key, label }) => (
                  <div className="regularStat" key={key}>
                    <span>{label}{(r.training?.gained[key] ?? 0) > 0 && <em>+{r.training!.gained[key]}% trained</em>}</span>
                    <div className="regularSkillTracks">
                      <div className="regularStatBar" role="meter" aria-label={`${r.name} ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r[key] * 100)}>
                        <i style={{ width: `${Math.round(r[key] * 100)}%` }} />
                      </div>
                      <div className="regularPracticeBar" role="progressbar" aria-label={`${r.name} ${label} practice ${r.training?.progress[key] ?? 0} percent toward the next skill point`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.training?.progress[key] ?? 0}>
                        <i style={{ width: `${r.training?.progress[key] ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {onCourseByName.has(r.name) && (
                <button
                  className="regularLocate"
                  onClick={() => {
                    const golfer = onCourseByName.get(r.name)!;
                    setTool('inspect');
                    selectGolfer(golfer);
                    centerOnGolfer(golfer);
                    setStore({ regularsPanel: false });
                  }}
                >
                  <Icon name="pan" size={14} /> View {r.name} on the course
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
