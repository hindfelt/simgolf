import { useUI } from './store';
import { quitRound, setClub, setShape } from '../game/engine';
import { CLUBS, SHOT_SHAPES } from '../game/constants';
import type { ClubId, ShotShape } from '../game/types';
import { S } from '../game/state';

const CLUB_IDS: ClubId[] = ['driver', 'iron', 'wedge'];
const SHAPE_IDS: ShotShape[] = ['straight', 'fade', 'draw', 'backspin', 'punch'];
const YARDS_PER_TILE = 18;
const SHAPE_MARKS: Record<ShotShape, { mark: string; note: string }> = {
  straight: { mark: '↑', note: 'neutral' },
  fade: { mark: '↗', note: 'curve right' },
  draw: { mark: '↖', note: 'curve left' },
  backspin: { mark: '⤓', note: 'stop fast' },
  punch: { mark: '→', note: 'low flight' },
};
const lieLabel = (lie: string) => lie.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const yards = (tiles: number) => Math.max(1, Math.round(tiles * YARDS_PER_TILE));

export default function PlayHud() {
  const playHud = useUI((s) => s.playHud);
  if (!playHud) return null;
  const windDeg = (Math.atan2(playHud.windDy, playHud.windDx) * 180) / Math.PI;
  const windMph = Math.round(playHud.windSpeed * 25);
  return (
    <div className="playHud">
      {S.activeChampionship && <div className="championshipHud"><b>PRO CIRCUIT</b><span>{S.activeChampionship.title}</span><em>{S.activeChampionship.pro.name} · {S.activeChampionship.difficulty}</em></div>}
      {S.activeProChallenge && <div className="championshipHud proChallengeHud"><b>PRO CHALLENGE</b><span>{S.proProfile.name} vs {S.activeProChallenge.opponent.name}</span><em>{S.activeProChallenge.wagerPerHole.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} per hole</em></div>}
      <div className="playRoundStatus">
        <small>On the course</small>
        <span>{playHud.holeLabel}</span>
        <div className="sub">{playHud.strokeLabel}</div>
        <div className="playCoach" role="status" aria-live="polite">{playHud.coach}</div>
      </div>
      <div className="shotTelemetry" aria-label="Shot information">
        <span><small>To pin</small><b>{yards(playHud.pinDistance)} yd</b></span>
        <span><small>Lie</small><b>{lieLabel(playHud.lie)}</b></span>
        <span className="powerTelemetry"><small>Power</small><b>{playHud.power === null ? 'Ready' : `${Math.round(playHud.power * 100)}%`}</b><i><em style={{ width: `${Math.round((playHud.power ?? 0) * 100)}%` }} /></i></span>
        <span><small>Carry</small><b>{playHud.carry === null ? '—' : `${yards(playHud.carry)} yd`}</b></span>
      </div>
      {!playHud.onGreen && <div className="shotWorkbench">
        <div className="shotControlGroup">
          <span className="shotControlLabel">Club</span>
          <div className="clubPicker" aria-label="Club selection">
            {CLUB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'clubBtn' + (playHud.club === id ? ' on' : '')}
                onClick={() => setClub(id)}
              >
                <span>{CLUBS[id].label}</span>
                <small>{yards(playHud.clubRanges[id])} yd</small>
              </button>
            ))}
          </div>
        </div>
        <div className="shotControlGroup">
          <span className="shotControlLabel">Ball flight</span>
          <div className="shapePicker" aria-label="Shot technique selection">
            {SHAPE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'shapeBtn' + (playHud.shape === id ? ' on' : '')}
                onClick={() => setShape(id)}
              >
                <i aria-hidden="true">{SHAPE_MARKS[id].mark}</i>
                <span>{SHOT_SHAPES[id].label}</span>
                <small>{SHAPE_MARKS[id].note}</small>
              </button>
            ))}
          </div>
        </div>
      </div>}
      {windMph > 1 && (
        <div className="windReadout" title={`Wind ${windMph} mph`}>
          <span className="windArrow" style={{ transform: `rotate(${windDeg}deg)` }}>➤</span>
          {windMph} mph
        </div>
      )}
      <button className="quitBtn" onClick={() => quitRound()}>
        Quit round
      </button>
    </div>
  );
}
