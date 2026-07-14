import { useEffect, useRef } from 'react';
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

function MenuCommand({ label, icon, active = false, disabled = false, onClick }: { label: string; icon: IconName; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={'fieldMenuCommand' + (active ? ' active' : '')} role="menuitem" disabled={disabled} onClick={onClick}>
      <span className="menuBullet" aria-hidden="true" />
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </button>
  );
}

export function FieldControls() {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const clubhouseMenu = useUI((s) => s.clubhouseMenu);
  const speed = useUI((s) => s.speed);
  const muted = useUI((s) => s.muted);
  const mode = useUI((s) => s.mode);
  const staffPanel = useUI((s) => s.staffPanel);
  const reportsPanel = useUI((s) => s.reportsPanel);
  const regularsPanel = useUI((s) => s.regularsPanel);
  const scorecardsPanel = useUI((s) => s.scorecardsPanel);
  const onlinePanel = useUI((s) => s.onlinePanel);
  const proPanel = useUI((s) => s.proPanel);
  const setStore = useUI((s) => s.set);
  const fromMenu = (action: () => void) => {
    setStore({ clubhouseMenu: false });
    action();
  };

  useEffect(() => {
    if (!clubhouseMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setStore({ clubhouseMenu: false });
      window.setTimeout(() => launcherRef.current?.focus(), 0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clubhouseMenu, setStore]);

  return (
    <div className={'orbCluster fieldControls' + (mode === 'play' ? ' playControls' : '')} data-ui="simulation-controls" aria-label="Simulation controls">
      <svg className="fieldControlSkin" viewBox="0 0 280 166" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="simGolfFanFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8d5ff" />
            <stop offset="0.16" stopColor="#bdbaf1" />
            <stop offset="0.72" stopColor="#918ed2" />
            <stop offset="1" stopColor="#6667b1" />
          </linearGradient>
        </defs>
        <path className="fieldControlSkinShadow" d="M-5 52 C34 25 80 16 119 31 C155 45 174 91 213 104 C244 114 260 84 266 46 C270 20 274 6 284 -5 L284 171 L-5 171 Z" />
        <path className="fieldControlSkinBody" d="M-5 46 C35 20 79 12 117 27 C154 41 173 87 212 100 C241 110 256 81 262 43 C266 18 271 4 284 -8 L284 168 L-5 168 Z" />
        <path className="fieldControlSkinHighlight" d="M0 47 C37 24 79 18 113 31 C149 45 169 89 207 101" />
        <path className="fieldControlSkinLowlight" d="M0 146 C76 140 151 146 220 151 C245 153 265 145 280 132 L280 166 L0 166 Z" />
      </svg>

      <div className={'fieldMenu' + (clubhouseMenu ? ' open' : '')}>
        <button
          ref={launcherRef}
          type="button"
          className={'orb clubhouseLauncher' + (clubhouseMenu ? ' on' : '')}
          aria-label={clubhouseMenu ? 'Close clubhouse menu' : 'Open clubhouse menu'}
          aria-expanded={clubhouseMenu}
          aria-controls="clubhouse-command-list"
          title="Clubhouse menu"
          onClick={() => setStore({ clubhouseMenu: !clubhouseMenu })}
        >
          <Icon name="resort" size={22} />
        </button>
        <span className="controlLegend" aria-hidden="true">Clubhouse</span>
        {clubhouseMenu && (
          <div className="fieldMenuCard" id="clubhouse-command-list" role="menu" aria-label="Clubhouse commands">
            <MenuCommand label={muted ? 'Turn Sound On' : 'Turn Sound Off'} icon={muted ? 'mute' : 'volume'} active={muted} onClick={() => fromMenu(() => { setMuted(!muted); ensureAudio(); })} />
            <MenuCommand label="Rotate View Left" icon="rotateLeft" onClick={() => fromMenu(() => rotateView(-1))} />
            <MenuCommand label="Rotate View Right" icon="rotateRight" onClick={() => fromMenu(() => rotateView(1))} />
            <MenuCommand label="Manage Staff" icon="staff" active={staffPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ staffPanel: !staffPanel }))} />
            <MenuCommand label="Course Report" icon="report" active={reportsPanel} onClick={() => fromMenu(() => setStore({ reportsPanel: !reportsPanel }))} />
            <MenuCommand label="Regular Golfers" icon="regulars" active={regularsPanel} onClick={() => fromMenu(() => setStore({ regularsPanel: !regularsPanel }))} />
            <MenuCommand label="Player Scorecards" icon="scorecard" active={scorecardsPanel} onClick={() => fromMenu(() => setStore({ scorecardsPanel: !scorecardsPanel }))} />
            <MenuCommand label="Resident Pro & Championships" icon="trophy" active={proPanel} disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ proPanel: !proPanel }))} />
            <MenuCommand label="World Screen" icon="land" disabled={mode === 'play'} onClick={() => fromMenu(() => setStore({ modal: { kind: 'newCourse' } }))} />
            <MenuCommand label="Clubhouse Online" icon="account" active={onlinePanel} onClick={() => fromMenu(() => setStore({ onlinePanel: !onlinePanel }))} />
            <MenuCommand label="Save or Load Game" icon="save" onClick={() => fromMenu(() => setStore({ modal: { kind: 'saves' } }))} />
            <MenuCommand label="Help" icon="help" onClick={() => fromMenu(() => setStore({ modal: { kind: 'help' } }))} />
          </div>
        )}
      </div>
      <ControlButton label="Pause simulation" icon="pause" active={speed === 0} disabled={mode === 'play' || clubhouseMenu} onClick={() => setSpeed(0)} />
      <ControlButton label="Normal simulation speed" icon="play" active={speed === 1} disabled={clubhouseMenu} onClick={() => setSpeed(1)} />
      <ControlButton label="Fast simulation speed" icon="fast" active={speed === 3} disabled={clubhouseMenu} onClick={() => setSpeed(3)} />
    </div>
  );
}

export default function TopBar() {
  const courseName = useUI((s) => s.courseName);
  const cash = useUI((s) => s.cash);
  const rep = useUI((s) => s.rep);
  const fee = useUI((s) => s.fee);
  const golfers = useUI((s) => s.golfers);
  const holes = useUI((s) => s.holes);
  const sandbox = useUI((s) => s.sandbox);
  const difficulty = useUI((s) => s.difficulty);
  const themePackId = useUI((s) => s.themePackId);
  const propertyId = useUI((s) => s.propertyId);
  const portfolioStatus = useUI((s) => s.portfolioStatus);
  const simTick = useUI((s) => s.simTick);

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

    </>
  );
}
