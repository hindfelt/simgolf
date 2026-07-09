import { useUI } from './store';
import { quitRound } from '../game/engine';

export default function PlayHud() {
  const playHud = useUI((s) => s.playHud);
  if (!playHud) return null;
  return (
    <div className="playHud">
      <div>
        <span>{playHud.holeLabel}</span>
        <div className="sub">{playHud.strokeLabel}</div>
      </div>
      <button className="quitBtn" onClick={() => quitRound()}>
        Quit round
      </button>
    </div>
  );
}
