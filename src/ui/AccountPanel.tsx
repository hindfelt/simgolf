import { useCallback, useEffect, useRef, useState } from 'react';
import { currentCourseHash, exportRoundHistoryText, exportSaveText, importRoundHistoryText, importSaveText, startCompetitionRound } from '../game/engine';
import { S } from '../game/state';
import type { RoundRecord } from '../game/types';
import {
  beginGoogleSignIn,
  downloadCloudSave,
  downloadCompetitionCourse,
  getAccount,
  getLeaderboard,
  getSeasonStandings,
  listCloudSaves,
  listCompetitions,
  publishCurrentCourse,
  removeCloudSave,
  signOut,
  syncProfileRounds,
  uploadCloudSave,
  type CloudSaveMetadata,
  type OnlineCompetition,
  type OnlineUser,
} from '../online/api';
import Icon from './Icon';
import OnlineSocial from './OnlineSocial';
import { useUI } from './store';
import { useFloatingPanelFocus } from './panelA11y';

const CLOUD_SLOTS = [
  { id: 'cloud-a', label: 'A' },
  { id: 'cloud-b', label: 'B' },
  { id: 'cloud-c', label: 'C' },
];

function relativeScore(score: number): string {
  return score === 0 ? 'E' : score > 0 ? `+${score}` : String(score);
}

