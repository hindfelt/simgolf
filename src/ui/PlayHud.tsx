import { useUI } from './store';
import { quitRound, setClub, setShape } from '../game/engine';
import { CLUBS, SHOT_SHAPES } from '../game/constants';
import type { ClubId, ProSkillId, ShotShape } from '../game/types';
import { S } from '../game/state';
import { weatherDescription, weatherLabel } from '../game/weather';
import { shotWindLabel, worldWindScreenVector } from '../game/shotFeedback';

const CLUB_IDS: ClubId[] = ['driver', 'threeWood', 'fiveWood', 'lobWedge'];
const SHOT_CONTROLS: Array<{ id: Exclude<ShotShape, 'hook'>; key: number; alternateKey?: number }> = [
  { id: 'fade', key: 5 },
  { id: 'draw', key: 6, alternateKey: 0 },
  { id: 'straight', key: 7 },
  { id: 'backspin', key: 8 },
  { id: 'punch', key: 9 },
];
const YARDS_PER_TILE = 18;
const SHAPE_PRESENTATION: Record<ShotShape, { label: string; note: string; path: string; accent?: string }> = {
  straight: { label: 'Straight Shot', note: 'straight flight', path: 'M4 20 Q23 2 42 20' },
  fade: { label: 'Fade Shot (L to R)', note: 'left-to-right flight', path: 'M4 20 Q15 2 24 10 Q31 18 42 16' },
  draw: { label: 'Draw / Hook Shot (R to L)', note: 'controlled right-to-left flight', path: 'M42 20 Q31 2 22 10 Q15 18 4 16' },
  hook: { label: 'Hook Shot', note: 'hard right-to-left flight', path: 'M42 20 Q30 0 17 8 Q7 14 11 21', accent: 'M11 21 L8 16 M11 21 L16 19' },
  backspin: { label: 'High Backspin Shot', note: 'high stopping flight', path: 'M4 20 Q21 -3 39 18', accent: 'M39 18 Q34 14 30 18 M30 18 L32 13 M30 18 L35 20' },
  punch: { label: 'Low Punch Shot', note: 'low recovery flight', path: 'M4 20 Q23 12 42 18' },
};
const POWER_SKILLS: Array<[ProSkillId, string]> = [
  ['powerHitter', 'Power Hitter'],
  ['longDriver', 'Long Driver'],
  ['accurateDriver', 'Accurate Driver'],
  ['accurateIrons', 'Accurate Irons'],
  ['accuratePutter', 'Accurate Putter'],
];
const LIE_LABELS: Record<string, string> = {
  tee: 'Tees', fair: 'Fairway', firmfair: 'Firm fairway', rough: 'Rough', deeprough: 'Deep rough',
  sand: 'Sand', waste: 'Waste bunker', pot: 'Pot bunker', stream: 'Stream', brush: 'Brush',
  rock: 'Rock', tree: 'Trees', green: 'Green', flower: 'Flowers', water: 'Water', bridge: 'Bridge',
};
const lieLabel = (lie: string) => LIE_LABELS[lie] ?? lie.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const yards = (tiles: number) => Math.max(1, Math.round(tiles * YARDS_PER_TILE));
const resultYards = (tiles: number) => Math.max(0, Math.round(tiles * YARDS_PER_TILE));
const WEATHER_MARKS = { clear: '☀', overcast: '☁', drizzle: '☂', rain: '☔' } as const;

function FlightGlyph({ shape }: { shape: ShotShape }) {
  const glyph = SHAPE_PRESENTATION[shape];
  return (
    <svg className="flightGlyph" viewBox="0 0 46 24" aria-hidden="true" focusable="false">
      <circle cx="4" cy="20" r="2" />
      <path d={glyph.path} />
      {glyph.accent && <path d={glyph.accent} />}
    </svg>
  );
}

