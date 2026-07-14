import { useEffect, useRef, useState } from 'react';
import { useUI } from './store';
import { fmt$ } from '../game/rng';
import { listSlots, saveToSlot, loadFromSlot, deleteSlot, exportSaveText, importSaveText, setCourseTheme, acceptLandOffer, declineLandOffer, selectBuilding, type SlotInfo } from '../game/engine';
import type { PropertyId } from '../game/types';
import { S } from '../game/state';
import { PH, PW } from '../game/constants';
import Scorecard from './Scorecard';
import { submitChallengeRound, submitCompetitionRound } from '../online/api';
import { relativeScoreLabel } from '../game/scorecards';
import { propertyById } from '../game/properties';
import CharacterPortrait from './CharacterPortrait';
import { PRO_PRACTICE_THRESHOLD, PRO_SKILLS, type ProPracticeResult } from '../game/proCircuit';
import WorldScreen from './WorldScreen';

const SLOT_IDS = ['A', 'B', 'C'];
const THEMES = [
  { id: 'parklands', label: 'Parklands', blurb: 'Soft woodland, rolling greens and generous lakes.' },
  { id: 'links', label: 'Links', blurb: 'Wind-cut dunes, sandy rough and coastal color.' },
  { id: 'desert', label: 'Desert', blurb: 'Red rock, dry scrub and precious ribbons of turf.' },
  { id: 'tropical', label: 'Tropical', blurb: 'Bright water, dense palms and lush fairways.' },
] as const;

function DestinationUnlockBanner({ propertyIds, openWorld }: { propertyIds?: readonly PropertyId[]; openWorld: () => void }) {
  if (!propertyIds?.length) return null;
  const properties = propertyIds.map(propertyById);
  return (
    <aside className="destinationUnlock" aria-label={`${properties.length} new world ${properties.length === 1 ? 'destination' : 'destinations'} unlocked`}>
      <span className="destinationSeal" aria-hidden="true">✦</span>
      <div><small>NEW DESTINATION {properties.length === 1 ? 'RELEASED' : 'RELEASES'}</small><b>{properties.map((property) => property.name).join(' · ')}</b><p>Your latest result cleared the permanent career milestones. The current resort bank still funds each deed purchase.</p></div>
      <button type="button" onClick={openWorld}>Open World Screen</button>
    </aside>
  );
}

