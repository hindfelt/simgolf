import { useEffect } from 'react';
import GameCanvas from './ui/GameCanvas';
import TopBar from './ui/TopBar';
import Toolbar from './ui/Toolbar';
import PlayHud from './ui/PlayHud';
import Ticker from './ui/Ticker';
import BuildPanel from './ui/BuildPanel';
import StaffPanel from './ui/StaffPanel';
import ReportsPanel from './ui/ReportsPanel';
import RegularsPanel from './ui/RegularsPanel';
import MiniMap from './ui/MiniMap';
import ScorecardsPanel from './ui/ScorecardsPanel';
import AccountPanel from './ui/AccountPanel';
import ProCircuitPanel from './ui/ProCircuitPanel';
import Modals from './ui/Modals';
import { useUI } from './ui/store';

function Hint() {
  const hint = useUI((s) => s.hint);
  return <div className="hint" role="status" aria-live="polite">{hint}</div>;
}

export default function App() {
  // Never fail silently: surface runtime errors to the player.
  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      let el = document.getElementById('errBanner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'errBanner';
        el.className = 'errBanner';
        document.body.appendChild(el);
      }
      el.textContent = 'Error: ' + (e.message || e.type) + (e.lineno ? ' @' + e.lineno + ':' + (e.colno || 0) : '');
    };
    window.addEventListener('error', onErr);
    return () => window.removeEventListener('error', onErr);
  }, []);

  return (
    <>
      <GameCanvas />
      <TopBar />
      <Hint />
      <PlayHud />
      <Ticker />
      <BuildPanel />
      <StaffPanel />
      <ReportsPanel />
      <RegularsPanel />
      <ScorecardsPanel />
      <AccountPanel />
      <ProCircuitPanel />
      <MiniMap />
      <Toolbar />
      <Modals />
    </>
  );
}
