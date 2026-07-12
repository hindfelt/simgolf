import { useUI } from './store';
import { quitRound, setClub, setShape } from '../game/engine';
import { CLUBS, SHOT_SHAPES } from '../game/constants';
import type { ClubId, ShotShape } from '../game/types';
import { S } from '../game/state';
import { weatherDescription, weatherLabel } from '../game/weather';

const CLUB_IDS: ClubId[] = ['driver', 'iron', 'wedge'];
const SHAPE_IDS: ShotShape[] = ['straight', 'fade', 'draw', 'hook', 'backspin', 'punch'];
const YARDS_PER_TILE = 18;
const SHAPE_MARKS: Record<ShotShape, { mark: string; note: string }> = {
  straight: { mark: '↑', note: 'neutral' },
  fade: { mark: '↗', note: 'curve right' },
  draw: { mark: '↖', note: 'curve left' },
  hook: { mark: '⤺', note: 'hard left' },
  backspin: { mark: '⤓', note: 'stop fast' },
  punch: { mark: '→', note: 'low flight' },
};
const LIE_LABELS: Record<string, string> = {
  tee: 'Tee', fair: 'Fairway', firmfair: 'Firm fairway', rough: 'Rough', deeprough: 'Deep rough',
  sand: 'Sand', waste: 'Waste bunker', pot: 'Pot bunker', stream: 'Stream', brush: 'Brush',
  rock: 'Rock', tree: 'Trees', green: 'Green', flower: 'Flowers', water: 'Water', bridge: 'Bridge',
};
const lieLabel = (lie: string) => LIE_LABELS[lie] ?? lie.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const yards = (tiles: number) => Math.max(1, Math.round(tiles * YARDS_PER_TILE));
const WEATHER_MARKS = { clear: '☀', overcast: '☁', drizzle: '☂', rain: '☔' } as const;

