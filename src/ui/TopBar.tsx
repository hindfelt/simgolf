import { useUI } from './store';
import { setFee, setSpeed, setMuted } from '../game/engine';
import { rotateView } from '../game/camera';
import { ensureAudio } from '../game/audio';
import { fmt$, clamp } from '../game/rng';
import Icon, { type IconName } from './Icon';

function ControlButton({ label, icon, active = false, disabled = false, onClick }: { label: string; icon: IconName; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={'orb' + (active ? ' on' : '')} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export default function TopBar() {
  const cash = useUI((s) => s.cash);
  const rep = useUI((s) => s.rep);
  const fee = useUI((s) => s.fee);
  const golfers = useUI((s) => s.golfers);
  const holes = useUI((s) => s.holes);
  const speed = useUI((s) => s.speed);
  const muted = useUI((s) => s.muted);
  const mode = useUI((s) => s.mode);
  const staffPanel = useUI((s) => s.staffPanel);
  const reportsPanel = useUI((s) => s.reportsPanel);
  const setStore = useUI((s) => s.set);

  const full = Math.round(clamp(rep, 0, 5));
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);

  return (
    <>
      <header className="plaque" aria-label="Course status">
        <div className="pEyebrow">Course operations</div>
        <div className="pTitle">FAIRWAY MOGUL</div>
        <div className="pSub">{holes} hole{holes === 1 ? '' : 's'} open · {golfers} on course</div>
      </header>

      <div className="gauges" aria-label="Course finances and reputation">
        <div className="gauge" title="Bank balance">
          <div className="gCap"><span className="gLabel">Bank</span><output className="gVal">{fmt$(cash)}</output></div>
          <span className="gOrb"><Icon name="cash" size={18} /></span>
        </div>
        <div className="gauge" title={`Reputation ${rep.toFixed(1)} out of 5`}>
          <div className="gCap"><span className="gLabel">Rating</span><output className="gVal gold" aria-label={`${rep.toFixed(1)} out of 5 stars`}>{stars}</output></div>
          <span className="gOrb"><Icon name="reputation" size={17} /></span>
        </div>
        <div className="gauge" title="Green fee per hole">
          <div className="gCap feeCap">
            <button className="gBtn" aria-label="Lower green fee by five dollars" onClick={() => setFee(-5)}>−</button>
            <span><span className="gLabel">Fee</span><output className="gVal">${fee}</output></span>
            <button className="gBtn" aria-label="Raise green fee by five dollars" onClick={() => setFee(5)}>+</button>
          </div>
          <span className="gOrb"><Icon name="fee" size={18} /></span>
        </div>
      </div>

      <div className="orbCluster" aria-label="Game controls">
        <ControlButton label="Pause simulation" icon="pause" active={speed === 0} disabled={mode === 'play'} onClick={() => setSpeed(0)} />
        <ControlButton label="Normal simulation speed" icon="play" active={speed === 1} onClick={() => setSpeed(1)} />
        <ControlButton label="Fast simulation speed" icon="fast" active={speed === 3} onClick={() => setSpeed(3)} />
        <ControlButton label={muted ? 'Turn sound on' : 'Mute sound'} icon={muted ? 'mute' : 'volume'} active={muted} onClick={() => { setMuted(!muted); ensureAudio(); }} />
        <ControlButton label="Rotate view left" icon="rotateLeft" onClick={() => rotateView(-1)} />
        <ControlButton label="Rotate view right" icon="rotateRight" onClick={() => rotateView(1)} />
        <ControlButton label="Manage staff" icon="staff" active={staffPanel} disabled={mode === 'play'} onClick={() => setStore({ staffPanel: !staffPanel, buildPanel: false, reportsPanel: false })} />
        <ControlButton label="Open course report" icon="report" active={reportsPanel} onClick={() => setStore({ reportsPanel: !reportsPanel, buildPanel: false, staffPanel: false })} />
        <ControlButton label="Open help" icon="help" onClick={() => setStore({ modal: { kind: 'help' } })} />
      </div>
    </>
  );
}
