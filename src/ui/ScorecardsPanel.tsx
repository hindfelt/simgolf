import { useEffect, useMemo, useRef, useState } from 'react';
import { S } from '../game/state';
import { currentCourseHash, exportRoundHistoryText, importRoundHistoryText } from '../game/engine';
import { compareRoundScore, isCourseRecord, isPersonalBest, relativeScoreLabel, roundToCsv } from '../game/scorecards';
import type { RoundRecord } from '../game/types';
import { useUI } from './store';
import Icon from './Icon';
import Scorecard, { sourceLabel } from './Scorecard';

type HistoryFilter = 'all' | 'course' | 'competition';

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scorecard';
}

export default function ScorecardsPanel() {
  const open = useUI((state) => state.scorecardsPanel);
  const version = useUI((state) => state.roundsVersion);
  const setStore = useUI((state) => state.set);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHole, setSelectedHole] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentHash = currentCourseHash();
  const history = useMemo(() => [...S.roundHistory].sort((a, b) => b.completedAt - a.completedAt), [version, open]);
  const filtered = history.filter((record) => filter === 'all' || (filter === 'course' ? record.courseHash === currentHash : record.source !== 'exhibition'));
  const selected = history.find((record) => record.id === selectedId) ?? filtered[0] ?? history[0] ?? null;

  useEffect(() => {
    if (!open || !selected) return;
    setSelectedId(selected.id);
    setSelectedHole((hole) => Math.min(Math.max(1, hole), selected.holesPlayed));
  }, [open, selected?.id]);

  if (!open) return null;

  const totalHoles = history.reduce((sum, record) => sum + record.holesPlayed, 0);
  const best = history.length ? [...history].sort(compareRoundScore)[0] : null;
  const average = history.length ? history.reduce((sum, record) => sum + record.scoreToPar, 0) / history.length : 0;
  const chosenHole = selected?.card.find((hole) => hole.hole === selectedHole) ?? selected?.card[0];

  const selectRecord = (record: RoundRecord) => {
    setSelectedId(record.id);
    setSelectedHole(1);
  };

  return (
    <section className="managementPanel scorecardsPanel" role="dialog" aria-modal="false" aria-labelledby="scorecards-title">
      <header className="panelHead">
        <div className="panelTitleMark scorecardMark"><Icon name="scorecard" size={22} /></div>
        <div>
          <h2 id="scorecards-title">Player scorecards</h2>
          <p>Permanent round history · competition-ready records</p>
        </div>
        <button className="iconButton panelClose" aria-label="Close scorecards" onClick={() => setStore({ scorecardsPanel: false })}><Icon name="close" size={16} /></button>
      </header>

      <div className="scoreHistoryHero">
        <div><span>Rounds</span><b>{history.length}</b><small>{totalHoles} holes recorded</small></div>
        <div><span>Personal best</span><b>{best ? relativeScoreLabel(best.scoreToPar) : '—'}</b><small>{best ? `${best.courseName} · ${best.holesPlayed} holes` : 'Complete a round'}</small></div>
        <div><span>Average</span><b>{history.length ? relativeScoreLabel(Math.round(average * 10) / 10) : '—'}</b><small>relative to par</small></div>
        <div><span>Course records</span><b>{history.filter((record) => isCourseRecord(record, history)).length}</b><small>across course layouts</small></div>
      </div>

      <div className="scorecardToolbar">
        <div className="scoreFilters" role="tablist" aria-label="Scorecard filters">
          {([['all', 'All rounds'], ['course', 'This course'], ['competition', 'Competitions']] as [HistoryFilter, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <button disabled={!history.length} onClick={() => downloadText('fairway-mogul-scorecards.json', exportRoundHistoryText(), 'application/json')}>Export archive</button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) file.text().then((text) => importRoundHistoryText(text));
            event.target.value = '';
          }}
        />
      </div>

      {!history.length ? (
        <div className="scorecardEmpty">
          <Icon name="scorecard" size={38} />
          <b>No scorecards yet</b>
          <span>Choose Tee off, complete your course, and every shot will be preserved here.</span>
        </div>
      ) : (
        <div className="scorecardWorkspace">
          <aside className="scorecardList" aria-label="Completed rounds">
            {!filtered.length && <p>No rounds match this filter.</p>}
            {filtered.map((record) => (
              <button key={record.id} className={selected?.id === record.id ? 'selected' : ''} onClick={() => selectRecord(record)}>
                <span className="roundDate">{new Date(record.completedAt).toLocaleDateString()}</span>
                <b>{record.courseName}</b>
                <small>{sourceLabel(record.source, record.localEvent)} · {record.holesPlayed} holes</small>
                <strong className={record.scoreToPar < 0 ? 'under' : record.scoreToPar > 0 ? 'over' : ''}>{relativeScoreLabel(record.scoreToPar)}</strong>
                <span className="roundBadges">
                  {isCourseRecord(record, history) && <i>Course record</i>}
                  {isPersonalBest(record, history) && <i>Personal best</i>}
                </span>
              </button>
            ))}
          </aside>

          {selected && (
            <div className="scorecardDetail">
              <div className="scorecardActions">
                <span>{selected.playerName} · {Math.floor(selected.durationSeconds / 60)}m {selected.durationSeconds % 60}s</span>
                <button onClick={() => downloadText(`${safeName(selected.courseName)}-${selected.id}.csv`, roundToCsv(selected), 'text/csv')}>CSV</button>
                <button onClick={() => downloadText(`${safeName(selected.courseName)}-${selected.id}.json`, JSON.stringify(selected, null, 2), 'application/json')}>JSON</button>
              </div>
              <Scorecard record={selected} compact />

              <div className="shotLogHead">
                <div><b>Shot log</b><span>Hole {chosenHole?.hole} · Par {chosenHole?.par} · {relativeScoreLabel(chosenHole?.relative ?? 0)}</span></div>
                <div className="holePicker">
                  {selected.card.map((hole) => <button key={hole.holeId} className={chosenHole?.hole === hole.hole ? 'active' : ''} onClick={() => setSelectedHole(hole.hole)}>{hole.hole}</button>)}
                </div>
              </div>
              {chosenHole && (
                <div className="shotLog">
                  {chosenHole.shots.map((shot) => (
                    <div className="shotRow" key={shot.stroke}>
                      <b>{shot.stroke}</b>
                      <span><strong>{shot.club === 'putter' ? 'Putter' : shot.club[0].toUpperCase() + shot.club.slice(1)}</strong><small>{shot.shape === 'putt' ? 'Putt' : shot.shape}</small></span>
                      <span><strong>{shot.distance.toFixed(1)} tiles</strong><small>{shot.fromLie} → {shot.resultLie}</small></span>
                      <span className={shot.penalty ? 'shotPenalty' : shot.holed ? 'shotHoled' : ''}><strong>{shot.holed ? 'Holed' : shot.penalty ? `+${shot.penalty} penalty` : 'Played'}</strong><small>{shot.events.length ? shot.events.join(', ') : `${Math.round(shot.power * 100)}% power`}</small></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