export default function PlayHud() {
  const playHud = useUI((s) => s.playHud);
  if (!playHud) return null;
  const windDeg = (Math.atan2(playHud.windDy, playHud.windDx) * 180) / Math.PI;
  const windMph = Math.round(playHud.windSpeed * 25);
  const windPoints = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const windPoint = windPoints[Math.round(((windDeg + 360) % 360) / 45) % 8];
  const weather = { condition: playHud.weatherCondition, intensity: playHud.weatherIntensity, wetness: playHud.weatherWetness };
  const conditionLabel = weatherLabel(weather.condition);
  const conditionDescription = weatherDescription(weather);
  const canopyDescription = [
    playHud.canopyLabel ? 'canopy-status' : null,
    playHud.canopyAdvice ? 'canopy-advice' : null,
  ].filter(Boolean).join(' ') || undefined;
  return (
    <div className="playHud" role="region" aria-label="Player round controls">
      {S.activeChampionship && <div className="championshipHud"><b>PRO CIRCUIT</b><span>{S.activeChampionship.title}</span><em>{S.activeChampionship.pro.name} · {S.activeChampionship.difficulty}</em></div>}
      {S.activeProChallenge && <div className="championshipHud proChallengeHud"><b>PRO CHALLENGE</b><span>{S.proProfile.name} vs {S.activeProChallenge.opponent.name}</span><em>{S.activeProChallenge.wagerPerHole.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} per hole</em></div>}
      <div className="playRoundStatus">
        <small>On the course</small>
        <span>{playHud.holeLabel}</span>
        <div className="sub">{playHud.strokeLabel}</div>
        <div className="playCoach" role="status" aria-live="polite" aria-atomic="true">{playHud.coach}</div>
      </div>
      <div className="shotTelemetry" role="group" aria-label="Shot information">
        <span><small>To pin</small><b>{yards(playHud.pinDistance)} yd</b></span>
        <span><small>Lie</small><b>{lieLabel(playHud.lie)}</b></span>
        <span className="powerTelemetry"><small>Power</small><b>{playHud.power === null ? 'Ready' : `${Math.round(playHud.power * 100)}%`}</b><i><em style={{ width: `${Math.round((playHud.power ?? 0) * 100)}%` }} /></i></span>
        <span>
          <small>{playHud.onGreen ? 'Putt' : playHud.finishDistance === null ? 'Carry' : 'Carry → est. finish'}</small>
          <b>{playHud.carry === null ? '—' : playHud.finishDistance === null || playHud.onGreen ? `${yards(playHud.carry)} yd` : `${yards(playHud.carry)} → ${yards(playHud.finishDistance)} yd`}</b>
        </span>
      </div>
      {!playHud.onGreen && <div className="shotWorkbench" role="group" aria-label="Shot setup">
        <div className="shotControlGroup">
          <span className="shotControlLabel">Club · {playHud.selectedRole}</span>
          <div className="clubPicker" role="group" aria-label={`Club selection from ${lieLabel(playHud.lie)}`} aria-describedby={canopyDescription}>
            {CLUB_IDS.map((id) => {
              const option = playHud.clubOptions[id];
              const detail = option.available ? `${yards(option.carry)} yards, ${option.role}` : option.reason ?? 'Unavailable from this lie';
              return (
                <button
                  key={id}
                  type="button"
                  className={'clubBtn' + (playHud.club === id ? ' on' : '')}
                  aria-pressed={playHud.club === id}
                  aria-label={`${CLUBS[id].label}, ${detail}`}
                  title={detail}
                  disabled={!option.available}
                  onClick={() => setClub(id)}
                >
                  <span>{CLUBS[id].label}</span>
                  <small>{option.available ? `${yards(option.carry)} yd · ${option.role}` : option.reason ?? 'Unavailable from this lie'}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="shotControlGroup">
          <span className="shotControlLabel flightControlLabel">
            <span>Ball flight</span>
            {playHud.canopyLabel && (
              <span id="canopy-status" className={`canopyStatus canopy-${playHud.canopyStatus}`} role="note" aria-label={`Tree flight status: ${playHud.canopyLabel}`}>
                {playHud.canopyLabel}
              </span>
            )}
          </span>
          <div className="shapePicker" role="group" aria-label="Shot technique selection" aria-describedby={canopyDescription}>
            {SHAPE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'shapeBtn' + (playHud.shape === id ? ' on' : '')}
                aria-pressed={playHud.shape === id}
                onClick={() => setShape(id)}
              >
                <i aria-hidden="true">{SHAPE_MARKS[id].mark}</i>
                <span>{SHOT_SHAPES[id].label}</span>
                <small>{SHAPE_MARKS[id].note}</small>
              </button>
            ))}
          </div>
          {playHud.canopyAdvice && <p id="canopy-advice" className={`canopyAdvice canopy-${playHud.canopyStatus}`}><strong>Caddie:</strong> {playHud.canopyAdvice}</p>}
        </div>
      </div>}
      <div className="conditionsReadout" role="group" aria-label="Course conditions">
        <div className={`weatherReadout weather-${weather.condition}`} title={conditionDescription} aria-label={`${conditionLabel}. ${conditionDescription}`}>
          <span aria-hidden="true">{WEATHER_MARKS[weather.condition]}</span>
          <b>{conditionLabel}</b>
          {weather.wetness > 0.3 && <small>{Math.round(weather.wetness * 100)}% wet</small>}
        </div>
        <div className="windReadout" title={windMph > 1 ? `Wind ${windMph} mph toward ${windPoint}` : 'Calm wind'} aria-label={windMph > 1 ? `Wind ${windMph} miles per hour toward ${windPoint}` : 'Calm wind'}>
          <span className="windArrow" style={{ transform: `rotate(${windDeg}deg)` }}>➤</span>
          {windMph > 1 ? `${windMph} mph · ${windPoint}` : 'Calm'}
        </div>
      </div>
      <button className="quitBtn" onClick={() => quitRound()}>
        Quit round
      </button>
    </div>
  );
}
