import { useUI } from './store';
import { quitRound, setClub, setShape } from '../game/engine';
import { CLUBS, SHOT_SHAPES } from '../game/constants';
import type { ClubId, ShotShape } from '../game/types';
import { S } from '../game/state';

const CLUB_IDS: ClubId[] = ['driver', 'iron', 'wedge'];
const SHAPE_IDS: ShotShape[] = ['straight', 'fade', 'draw', 'backspin', 'punch'];

export default function PlayHud() {
  const playHud = useUI((s) => s.playHud);
  if (!playHud) return null;
  const windDeg = (Math.atan2(playHud.windDy, playHud.windDx) * 180) / Math.PI;
  const windMph = Math.round(playHud.windSpeed * 25);
  return (
    <div className="playHud">
      {S.activeChampionship && <div className="championshipHud"><b>PRO CIRCUIT</b><span>{S.activeChampionship.title}</span><em>{S.activeChampionship.pro.name} · {S.activeChampionship.difficulty}</em></div>}
      {S.activeProChallenge && <div className="championshipHud proChallengeHud"><b>PRO CHALLENGE</b><span>{S.proProfile.name} vs {S.activeProChallenge.opponent.name}</span><em>{S.activeProChallenge.wagerPerHole.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} per hole</em></div>}
      <div>
        <span>{playHud.holeLabel}</span>
        <div className="sub">{playHud.strokeLabel}</div>
      </div>
      {!playHud.onGreen && (
        <div className="clubPicker" aria-label="Club selection">
          {CLUB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={'clubBtn' + (playHud.club === id ? ' on' : '')}
              onClick={() => setClub(id)}
            >
              {CLUBS[id].label}
            </button>
          ))}
        </div>
      )}
      {!playHud.onGreen && (
        <div className="shapePicker" aria-label="Shot technique selection">
          {SHAPE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={'shapeBtn' + (playHud.shape === id ? ' on' : '')}
              onClick={() => setShape(id)}
            >
              {SHOT_SHAPES[id].label}
            </button>
          ))}
        </div>
      )}
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
