import { useUI } from './store';
import { setFee, setSpeed, setMuted } from '../game/engine';
import { rotateView } from '../game/camera';
import { ensureAudio } from '../game/audio';
import { fmt$, clamp } from '../game/rng';

export default function TopBar() {
  const cash = useUI((s) => s.cash);
  const rep = useUI((s) => s.rep);
  const fee = useUI((s) => s.fee);
  const golfers = useUI((s) => s.golfers);
  const holes = useUI((s) => s.holes);
  const speed = useUI((s) => s.speed);
  const muted = useUI((s) => s.muted);
  const mode = useUI((s) => s.mode);
  const setStore = useUI((s) => s.set);

  const full = Math.round(clamp(rep, 0, 5));
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);

  return (
    <>
      <div className="plaque">
        <div className="pTitle">FAIRWAY MOGUL</div>
        <div className="pSub">
          {holes} hole{holes === 1 ? '' : 's'} open · {golfers} on course
        </div>
      </div>

      <div className="gauges">
        <div className="gauge" title="Bank balance">
          <div className="gCap">
            <span className="gVal">{fmt$(cash)}</span>
          </div>
          <span className="gOrb">$</span>
        </div>
        <div className="gauge" title="Reputation">
          <div className="gCap">
            <span className="gVal gold">{stars}</span>
          </div>
          <span className="gOrb">😊</span>
        </div>
        <div className="gauge" title="Green fee per hole">
          <div className="gCap">
            <button className="gBtn" onClick={() => setFee(-5)}>
              −
            </button>
            <span className="gVal">${fee}</span>
            <button className="gBtn" onClick={() => setFee(5)}>
              +
            </button>
          </div>
          <span className="gOrb">⛳</span>
        </div>
      </div>

      <div className="orbCluster">
        <button className={'orb' + (speed === 0 ? ' on' : '')} title="Pause" disabled={mode === 'play'} onClick={() => setSpeed(0)}>
          ⏸
        </button>
        <button className={'orb' + (speed === 1 ? ' on' : '')} title="Normal speed" onClick={() => setSpeed(1)}>
          ▶
        </button>
        <button className={'orb' + (speed === 3 ? ' on' : '')} title="Fast" onClick={() => setSpeed(3)}>
          ⏩
        </button>
        <button
          className="orb"
          title="Sound"
          onClick={() => {
            setMuted(!muted);
            ensureAudio();
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="orb" title="Rotate view left (R)" onClick={() => rotateView(-1)}>
          ↺
        </button>
        <button className="orb" title="Rotate view right (r)" onClick={() => rotateView(1)}>
          ↻
        </button>
        <button className="orb" title="Staff" disabled={mode === 'play'} onClick={() => setStore({ staffPanel: !useUI.getState().staffPanel, buildPanel: false })}>
          👔
        </button>
        <button className="orb" title="Help" onClick={() => setStore({ modal: { kind: 'help' } })}>
          ?
        </button>
      </div>
    </>
  );
}
