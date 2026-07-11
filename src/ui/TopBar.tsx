import { useRef } from 'react';
import { useUI } from './store';
import { setFee, setSpeed, setMuted, setCourseName } from '../game/engine';
import { rotateView } from '../game/camera';
import { ensureAudio } from '../game/audio';
import { fmt$, clamp } from '../game/rng';
import { difficultyDefinition } from '../game/difficulty';
import Icon, { type IconName } from './Icon';
import { themePackById } from '../game/themePacks';
import { propertyById } from '../game/properties';

function ControlButton({ label, icon, active = false, disabled = false, onClick }: { label: string; icon: IconName; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={'orb' + (active ? ' on' : '')} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export default function TopBar() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const courseName = useUI((s) => s.courseName);
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
  const regularsPanel = useUI((s) => s.regularsPanel);
  const scorecardsPanel = useUI((s) => s.scorecardsPanel);
  const onlinePanel = useUI((s) => s.onlinePanel);
  const proPanel = useUI((s) => s.proPanel);
  const sandbox = useUI((s) => s.sandbox);
  const difficulty = useUI((s) => s.difficulty);
  const themePackId = useUI((s) => s.themePackId);
  const propertyId = useUI((s) => s.propertyId);
  const setStore = useUI((s) => s.set);
  const fromMenu = (action: () => void) => {
    action();
    if (menuRef.current) menuRef.current.open = false;
  };

  const full = Math.round(clamp(rep, 0, 5));
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);

  return (
    <>
      <header className="plaque" aria-label="Course status">
        <div className="pEyebrow">Course operations</div>
        <button
          type="button"
          className="pTitle pTitleBtn"
          title="Rename your course"
          onClick={() => {
            const next = window.prompt('Name your course:', courseName);
            if (next != null) setCourseName(next);
          }}
        >
          {courseName.toUpperCase()}
        </button>
        <div className="pSub">
          {holes} hole{holes === 1 ? '' : 's'} open · {golfers} on course
          <span className="propertyBadge">{propertyById(propertyId).region}</span>
          {sandbox && <span className="sandboxBadge">SANDBOX</span>}
          {!sandbox && <span className={'difficultyBadge difficulty-' + difficulty}>{difficultyDefinition(difficulty).label}</span>}
          {themePackId !== 'standard' && <span className="themePackBadge">{themePackById(themePackId).name}</span>}
        </div>
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

      <div className={'orbCluster fieldControls' + (mode === 'play' ? ' playControls' : '')} aria-label="Simulation controls">
        <ControlButton label="Pause simulation" icon="pause" active={speed === 0} disabled={mode === 'play'} onClick={() => setSpeed(0)} />
        <ControlButton label="Normal simulation speed" icon="play" active={speed === 1} onClick={() => setSpeed(1)} />
        <ControlButton label="Fast simulation speed" icon="fast" active={speed === 3} onClick={() => setSpeed(3)} />
        <details className="fieldMenu" ref={menuRef}>
          <summary className="orb" aria-label="Open field desk menu" title="Field desk menu"><Icon name="course" size={19} /></summary>
          <div className="fieldMenuCard" aria-label="Course management controls">
            <div className="fieldMenuHead"><span>Groundskeeper’s desk</span><small>Course operations</small></div>
            <div className="fieldMenuGrid">
              <ControlButton label={muted ? 'Turn sound on' : 'Mute sound'} icon={muted ? 'mute' : 'volume'} active={muted} onClick={() => fromMenu(() => { setMuted(!muted); ensureAudio(); })} />
              <ControlButton label="Rotate view left" icon="rotateLeft" onClick={() => fromMenu(() => rotateView(-1))} />
              <ControlButton label="Rotate view right" icon="rotateRight" onClick={() => fromMenu(() => rotateView(1))} />
              <ControlButton label="Manage staff" icon="staff" active={staffPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ staffPanel: !staffPanel, buildPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Open course report" icon="report" active={reportsPanel} onClick={() => fromMenu(() => setStore({ reportsPanel: !reportsPanel, buildPanel: false, staffPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="View regulars roster" icon="regulars" active={regularsPanel} onClick={() => fromMenu(() => setStore({ regularsPanel: !regularsPanel, buildPanel: false, staffPanel: false, reportsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Open player scorecards" icon="scorecard" active={scorecardsPanel} onClick={() => fromMenu(() => setStore({ scorecardsPanel: !scorecardsPanel, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Resident pro and Championship Mode" icon="trophy" active={proPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ proPanel: !proPanel, onlinePanel: false, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false }))} />
              <ControlButton label="Account, cloud saves, and competitions" icon="account" active={onlinePanel} onClick={() => fromMenu(() => setStore({ onlinePanel: !onlinePanel, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, proPanel: false }))} />
              <ControlButton label="Save, load, or export courses" icon="save" onClick={() => fromMenu(() => setStore({ modal: { kind: 'saves' } }))} />
              <ControlButton label="Open help" icon="help" onClick={() => fromMenu(() => setStore({ modal: { kind: 'help' } }))} />
            </div>
          </div>
        </details>
      </div>
    </>
  );
}
