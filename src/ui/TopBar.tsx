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
import { S } from '../game/state';
import { FINANCIAL_YEAR_SECONDS, financialYearAt } from '../game/finance';

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
  const portfolioStatus = useUI((s) => s.portfolioStatus);
  const simTick = useUI((s) => s.simTick);
  const setStore = useUI((s) => s.set);
  const fromMenu = (action: () => void) => {
    action();
    if (menuRef.current) menuRef.current.open = false;
  };

  const full = Math.round(clamp(rep, 0, 5));
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  void simTick;
  const month = months[Math.min(11, Math.floor(((S.time % FINANCIAL_YEAR_SECONDS) / FINANCIAL_YEAR_SECONDS) * 12))];
  const simDate = `${month} · Year ${financialYearAt(S.time)}`;

  return (
    <>
      <header className="plaque" data-ui="course-plaque" aria-label="Course status">
        <span className="courseCrest" aria-hidden="true"><Icon name="course" size={34} /></span>
        <div className="pEyebrow">{propertyById(propertyId).region}</div>
        <button
          type="button"
          className="pTitle pTitleBtn"
          title="Rename your course"
          onClick={() => {
            const next = window.prompt('Name your course:', courseName);
            if (next != null) setCourseName(next);
          }}
        >
          {courseName}
        </button>
        <div className="pSub">
          <span className="simDate">{simDate}</span>
          <span className="courseCounters"><b>⛳ {holes}</b><b>● {golfers}</b><b>♥ {Math.round(rep * 20)}</b></span>
          <span className="statusBadges">
          <span className={'portfolioSyncBadge status-' + portfolioStatus}>{portfolioStatus === 'error' ? 'PORTFOLIO SAVE ERROR' : portfolioStatus === 'saving' ? 'SAVING PORTFOLIO' : portfolioStatus === 'saved' ? 'PORTFOLIO SAVED' : 'LOCAL AUTOSAVE'}</span>
          {sandbox && <span className="sandboxBadge">SANDBOX</span>}
          {!sandbox && <span className={'difficultyBadge difficulty-' + difficulty}>{difficultyDefinition(difficulty).label}</span>}
          {themePackId !== 'standard' && <span className="themePackBadge">{themePackById(themePackId).name}</span>}
          </span>
        </div>
      </header>

      <div className="gauges" data-ui="status-shelves" aria-label="Course finances and reputation">
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

      <div className={'orbCluster fieldControls' + (mode === 'play' ? ' playControls' : '')} data-ui="simulation-controls" aria-label="Simulation controls">
        <svg className="fieldControlSkin" viewBox="0 0 220 104" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="simGolfFanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d8d5ff" />
              <stop offset="0.16" stopColor="#bdbaf1" />
              <stop offset="0.72" stopColor="#918ed2" />
              <stop offset="1" stopColor="#6667b1" />
            </linearGradient>
          </defs>
          <path className="fieldControlSkinShadow" d="M-4 28 C26 14 61 9 91 18 C124 28 132 59 166 68 C190 74 202 62 208 39 C212 22 213 8 224 -3 L224 108 L-4 108 Z" />
          <path className="fieldControlSkinBody" d="M-4 24 C26 10 61 5 91 14 C124 24 132 55 166 64 C190 70 202 58 208 35 C212 18 213 5 224 -6 L224 106 L-4 106 Z" />
          <path className="fieldControlSkinHighlight" d="M0 25 C29 13 60 9 88 17 C120 26 132 56 163 65" />
          <path className="fieldControlSkinLowlight" d="M0 94 C63 90 123 93 180 96 C197 97 210 94 220 87 L220 104 L0 104 Z" />
        </svg>
        <details className="fieldMenu" ref={menuRef}>
          <summary className="orb" aria-label="Open clubhouse menu" title="Clubhouse menu"><Icon name="resort" size={27} /></summary>
          <span className="controlLegend" aria-hidden="true">Clubhouse</span>
          <div className="fieldMenuCard" aria-label="Course management controls">
            <div className="fieldMenuHead"><span>Clubhouse</span><small>Course operations</small></div>
            <div className="fieldMenuGrid">
              <ControlButton label={muted ? 'Turn sound on' : 'Mute sound'} icon={muted ? 'mute' : 'volume'} active={muted} onClick={() => fromMenu(() => { setMuted(!muted); ensureAudio(); })} />
              <ControlButton label="Rotate view left" icon="rotateLeft" onClick={() => fromMenu(() => rotateView(-1))} />
              <ControlButton label="Rotate view right" icon="rotateRight" onClick={() => fromMenu(() => rotateView(1))} />
              <ControlButton label="Manage staff" icon="staff" active={staffPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ staffPanel: !staffPanel, buildPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Open course report" icon="report" active={reportsPanel} onClick={() => fromMenu(() => setStore({ reportsPanel: !reportsPanel, buildPanel: false, staffPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="View regulars roster" icon="regulars" active={regularsPanel} onClick={() => fromMenu(() => setStore({ regularsPanel: !regularsPanel, buildPanel: false, staffPanel: false, reportsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Open player scorecards" icon="scorecard" active={scorecardsPanel} onClick={() => fromMenu(() => setStore({ scorecardsPanel: !scorecardsPanel, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Resident pro and Championship Mode" icon="trophy" active={proPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ proPanel: !proPanel, onlinePanel: false, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false }))} />
              <ControlButton label="World Screen and resort portfolio" icon="land" disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ modal: { kind: 'newCourse' }, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false }))} />
              <ControlButton label="Account, cloud saves, and competitions" icon="account" active={onlinePanel} onClick={() => fromMenu(() => setStore({ onlinePanel: !onlinePanel, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, proPanel: false }))} />
              <ControlButton label="Save, load, or export courses" icon="save" onClick={() => fromMenu(() => setStore({ modal: { kind: 'saves' } }))} />
              <ControlButton label="Open help" icon="help" onClick={() => fromMenu(() => setStore({ modal: { kind: 'help' } }))} />
            </div>
          </div>
        </details>
        <ControlButton label="Pause simulation" icon="pause" active={speed === 0} disabled={mode === 'play'} onClick={() => setSpeed(0)} />
        <ControlButton label="Normal simulation speed" icon="play" active={speed === 1} onClick={() => setSpeed(1)} />
        <ControlButton label="Fast simulation speed" icon="fast" active={speed === 3} onClick={() => setSpeed(3)} />
      </div>
    </>
  );
}
