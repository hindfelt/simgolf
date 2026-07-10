import type { PlayerHoleScore, RoundRecord } from '../game/types';
import { relativeScoreLabel } from '../game/scorecards';

function scoreClass(hole: PlayerHoleScore): string {
  if (hole.relative <= -2) return 'scoreEagle';
  if (hole.relative === -1) return 'scoreBirdie';
  if (hole.relative === 0) return 'scorePar';
  if (hole.relative === 1) return 'scoreBogey';
  return 'scoreDouble';
}

export function sourceLabel(source: RoundRecord['source'], localEvent?: RoundRecord['localEvent']): string {
  if (localEvent === 'championship') return 'Pro-circuit championship';
  if (localEvent === 'proChallenge') return 'SGA Pro Challenge';
  return source === 'exhibition' ? 'Resident-pro exhibition' : source === 'tournament' ? 'Club tournament' : source === 'daily' ? 'Daily competition' : source === 'weekly' ? 'Weekly competition' : 'Player challenge';
}

export default function Scorecard({ record, compact = false }: { record: RoundRecord; compact?: boolean }) {
  const fairwayPct = record.fairwayOpportunities ? Math.round((record.fairwaysHit / record.fairwayOpportunities) * 100) : null;
  const girPct = record.holesPlayed ? Math.round((record.greensInRegulation / record.holesPlayed) * 100) : 0;
  return (
    <div className={'roundScorecard' + (compact ? ' compact' : '')}>
      <div className="scorecardMeta">
        <div><span>Course</span><b>{record.courseName}</b></div>
        <div><span>Played</span><b>{new Date(record.completedAt).toLocaleDateString()}</b></div>
        <div><span>Format</span><b>{sourceLabel(record.source, record.localEvent)}</b></div>
        <div><span>Course ID</span><b className="mono">{record.courseHash.replace('fm1-', '').toUpperCase()}</b></div>
      </div>

      <div className="scorecardScroll">
        <table className="scorecardTable">
          <thead>
            <tr>
              <th>Hole</th>
              {record.card.map((hole) => <th key={hole.holeId}>{hole.hole}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Par</th>
              {record.card.map((hole) => <td key={hole.holeId}>{hole.par}</td>)}
              <td><b>{record.par}</b></td>
            </tr>
            <tr className="scoreRow">
              <th>Score</th>
              {record.card.map((hole) => <td key={hole.holeId}><span className={scoreClass(hole)}>{hole.strokes}</span></td>)}
              <td><b>{record.strokes}</b></td>
            </tr>
            <tr>
              <th>+/-</th>
              {record.card.map((hole) => <td key={hole.holeId} className={hole.relative < 0 ? 'good' : hole.relative > 0 ? 'bad' : ''}>{relativeScoreLabel(hole.relative)}</td>)}
              <td className={record.scoreToPar < 0 ? 'good' : record.scoreToPar > 0 ? 'bad' : ''}><b>{relativeScoreLabel(record.scoreToPar)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="scorecardStats">
        <div><span>Fairways</span><b>{fairwayPct == null ? '—' : `${record.fairwaysHit}/${record.fairwayOpportunities}`}</b><small>{fairwayPct == null ? 'No par 4/5 holes' : `${fairwayPct}% hit`}</small></div>
        <div><span>Greens</span><b>{record.greensInRegulation}/{record.holesPlayed}</b><small>{girPct}% in regulation</small></div>
        <div><span>Putts</span><b>{record.putts}</b><small>{(record.putts / Math.max(1, record.holesPlayed)).toFixed(1)} per hole</small></div>
        <div><span>Penalties</span><b>{record.penalties}</b><small>{record.penalties ? 'Hazards cost strokes' : 'Clean card'}</small></div>
        <div><span>Best</span><b>{record.eagles ? `${record.eagles} eagle${record.eagles === 1 ? '' : 's'}` : record.birdies ? `${record.birdies} birdie${record.birdies === 1 ? '' : 's'}` : `${record.pars} par${record.pars === 1 ? '' : 's'}`}</b><small>{record.bogeys} over-par holes</small></div>
        <div><span>Longest</span><b>{record.longestShot.toFixed(1)}</b><small>course tiles</small></div>
      </div>
    </div>
  );
}