function countdown(end: number): string {
  const seconds = Math.max(0, Math.floor((end - Date.now()) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  return days ? `${days}d ${hours}h left` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m left`;
}

export default function AccountPanel() {
  const open = useUI((state) => state.onlinePanel);
  const mode = useUI((state) => state.mode);
  const setStore = useUI((state) => state.set);
  const [account, setAccount] = useState<OnlineUser | null | undefined>(undefined);
  const [saves, setSaves] = useState<CloudSaveMetadata[]>([]);
  const [competitions, setCompetitions] = useState<OnlineCompetition[]>([]);
  const [showArchivedEvents, setShowArchivedEvents] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ id: string; scope: 'global' | 'friends'; rows: Awaited<ReturnType<typeof getLeaderboard>>['leaderboard'] } | null>(null);
  const [season, setSeason] = useState<Awaited<ReturnType<typeof getSeasonStandings>> | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setStore({ onlinePanel: false }), [setStore]);
  useFloatingPanelFocus(open, panelRef, close);

  const refresh = useCallback(async () => {
    setNotice('');
    try {
      const user = await getAccount();
      setAccount(user);
      if (user) {
        try {
          setSaves(await listCloudSaves());
        } catch (error) {
          setSaves([]);
          setNotice(error instanceof Error ? error.message : 'Cloud saves could not be loaded.');
        }
        try {
          setSeason(await getSeasonStandings());
        } catch {
          setSeason(null);
        }
      } else {
        setSaves([]);
        setSeason(null);
      }
    } catch (error) {
      setAccount(null);
      setNotice(error instanceof Error ? error.message : 'The online service is unavailable.');
    }
    try {
      setCompetitions((await listCompetitions()).competitions);
      setShowArchivedEvents(false);
    } catch {
      setCompetitions([]);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('auth')) {
      setStore({ onlinePanel: true });
      const status = url.searchParams.get('auth');
      setNotice(status === 'signed-in' ? 'Welcome to the clubhouse.' : 'Google sign-in was not completed.');
      url.searchParams.delete('auth');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url);
    }
  }, [setStore]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setNotice('');
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Online request failed.');
    } finally {
      setBusy('');
    }
  };

  const saveToCloud = (slot: string) => run(`save-${slot}`, async () => {
    const snapshot = JSON.parse(exportSaveText()) as Record<string, unknown>;
    const current = saves.find((save) => save.slot === slot);
    await uploadCloudSave(slot, {
      name: S.courseName,
      expectedRevision: current?.revision ?? 0,
      courseHash: currentCourseHash(),
      snapshot,
    });
    setSaves(await listCloudSaves());
    setNotice(`${S.courseName} is safe in the cloud.`);
  });

  const loadFromCloud = (slot: string) => run(`load-${slot}`, async () => {
    const result = await downloadCloudSave(slot);
    if (!window.confirm(`Replace the current course with "${result.metadata.name}"?`)) return;
    if (!importSaveText(JSON.stringify(result.snapshot))) throw new Error('That cloud save is incompatible with this game version.');
    setStore({ onlinePanel: false });
  });

  const publish = () => run('publish', async () => {
    if (!S.holes.length) throw new Error('Build at least one hole before publishing.');
    const snapshot = JSON.parse(exportSaveText()) as Record<string, unknown>;
    const course = await publishCurrentCourse({
      name: S.courseName,
      theme: S.theme,
      courseHash: currentCourseHash(),
      holes: S.holes.length,
      par: S.holes.reduce((total, hole) => total + hole.par, 0),
      visibility: 'public',
      snapshot,
    });
    setNotice(`Published as ${course.name}. It can now be selected for competitions.`);
    setCompetitions((await listCompetitions()).competitions);
  });

  const joinCompetition = (competition: OnlineCompetition) => run(`play-${competition.id}`, async () => {
    if (mode === 'play') throw new Error('Finish or abandon the current round first.');
    if (!window.confirm(`Play ${competition.title} on ${competition.course.name}? Your home course will return after the round.`)) return;
    const { course } = await downloadCompetitionCourse(competition.id);
    if (!startCompetitionRound(course.snapshot, competition.kind, competition.id)) throw new Error('The competition round could not be started.');
    setStore({ onlinePanel: false });
  });

  const showLeaderboard = (competition: OnlineCompetition, scope: 'global' | 'friends' = 'global') => run(`board-${competition.id}`, async () => {
    setLeaderboard({ id: competition.id, scope, rows: (await getLeaderboard(competition.id, scope === 'friends')).leaderboard });
  });

  return (
    <section className="managementPanel onlinePanel" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="online-title" tabIndex={-1}>
      <div className="panelHead">
        <span className="panelTitleMark onlineMark"><Icon name="account" size={20} /></span>
        <div><h2 id="online-title">Clubhouse Online</h2><p>Account · cloud locker · live events</p></div>
        <button className="iconButton panelClose" aria-label="Close online clubhouse" onClick={close}><Icon name="close" size={16} /></button>
      </div>

      {notice && <div className="onlineNotice" role="status">{notice}</div>}

      <div className="onlineAccountCard">
        {account === undefined ? <span>Checking membership…</span> : account ? (
          <>
            {account.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatarFallback"><Icon name="account" size={20} /></span>}
            <div><b>{account.displayName}</b><small>{account.email}</small></div>
            <span className="memberBadge">MEMBER</span>
            <button disabled={!!busy} onClick={() => void run('sync-profile', async () => {
              const local = JSON.parse(exportRoundHistoryText()) as { rounds?: unknown };
              const rounds = (Array.isArray(local.rounds) ? local.rounds : []) as RoundRecord[];
              const synced = await syncProfileRounds(rounds);
              importRoundHistoryText(JSON.stringify({ rounds: synced.rounds }));
              setNotice(`${synced.rounds.length} scorecards synchronized${synced.imported ? ` · ${synced.imported} uploaded` : ''}.`);
            })}>{busy === 'sync-profile' ? 'Syncing…' : 'Sync scorecards'}</button>
            <button disabled={!!busy} onClick={() => void run('logout', async () => { await signOut(); setAccount(null); setSaves([]); })}>Sign out</button>
          </>
        ) : (
          <>
            <span className="avatarFallback"><Icon name="account" size={20} /></span>
            <div><b>Local guest</b><small>Your course stays on this browser</small></div>
            <button className="googleSignIn" onClick={beginGoogleSignIn}>Continue with Google</button>
          </>
        )}
      </div>

      <div className="onlineColumns">
        <section className="onlineSection">
          <header><Icon name="cloud" size={17} /><div><h3>Cloud locker</h3><p>Five-device-safe revision checks</p></div></header>
          {account ? <div className="cloudSlots">
            {CLOUD_SLOTS.map(({ id, label }) => {
              const save = saves.find((item) => item.slot === id);
              return <div className="cloudSlot" key={id}>
                <strong>{label}</strong>
                <div><b>{save?.name ?? 'Empty locker'}</b><small>{save ? `Revision ${save.revision} · ${new Date(save.updatedAt).toLocaleString()}` : 'Ready for a course'}</small></div>
                <button disabled={!!busy} onClick={() => void saveToCloud(id)}>{busy === `save-${id}` ? 'Saving…' : 'Save'}</button>
                <button disabled={!save || !!busy} onClick={() => void loadFromCloud(id)}>Load</button>
                <button className="dangerMini" aria-label={`Delete cloud slot ${label}`} disabled={!save || !!busy} onClick={() => save && window.confirm(`Delete "${save.name}" from the cloud?`) && void run(`delete-${id}`, async () => { await removeCloudSave(id, save.revision); setSaves(await listCloudSaves()); })}>×</button>
              </div>;
            })}
          </div> : <div className="onlineEmpty">Sign in to keep named course saves synchronized across browsers.</div>}
          <button className="onlinePrimary" disabled={!account || !!busy || !S.holes.length} onClick={() => void publish()}><Icon name="publish" size={15} /> {busy === 'publish' ? 'Publishing…' : 'Publish current course'}</button>
        </section>

        <section className="onlineSection competitionSection">
          <header><Icon name="trophy" size={17} /><div><h3>Club competitions</h3><p>{showArchivedEvents ? 'Completed events and final boards' : 'Daily · weekly · one-card championship'}</p></div><button className="eventArchiveToggle" disabled={!!busy} onClick={() => void run('events', async () => { const archive = !showArchivedEvents; setCompetitions((await listCompetitions(archive)).competitions); setShowArchivedEvents(archive); setLeaderboard(null); })}>{showArchivedEvents ? 'Live events' : 'History'}</button></header>
          {account && season && <div className="seasonStrip"><span><small>{season.season.id}</small><b>Club season</b></span><span><small>Your standing</small><b>{season.me ? `#${season.me.rank} · ${season.me.points} pts` : 'Unranked'}</b></span><span><small>Season leader</small><b>{season.standings[0] ? `${season.standings[0].displayName} · ${season.standings[0].points}` : 'First event pending'}</b></span></div>}
          {!competitions.length ? <div className="onlineEmpty">{showArchivedEvents ? 'No completed events yet.' : 'No live events yet. Publish a course to seed the first rotation.'}</div> : competitions.map((competition) => (
            <article className={`competitionCard ${competition.kind}`} key={competition.id}>
              <div className="competitionType">{competition.kind}</div>
              <div className="competitionInfo"><b>{competition.course.name}</b><span>{competition.course.holes} holes · par {competition.course.par} · by {competition.course.owner}{competition.kind === 'tournament' ? ` · one card · top ${competition.rules.qualificationCut ?? 64}` : ''}</span><small>{showArchivedEvents ? `Final · ${new Date(competition.endsAt).toLocaleDateString()}` : countdown(competition.endsAt)}</small></div>
              <button disabled={showArchivedEvents || !account || !!busy || mode === 'play'} onClick={() => void joinCompetition(competition)}>{showArchivedEvents ? 'Closed' : 'Play'}</button>
              <button disabled={!!busy} onClick={() => void showLeaderboard(competition)}>Board</button>
            </article>
          ))}
          {leaderboard && <div className="leaderboard">
            <div className="leaderboardHead"><b>{leaderboard.scope === 'friends' ? 'Friends board' : 'Global leaderboard'}</b>{account && <><button className={leaderboard.scope === 'global' ? 'active' : ''} onClick={() => { const competition = competitions.find((item) => item.id === leaderboard.id); if (competition) void showLeaderboard(competition, 'global'); }}>Global</button><button className={leaderboard.scope === 'friends' ? 'active' : ''} onClick={() => { const competition = competitions.find((item) => item.id === leaderboard.id); if (competition) void showLeaderboard(competition, 'friends'); }}>Friends</button></>}<button onClick={() => setLeaderboard(null)}>Close</button></div>
            {leaderboard.rows.length ? leaderboard.rows.slice(0, 10).map((row) => <div className="leaderRow" key={`${leaderboard.id}-${row.rank}`}><strong>{row.rank}</strong><span>{row.player.displayName}</span><b>{relativeScore(row.scoreToPar)}</b><small>{row.verificationStatus}</small></div>) : <p>No completed rounds yet. The first tee is yours.</p>}
          </div>}
          <p className="provisionalNote">Competition cards are marked provisional until server-side shot replay is added.</p>
        </section>
      </div>
      {account && <OnlineSocial
        account={account}
        mode={mode}
        busy={busy}
        run={run}
        setNotice={setNotice}
        setAccount={setAccount}
        close={() => setStore({ onlinePanel: false })}
      />}
    </section>
  );
}