function PracticeProgress({ result }: { result?: ProPracticeResult }) {
  if (!result?.gains.length) return null;
  const gains = result.gains.slice(0, 5);
  const levelUps = result.gains.reduce((sum, gain) => sum + gain.levels, 0);
  return (
    <aside className="practiceProgress" aria-label={`Resident pro practice, ${levelUps} skill ${levelUps === 1 ? 'level' : 'levels'} earned`}>
      <div className="practiceProgressHead">
        <span aria-hidden="true">🏌</span>
        <div><small>PRACTICE ROUND {result.practiceRound}</small><b>{levelUps ? `${levelUps} skill ${levelUps === 1 ? 'level' : 'levels'} earned` : `${result.holes} ${result.holes === 1 ? 'hole' : 'holes'} of focused training`}</b></div>
        <em>{result.facilities.length ? `${result.facilities.join(' · ')} boost` : 'Build practice facilities for faster growth'}</em>
      </div>
      <div className="practiceGainList">
        {gains.map((gain) => {
          const skill = PRO_SKILLS.find((definition) => definition.id === gain.id)!;
          return (
            <div key={gain.id} className={gain.levels ? 'leveled' : ''}>
              <span><b>{skill.label}</b><small>+{gain.earned} practice</small></span>
              <i role="progressbar" aria-label={`${skill.label}, ${gain.progress} percent toward next level`} aria-valuemin={0} aria-valuemax={PRO_PRACTICE_THRESHOLD} aria-valuenow={gain.progress}><em style={{ width: `${gain.progress}%` }} /></i>
              <strong>{gain.levels ? `LEVEL ${gain.level}` : `${gain.progress}%`}</strong>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function LandOfferPanel({ close }: { close: () => void }) {
  useUI((state) => state.simTick);
  const offer = S.specialVisitors.landOffer;
  return (
    <>
      <div className="guestHeading pickyHeading"><CharacterPortrait name="I.M. Picky" shirt="#71845d" skin="#d9aa7c" cap="#d0ad58" expression="cross" variant="simfoto" className="guestPortrait" /><div><h1 id="modal-title">County land offer</h1><div className="tag">I.M. Picky · County Commissioner</div></div></div>
      {offer ? (
        <>
          <p>Your course passed inspection. Choose any adjoining highlighted plot before the offer expires.</p>
          <div className="offerMeta"><b>{fmt$(offer.price)} per plot</b><span>{Math.ceil(offer.remaining)} sim-seconds remaining</span></div>
          <div className="parcelOfferGrid" style={{ gridTemplateColumns: `repeat(${PW}, 1fr)` }} aria-label="County parcel selection">
            {Array.from({ length: PW * PH }, (_, parcel) => {
              const owned = !!S.owned[parcel];
              const available = offer.parcelIndices.includes(parcel);
              return (
                <button key={parcel} disabled={!available} className={owned ? 'owned' : available ? 'available' : 'locked'} onClick={() => acceptLandOffer(parcel)}>
                  <b>{String.fromCharCode(65 + (parcel % PW))}{Math.floor(parcel / PW) + 1}</b>
                  <span>{owned ? 'OWNED' : available ? fmt$(offer.price) : '—'}</span>
                </button>
              );
            })}
          </div>
          <button className="bigbtn" onClick={close}>Decide on the course map</button>
          <button className="textBtn dangerText" onClick={declineLandOffer}>Decline this selection</button>
        </>
      ) : <><p>The county offer is no longer available.</p><button className="bigbtn" onClick={close}>Back to the course</button></>}
    </>
  );
}

function SavesPanel({ close }: { close: () => void }) {
  const [slots, setSlots] = useState<SlotInfo[]>(() => listSlots());
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => setSlots(listSlots());

  const handleSave = (id: string) => {
    const existing = slots.find((s) => s.id === id);
    const name = window.prompt('Name this save:', existing?.name ?? 'My course');
    if (name == null) return;
    saveToSlot(id, name);
    refresh();
  };
  const handleLoad = (id: string) => {
    if (loadFromSlot(id)) close();
  };
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This can't be undone.`)) {
      deleteSlot(id);
      refresh();
    }
  };
  const handleExport = () => {
    const blob = new Blob([exportSaveText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fairway-mogul-course.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && importSaveText(reader.result)) close();
    };
    reader.readAsText(file);
  };

  return (
    <>
      <h1 id="modal-title">Save & load</h1>
      <div className="tag">Three named slots, plus export to a file</div>
      <div className="saveSlots">
        {SLOT_IDS.map((id) => {
          const info = slots.find((s) => s.id === id);
          return (
            <div className="saveSlotRow" key={id}>
              <div className="saveSlotInfo">
                <b>{id}</b>
                {info ? (
                  <span>
                    {info.name} — {info.holes} hole{info.holes === 1 ? '' : 's'}, {fmt$(info.cash)}, {new Date(info.savedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="dim">Empty</span>
                )}
              </div>
              <div className="saveSlotActions">
                <button onClick={() => handleSave(id)}>Save</button>
                <button disabled={!info} onClick={() => handleLoad(id)}>Load</button>
                <button disabled={!info} onClick={() => info && handleDelete(id, info.name)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="bigbtn" onClick={handleExport}>
        ⬇️ Export current course to a file
      </button>
      <button className="bigbtn" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
        ⬆️ Import a course from a file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = '';
        }}
      />
      <button className="bigbtn" style={{ background: '#5d6d7e', marginTop: 8 }} onClick={close}>
        Close
      </button>
    </>
  );
}

export default function Modals() {
  const modal = useUI((s) => s.modal);
  const setStore = useUI((s) => s.set);
  const courseTheme = useUI((s) => s.courseTheme);
  useUI((s) => s.simTick);
  const [submission, setSubmission] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(modal.kind === 'newCourse' && modal.initial)) setStore({ modal: null });
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === modalRef.current || document.activeElement === first || !modalRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === modalRef.current || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [modal, setStore]);
  useEffect(() => setSubmission('idle'), [modal]);
  if (!modal) return null;

  const close = () => setStore({ modal: null });

  return (
    <div
      className="overlay"
      data-modal-kind={modal.kind}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).classList.contains('overlay') && !(modal.kind === 'newCourse' && modal.initial)) close();
      }}
    >
      <div className={'modal' + (modal.kind === 'round' || modal.kind === 'championshipResult' || modal.kind === 'proChallengeResult' ? ' roundModal' : '') + (modal.kind === 'championshipResult' || modal.kind === 'proChallengeResult' ? ' championshipResultModal' : '') + (modal.kind === 'newCourse' ? ' setupModal' : '') + (modal.kind === 'landOffer' || modal.kind === 'landmarkGift' ? ' guestModal' : '')} data-modal-kind={modal.kind} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        {modal.kind === 'newCourse' && <WorldScreen initial={!!modal.initial} close={close} />}
        {modal.kind === 'help' && (
          <>
            <h1 id="modal-title">FAIRWAY MOGUL</h1>
            <div className="tag">Welcome to the club, boss</div>
            <div className="step">
              <div className="n">1</div>
              <div>
                <b>🚩 New hole:</b> tap once for the tee, tap again for the flag. Par is set by distance.
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div>
                <b>Paint the land.</b> Fairway keeps golfers happy. Sand, water and trees make them swear, beautifully.
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div>
                <b>Golfers pay per hole.</b> Good scores and pretty holes mean better tips and reputation. Raise the green fee when your stars go up.
              </div>
            </div>
            <div className="step">
              <div className="n">4</div>
              <div>
                <b>⛳ Tee off</b> to play your own course: drag back from the ball, release to swing. Birdies are free marketing.
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#7a8a70' }}>
              Pinch or scroll to zoom · ✋ to pan · 🚜 on a tee or green removes that hole · ⛰️/⤵️ sculpt the land. Progress autosaves.
            </p>
            <div className="tag" style={{ marginTop: 10 }}>Course theme</div>
            <div className="themeGrid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={'themeBtn' + (courseTheme === t.id ? ' active' : '')}
                  onClick={() => setCourseTheme(t.id)}
                >
                  <b>{t.label}</b>
                  <span>{t.blurb}</span>
                </button>
              ))}
            </div>
            <button className="bigbtn" onClick={close}>
              Open the gates
            </button>
            <button
              className="bigbtn"
              style={{ background: '#8a4a3a', marginTop: 8 }}
              onClick={() => setStore({ modal: { kind: 'newCourse' } })}
            >
              🌍 World Screen &amp; resort portfolio
            </button>
            <div className="fine">An original homage to Sid Meier’s SimGolf (2002). All code and art generated fresh.</div>
          </>
        )}

        {modal.kind === 'round' && (
          <>
            <h1 id="modal-title">Round complete</h1>
            <div className="tag">Permanent scorecard saved</div>
            {(modal.courseRecord || modal.personalBest) && (
              <div className="recordBanner">
                {modal.courseRecord && <span>🏆 Course record</span>}
                {modal.personalBest && <span>★ Personal best</span>}
              </div>
            )}
            <DestinationUnlockBanner propertyIds={modal.unlockedProperties} openWorld={() => setStore({ modal: { kind: 'newCourse' } })} />
            <PracticeProgress result={modal.practice} />
            <Scorecard record={modal.record} />
            {modal.record.competitionId || modal.record.challengeId ? (
              <p className="roundPayout">Online event: <b>{submission === 'sent' ? 'Score submitted' : 'Provisional scorecard ready'}</b></p>
            ) : <p className="roundPayout">Marketing boost: <b>{fmt$(modal.record.payout)}</b></p>}
            <div className="roundActions">
              {(modal.record.competitionId || modal.record.challengeId) && (
                <button
                  className="bigbtn competitionSubmit"
                  disabled={submission === 'sending' || submission === 'sent'}
                  onClick={() => {
                    setSubmission('sending');
                    void (modal.record.challengeId ? submitChallengeRound(modal.record) : submitCompetitionRound(modal.record))
                      .then(() => setSubmission('sent'))
                      .catch(() => setSubmission('error'));
                  }}
                >
                  {submission === 'sending' ? 'Submitting…' : submission === 'sent' ? 'Submitted ✓' : submission === 'error' ? 'Retry score submission' : 'Submit competition score'}
                </button>
              )}
              <button
                className="bigbtn secondary"
                onClick={() => setStore({ modal: null, scorecardsPanel: true, reportsPanel: false, regularsPanel: false, buildPanel: false, staffPanel: false })}
              >
                View scorecard history
              </button>
              <button className="bigbtn" onClick={close}>Back to business</button>
            </div>
          </>
        )}

        {modal.kind === 'championshipResult' && (
          <>
            <div className="championshipResultHead">
              <div className={'championshipMedal rank-' + Math.min(4, modal.result.rank)}><span>{modal.result.rank === 1 ? '★' : modal.result.rank}</span><small>PLACE</small></div>
              <div><h1 id="modal-title">{modal.result.title}</h1><div className="tag">{modal.result.difficulty} field · {modal.result.courseName}</div><p>{modal.result.proName} finished <b>#{modal.result.rank}</b>, earning <strong>{fmt$(modal.result.prize)}</strong> and <strong>{modal.result.fame} fame</strong>.</p></div>
            </div>
            <DestinationUnlockBanner propertyIds={modal.unlockedProperties} openWorld={() => setStore({ modal: { kind: 'newCourse' } })} />
            <PracticeProgress result={modal.practice} />
            <div className="championshipResultGrid">
              <section className="championshipLeaderboard">
                <header><b>Final leaderboard</b><span>12-player stroke play</span></header>
                {modal.result.standings.map((standing) => (
                  <div key={standing.name} className={standing.player ? 'player' : ''}>
                    <strong>{standing.rank}</strong><span>{standing.name}</span><b>{relativeScoreLabel(standing.scoreToPar)}</b><small>{standing.strokes}</small>
                  </div>
                ))}
              </section>
              <section className="championshipCard"><Scorecard record={modal.record} /></section>
            </div>
            <div className="roundActions championshipActions">
              <button className="bigbtn secondary" onClick={() => setStore({ modal: null, scorecardsPanel: true, proPanel: false })}>Open full scorecard</button>
              <button className="bigbtn" onClick={() => setStore({ modal: null, proPanel: true, scorecardsPanel: false, reportsPanel: false, regularsPanel: false, buildPanel: false, staffPanel: false, onlinePanel: false })}>Back to pro circuit</button>
            </div>
          </>
        )}

        {modal.kind === 'proChallengeResult' && (
          <>
            <div className={'proChallengeResultHead outcome-' + modal.result.outcome}>
              <div className="challengeResultSeal"><span>{modal.result.outcome === 'won' ? 'W' : modal.result.outcome === 'lost' ? 'L' : 'T'}</span><small>{modal.result.outcome}</small></div>
              <div><div className="tag">SGA Pro Challenge · {fmt$(modal.result.wagerPerHole)} per hole</div><h1 id="modal-title">{modal.result.proName} vs {modal.result.opponent.name}</h1><p>{modal.result.holesWon} won · {modal.result.holesLost} lost · {modal.result.holesTied} tied. <strong>{modal.result.net > 0 ? `The resort earns ${fmt$(modal.result.net)}.` : modal.result.net < 0 ? `The resort pays ${fmt$(Math.abs(modal.result.net))}.` : 'The match finishes all square.'}</strong></p></div>
            </div>
            <DestinationUnlockBanner propertyIds={modal.unlockedProperties} openWorld={() => setStore({ modal: { kind: 'newCourse' } })} />
            <PracticeProgress result={modal.practice} />
            <div className="challengeComparison">
              <table>
                <thead><tr><th>Hole</th>{modal.result.holes.map((hole) => <th key={hole.hole}>{hole.hole}</th>)}<th>W-L-T</th></tr></thead>
                <tbody>
                  <tr><th>{modal.result.proName}</th>{modal.result.holes.map((hole) => <td key={hole.hole} className={hole.outcome === 'won' ? 'won' : hole.outcome === 'lost' ? 'lost' : ''}>{hole.playerStrokes}</td>)}<td>{modal.result.holesWon}-{modal.result.holesLost}-{modal.result.holesTied}</td></tr>
                  <tr><th>{modal.result.opponent.name}</th>{modal.result.holes.map((hole) => <td key={hole.hole} className={hole.outcome === 'lost' ? 'won' : hole.outcome === 'won' ? 'lost' : ''}>{hole.opponentStrokes}</td>)}<td>{modal.result.holesLost}-{modal.result.holesWon}-{modal.result.holesTied}</td></tr>
                  <tr className="wagerRow"><th>Cash</th>{modal.result.holes.map((hole) => <td key={hole.hole}>{hole.outcome === 'won' ? '+' : hole.outcome === 'lost' ? '−' : '·'}{hole.outcome === 'tied' ? '' : fmt$(modal.result.wagerPerHole)}</td>)}<td>{modal.result.net >= 0 ? '+' : '−'}{fmt$(Math.abs(modal.result.net))}</td></tr>
                </tbody>
              </table>
            </div>
            <Scorecard record={modal.record} compact />
            <div className="roundActions championshipActions"><button className="bigbtn secondary" onClick={() => setStore({ modal: null, scorecardsPanel: true, proPanel: false })}>Open full scorecard</button><button className="bigbtn" onClick={() => setStore({ modal: null, proPanel: true, scorecardsPanel: false })}>Back to pro circuit</button></div>
          </>
        )}

        {modal.kind === 'saves' && <SavesPanel close={close} />}
        {modal.kind === 'landOffer' && <LandOfferPanel close={close} />}
        {modal.kind === 'landmarkGift' && (
          <>
            <div className="guestHeading ivanaHeading"><CharacterPortrait name="Ivana Richman" shirt="#bd6f9f" skin="#e0a878" cap="#f2d688" expression="triumphant" variant="simfoto" className="guestPortrait" /><div><h1 id="modal-title">A patron's gift</h1><div className="tag">Ivana Richman · Heiress</div></div></div>
            <p>“I adored my round. Please accept this Landmark as a gift to the resort.”</p>
            <div className="landmarkGiftArt" aria-hidden="true"><span>★</span><i /><b>LANDMARK</b></div>
            <p className="fine">The first Landmark is free. After it is placed, additional Landmarks can be purchased from Resort &amp; Facilities.</p>
            <button className="bigbtn" onClick={() => { close(); selectBuilding('landmark'); }}>Place Ivana's Landmark</button>
            <button className="textBtn" onClick={close}>Place it later</button>
          </>
        )}
      </div>
    </div>
  );
}