export default function PlayHud() {
  const playHud = useUI((s) => s.playHud);
  if (!playHud) return null;
  const windWorldDeg = (Math.atan2(playHud.windDy, playHud.windDx) * 180) / Math.PI;
  const windScreen = worldWindScreenVector(playHud.windDx, playHud.windDy, S.rot);
  const windDeg = (Math.atan2(windScreen.y, windScreen.x) * 180) / Math.PI;
  const windMph = Math.round(playHud.windSpeed * 25);
  const windPoints = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const windPoint = windPoints[Math.round(((windWorldDeg + 360) % 360) / 45) % 8];
  const weather = { condition: playHud.weatherCondition, intensity: playHud.weatherIntensity, wetness: playHud.weatherWetness };
  const conditionLabel = weatherLabel(weather.condition);
  const conditionDescription = weatherDescription(weather);
  const canopyDescription = [
    playHud.canopyLabel ? 'canopy-status' : null,
    playHud.canopyAdvice ? 'canopy-advice' : null,
  ].filter(Boolean).join(' ') || undefined;
  const playingPro = S.activeChampionship?.pro ?? S.proProfile;
  const stroke = playHud.strokeLabel.split(' · ')[0];
  const shotDistance = playHud.carry ?? playHud.pinDistance;
  const windEffect = playHud.windDisplacement === null ? null : {
    along: playHud.windAlong ?? 0,
    cross: playHud.windCross ?? 0,
    displacement: playHud.windDisplacement,
  };
  const windEffectCopy = shotWindLabel(windEffect, YARDS_PER_TILE);
  const result = playHud.lastShotFeedback;
  const caddieCarry = result?.carryDistance ?? (playHud.shotInFlight ? null : playHud.carry ?? playHud.clubOptions[playHud.club].carry);
  const caddieRoll = result?.rollDistance ?? (playHud.shotInFlight ? null : playHud.rollout);
  const caddieFinish = result?.finishDistance ?? (playHud.shotInFlight ? null : playHud.finishDistance);
  const resultShape = result?.shape === 'putt' ? 'Putt' : result?.shape ? SHOT_SHAPES[result.shape].label : null;
  const resultClub = result?.club === 'putter' ? 'Putter' : result?.club ? CLUBS[result.club].label : null;
  const resultNote = result
    ? `${Math.round(result.power * 100)}% · ${result.holed ? 'Holed' : lieLabel(result.resultLie)}${result.penalty ? ` · +${result.penalty} penalty` : ''}`
    : playHud.shotInFlight
      ? `Tracking ${SHOT_SHAPES[playHud.shape].label.toLowerCase()} flight…`
      : windEffectCopy;
  const showPlayMessage = playHud.shotInFlight || playHud.power !== null || !!playHud.canopyAdvice;
  const availableClubs = CLUB_IDS.filter((id) => playHud.clubOptions[id].available);
  const currentClubIndex = Math.max(0, availableClubs.indexOf(playHud.club));
  const currentClub = availableClubs[currentClubIndex] ?? 'lobWedge';
  const cycleClub = (direction: -1 | 1) => {
    if (!availableClubs.length) return;
    setClub(availableClubs[(currentClubIndex + direction + availableClubs.length) % availableClubs.length]);
  };

  return (
    <div className={'playHud' + (playHud.onGreen ? ' puttingHud' : '')} data-ui="play-shell" role="region" aria-label="Player round controls">
      {S.activeChampionship && <div className="playCompetitionHud"><b>PRO CIRCUIT</b><span>{S.activeChampionship.title}</span><em>{S.activeChampionship.pro.name} · {S.activeChampionship.difficulty}</em></div>}
      {S.activeProChallenge && <div className="playCompetitionHud proChallengeHud"><b>PRO CHALLENGE</b><span>{S.proProfile.name} vs {S.activeProChallenge.opponent.name}</span><em>{S.activeProChallenge.wagerPerHole.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} per hole</em></div>}

      {showPlayMessage && <div className="playMessage" role="status" aria-live="polite" aria-atomic="true">
        {playHud.canopyLabel && (
          <span id="canopy-status" className={`canopyStatus canopy-${playHud.canopyStatus}`} role="note" aria-label={`Tree flight status: ${playHud.canopyLabel}`}>
            {playHud.canopyLabel}
          </span>
        )}
        <span>{playHud.coach}</span>
        {playHud.canopyAdvice && <span id="canopy-advice" className={`playCaddie canopy-${playHud.canopyStatus}`}><strong>Caddie:</strong> {playHud.canopyAdvice}</span>}
      </div>}

      <div className="playConditions" role="group" aria-label="Course conditions">
        <div className={`weatherReadout weather-${weather.condition}`} title={conditionDescription} aria-label={`${conditionLabel}. ${conditionDescription}`}>
          <span aria-hidden="true">{WEATHER_MARKS[weather.condition]}</span>
          <b>{conditionLabel}</b>
          {weather.wetness > 0.3 && <small>{Math.round(weather.wetness * 100)}% wet</small>}
        </div>
        <div className="windReadout" title={windMph > 1 ? `Wind ${windMph} mph toward ${windPoint}` : 'Calm wind'} aria-label={windMph > 1 ? `Wind ${windMph} miles per hour toward ${windPoint}` : 'Calm wind'}>
          <span className="windArrow" style={{ transform: `rotate(${windDeg}deg)` }}>➜</span>
          {windMph > 1 ? `${windMph} mph · ${windPoint}` : 'Calm'}
        </div>
      </div>

      {!playHud.onGreen && (
        <div className="playShotSetup" role="group" aria-label="Shot setup">
          <div className="playShotPalette" role="group" aria-label="Shot technique selection" aria-describedby={canopyDescription}>
            <div className="playShotPaletteRail">
              {SHOT_CONTROLS.map(({ id, key, alternateKey }) => {
                const drawHookControl = id === 'draw';
                const selected = drawHookControl ? playHud.shape === 'draw' || playHud.shape === 'hook' : playHud.shape === id;
                const displayedShape: ShotShape = drawHookControl && playHud.shape === 'hook' ? 'hook' : id;
                const nextShape: ShotShape = drawHookControl && playHud.shape === 'draw' ? 'hook' : id;
                const presentation = SHAPE_PRESENTATION[displayedShape];
                const accessibleLabel = drawHookControl
                  ? `Draw / Hook Shot selector. ${selected ? `Current ${SHOT_SHAPES[displayedShape].label}.` : 'Choose Draw first.'} Activate for ${SHOT_SHAPES[nextShape].label}. Keyboard ${key} selects Draw; Keyboard ${alternateKey} selects Hook`
                  : `${presentation.label}, ${presentation.note}. Keyboard ${key}`;
                return (
                  <button
                    key={id}
                    type="button"
                    className={'shapeBtn' + (drawHookControl ? ' drawHookControl' : '') + (selected ? ' on' : '')}
                    data-selected-shape={selected ? displayedShape : undefined}
                    aria-pressed={selected}
                    aria-label={accessibleLabel}
                    title={drawHookControl ? `Draw / Hook · click to alternate · keys ${key} / ${alternateKey}` : `${presentation.label} · ${presentation.note} · key ${key}`}
                    onClick={() => setShape(nextShape)}
                  >
                    <FlightGlyph shape={displayedShape} />
                    {drawHookControl && <span className="shapeComboState" aria-hidden="true"><i className={playHud.shape === 'draw' ? 'current' : ''}>D</i><i className={playHud.shape === 'hook' ? 'current' : ''}>H</i></span>}
                    <span className="playVisuallyHidden">{drawHookControl ? `Draw and Hook selector, ${selected ? `${SHOT_SHAPES[displayedShape].label} selected` : 'not selected'}` : SHOT_SHAPES[id].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="playConsolePanes">
        <section className="playStatusPane" aria-label="Current shot information">
          <div className="playPaneTitle"><b>{playHud.holeLabel}</b><span>{stroke}</span></div>
          {playHud.onGreen ? (
            <div className="playClubReadout">Club: <b>Putter</b></div>
          ) : (
            <div className="playClubLine" role="group" aria-label={`Club selection from ${lieLabel(playHud.lie)}`} aria-describedby={canopyDescription} title={playHud.selectedRole}>
              <span>Club:</span>
              <button type="button" className="clubStep" aria-label={`Previous club, currently ${CLUBS[currentClub].label}`} title="Previous available club" onClick={() => cycleClub(-1)}>‹</button>
              <button
                type="button"
                className="clubBtn clubCurrent on"
                aria-pressed="true"
                aria-label={`${CLUBS[currentClub].label}, ${yards(playHud.clubOptions[currentClub].carry)} yards, ${playHud.clubOptions[currentClub].role}. Activate for next club. Keyboard ${CLUB_IDS.indexOf(currentClub) + 1}`}
                title={`${yards(playHud.clubOptions[currentClub].carry)} yards · ${playHud.clubOptions[currentClub].role} · click for next club · key ${CLUB_IDS.indexOf(currentClub) + 1}`}
                onClick={() => cycleClub(1)}
              >
                {CLUBS[currentClub].label}
              </button>
              <button type="button" className="clubStep" aria-label={`Next club, currently ${CLUBS[currentClub].label}`} title="Next available club" onClick={() => cycleClub(1)}>›</button>
            </div>
          )}
          <div className="playShotFacts">
            <span>{playHud.carry === null ? 'Pin' : 'Carry'}: <b>{yards(shotDistance)} yds</b></span>
            <span>Lie: <b>{lieLabel(playHud.lie)}</b></span>
            {!playHud.onGreen && <span>Flight: <b>{SHAPE_PRESENTATION[playHud.shape].label}</b></span>}
          </div>
          {playHud.power !== null && <div className="playTargetPower" title={`Target power ${Math.round(playHud.power * 100)} percent`}><i style={{ width: `${Math.round(playHud.power * 100)}%` }} /></div>}
        </section>

        <section className="playSkillPane" aria-label={`${playingPro.name} power and accuracy skills`}>
          {POWER_SKILLS.map(([id, label]) => <span key={id}><b>{label}</b><em>+{playingPro.skills[id] * 10}%</em></span>)}
        </section>
        <section className={'playCaddieBook' + (result ? ' hasResult' : '')} aria-label={result ? 'Last shot result' : 'Caddie shot forecast'} aria-live="polite">
          <div className="caddieBookHead">
            <b>{result ? 'SHOT RESULT' : playHud.shotInFlight ? 'TRACKING SHOT' : 'CADDIE BOOK'}</b>
            <span>{result ? `${resultClub} · ${resultShape}` : `${CLUBS[playHud.club].label} · ${SHOT_SHAPES[playHud.shape].label}`}</span>
          </div>
          <div className="caddieMetrics">
            <span><small>CARRY</small><b>{caddieCarry === null ? '—' : `${resultYards(caddieCarry)} yd`}</b></span>
            <span><small>RELEASE</small><b>{caddieRoll === null ? '—' : `${resultYards(caddieRoll)} yd`}</b></span>
            <span><small>FINISH</small><b>{caddieFinish === null ? '—' : `${resultYards(caddieFinish)} yd`}</b></span>
          </div>
          <p>{resultNote}</p>
        </section>
      </div>

      <button className="quitBtn" onClick={() => quitRound()} aria-label="Quit round" title="Quit round">
        <span aria-hidden="true">×</span><small>Quit</small>
      </button>
    </div>
  );
}
