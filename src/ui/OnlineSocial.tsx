import { useCallback, useEffect, useState } from 'react';
import { startChallengeRound } from '../game/engine';
import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  deleteOnlineAccount,
  declineChallenge,
  downloadChallengeCourse,
  followPlayer,
  getChallengeScorecards,
  listChallenges,
  listAccountSessions,
  listPlayers,
  listPublishedCourses,
  unfollowPlayer,
  updateOnlineProfile,
  revokeAccountSession,
  type AccountSession,
  type OnlineChallenge,
  type OnlinePlayer,
  type OnlineUser,
  type PublishedCourse,
  type ChallengeScorecard,
} from '../online/api';
import Icon from './Icon';

interface Props {
  account: OnlineUser;
  mode: 'build' | 'play';
  busy: string;
  run: (key: string, action: () => Promise<void>) => Promise<void>;
  setNotice: (notice: string) => void;
  setAccount: (account: OnlineUser) => void;
  close: () => void;
}

function relativeScore(score: number): string {
  return score === 0 ? 'E' : score > 0 ? `+${score}` : String(score);
}

function timeLeft(timestamp: number): string {
  const hours = Math.max(0, Math.ceil((timestamp - Date.now()) / 3_600_000));
  return hours >= 48 ? `${Math.ceil(hours / 24)} days` : `${hours} hours`;
}

export default function OnlineSocial({ account, mode, busy, run, setNotice, setAccount, close }: Props) {
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [challenges, setChallenges] = useState<OnlineChallenge[]>([]);
  const [courses, setCourses] = useState<PublishedCourse[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(account.displayName);
  const [profileBio, setProfileBio] = useState(account.bio);
  const [profileDiscoverable, setProfileDiscoverable] = useState(account.discoverable);
  const [comparison, setComparison] = useState<{ id: string; cards: ChallengeScorecard[] } | null>(null);
  const [sessions, setSessions] = useState<AccountSession[]>([]);

  const refresh = useCallback(async (search: string) => {
    const [nextPlayers, nextChallenges, nextCourses] = await Promise.all([
      listPlayers(search),
      listChallenges(),
      listPublishedCourses(),
    ]);
    setPlayers(nextPlayers);
    setChallenges(nextChallenges);
    setCourses(nextCourses);
    setSelectedCourse((current) => current || nextCourses[0]?.slug || '');
  }, []);

  useEffect(() => {
    void refresh('').catch((error) => setNotice(error instanceof Error ? error.message : 'Social clubhouse could not be loaded.'));
  }, [refresh, setNotice]);

  const toggleFollow = (player: OnlinePlayer) => void run(`follow-${player.id}`, async () => {
    if (player.isFollowing) await unfollowPlayer(player.id);
    else await followPlayer(player.id);
    setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, isFollowing: !item.isFollowing, followers: item.followers + (item.isFollowing ? -1 : 1) } : item));
  });

  const challengePlayer = (player: OnlinePlayer) => void run(`challenge-${player.id}`, async () => {
    if (!selectedCourse) throw new Error('Publish or select a course before issuing a challenge.');
    const course = courses.find((item) => item.slug === selectedCourse);
    const created = await createChallenge(player.id, selectedCourse, `${account.displayName} vs ${player.displayName}`);
    setChallenges((current) => [created, ...current]);
    setNotice(`Challenge sent to ${player.displayName} on ${course?.name ?? 'the selected course'}.`);
  });

  const reloadChallenges = async () => setChallenges(await listChallenges());

  const playChallenge = (challenge: OnlineChallenge) => void run(`play-challenge-${challenge.id}`, async () => {
    if (mode === 'play') throw new Error('Finish or abandon the current round first.');
    if (!window.confirm(`Play your one official card against ${challenge.role === 'creator' ? challenge.opponent.displayName : challenge.creator.displayName} on ${challenge.course.name}?`)) return;
    const { course } = await downloadChallengeCourse(challenge.id);
    if (!startChallengeRound(course.snapshot, challenge.id)) throw new Error('The challenge round could not be started.');
    close();
  });

  return (
    <section className="onlineSection socialSection">
      <header>
        <Icon name="regulars" size={17} />
        <div><h3>Club members & matches</h3><p>Follow builders · issue one-card challenges</p></div>
        <button className="profileEditButton" onClick={() => {
          const opening = !profileOpen;
          setProfileOpen(opening);
          if (opening) void run('sessions', async () => setSessions(await listAccountSessions()));
        }}>Account settings</button>
      </header>

      {profileOpen && <div className="profileEditor">
        <label><span>Club name</span><input value={profileName} maxLength={40} onChange={(event) => setProfileName(event.target.value)} /></label>
        <label className="profileBio"><span>Bio</span><input value={profileBio} maxLength={180} placeholder="Links architect, pot-bunker enthusiast…" onChange={(event) => setProfileBio(event.target.value)} /></label>
        <label className="discoverToggle"><input type="checkbox" checked={profileDiscoverable} onChange={(event) => setProfileDiscoverable(event.target.checked)} /> Discoverable</label>
        <button disabled={!!busy} onClick={() => void run('profile', async () => {
          const updated = await updateOnlineProfile({ displayName: profileName, bio: profileBio, discoverable: profileDiscoverable });
          setAccount(updated);
          setProfileOpen(false);
          setNotice('Club profile updated.');
        })}>Save profile</button>
        <div className="accountSessions">
          <div><b>Signed-in browsers</b><span>Revoke any session you no longer recognize.</span></div>
          <div className="sessionList">{sessions.map((session) => <span key={session.id}><i>{session.current ? 'This browser' : `Seen ${new Date(session.lastSeenAt).toLocaleDateString()}`}</i>{!session.current && <button disabled={!!busy} onClick={() => void run(`revoke-${session.id}`, async () => { await revokeAccountSession(session.id); setSessions(await listAccountSessions()); })}>Revoke</button>}</span>)}</div>
          <button className="deleteAccountButton" disabled={!!busy} onClick={() => {
            const confirmation = window.prompt('This removes cloud saves, profile data, follows, and submitted scores. Type DELETE to continue.');
            if (confirmation !== 'DELETE') return;
            void run('delete-account', async () => { await deleteOnlineAccount(); window.location.reload(); });
          }}>Delete online account</button>
        </div>
      </div>}

      <div className="socialToolbar">
        <label className="playerSearch"><Icon name="account" size={13} /><input value={query} placeholder="Find a club member" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void run('search', () => refresh(query)); }} /></label>
        <button disabled={!!busy} onClick={() => void run('search', () => refresh(query))}>Search</button>
        <label className="challengeCourse"><span>Match course</span><select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}><option value="">No public courses</option>{courses.map((course) => <option key={course.id} value={course.slug}>{course.name} · {course.holes}H</option>)}</select></label>
      </div>

      <div className="socialGrid">
        <div className="playerDirectory">
          <h4>Player directory</h4>
          {!players.length ? <div className="onlineEmpty">No discoverable members match this search yet.</div> : players.map((player) => <article className="playerCard" key={player.id}>
            {player.avatarUrl ? <img src={player.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="tinyAvatar"><Icon name="account" size={14} /></span>}
            <div><b>{player.displayName}</b><span>{player.bio || `${player.publishedCourses} published course${player.publishedCourses === 1 ? '' : 's'}`}</span><small>{player.followers} followers · {player.publishedCourses} courses</small></div>
            <button className={player.isFollowing ? 'following' : ''} disabled={!!busy} onClick={() => toggleFollow(player)}>{player.isFollowing ? 'Following' : 'Follow'}</button>
            <button disabled={!selectedCourse || !!busy} onClick={() => challengePlayer(player)}>Challenge</button>
          </article>)}
        </div>

        <div className="challengeInbox">
          <h4>Match desk <span>{challenges.filter((challenge) => challenge.status === 'active' || challenge.status === 'pending').length} open</span></h4>
          {!challenges.length ? <div className="onlineEmpty">Challenge another course architect. Each player gets one official card.</div> : challenges.slice(0, 12).map((challenge) => {
            const rival = challenge.role === 'creator' ? challenge.opponent : challenge.creator;
            const myPlayer = challenge.role === 'creator' ? challenge.creator : challenge.opponent;
            const result = challenge.status === 'completed'
              ? challenge.tied ? 'Match tied' : challenge.winnerUserId === account.id ? 'You won' : `${rival.displayName} won`
              : challenge.status === 'pending' ? challenge.role === 'opponent' ? 'Awaiting your answer' : 'Invitation sent'
                : challenge.status === 'active' ? `${timeLeft(challenge.expiresAt)} left` : challenge.status;
            return <article className={`challengeCard ${challenge.status}`} key={challenge.id}>
              <div className="versusBadge"><span>{myPlayer.displayName.slice(0, 1)}</span><i>vs</i><span>{rival.displayName.slice(0, 1)}</span></div>
              <div className="challengeInfo"><b>{rival.displayName}</b><span>{challenge.course.name} · {challenge.course.holes}H · par {challenge.course.par}</span><small>{result}</small></div>
              <div className="challengeScores"><strong>{myPlayer.score ? relativeScore(myPlayer.score.scoreToPar) : '—'}</strong><i>:</i><strong>{rival.score ? relativeScore(rival.score.scoreToPar) : '—'}</strong></div>
              <div className="challengeActions">
                {challenge.status === 'pending' && challenge.role === 'opponent' && <><button disabled={!!busy} onClick={() => void run(`accept-${challenge.id}`, async () => { await acceptChallenge(challenge.id); await reloadChallenges(); })}>Accept</button><button disabled={!!busy} onClick={() => void run(`decline-${challenge.id}`, async () => { await declineChallenge(challenge.id); await reloadChallenges(); })}>Decline</button></>}
                {challenge.canPlay && <button disabled={!!busy || mode === 'play'} onClick={() => playChallenge(challenge)}>Play card</button>}
                {(challenge.creator.score || challenge.opponent.score) && <button disabled={!!busy} onClick={() => void run(`cards-${challenge.id}`, async () => setComparison({ id: challenge.id, cards: await getChallengeScorecards(challenge.id) }))}>Cards</button>}
                {(challenge.status === 'pending' || challenge.status === 'active') && <button className="challengeCancel" disabled={!!busy} onClick={() => window.confirm('Cancel this challenge?') && void run(`cancel-${challenge.id}`, async () => { await cancelChallenge(challenge.id); await reloadChallenges(); })}>×</button>}
              </div>
            </article>;
          })}
          {comparison && <div className="matchCards">
            <div className="matchCardsHead"><b>Hole-by-hole match</b><button onClick={() => setComparison(null)}>Close</button></div>
            <div className="matchCardsScroll"><table><thead><tr><th>Player</th>{comparison.cards[0]?.holes.map((hole) => <th key={hole.hole}>{hole.hole}</th>)}<th>Out</th></tr></thead><tbody>
              <tr className="matchPar"><th>Par</th>{comparison.cards[0]?.holes.map((hole) => <td key={hole.hole}>{hole.par}</td>)}<td>{comparison.cards[0]?.par ?? '—'}</td></tr>
              {comparison.cards.map((card) => <tr key={card.userId}><th>{card.displayName}</th>{card.holes.map((hole) => <td className={hole.scoreToPar < 0 ? 'under' : hole.scoreToPar > 0 ? 'over' : ''} key={hole.hole}>{hole.strokes}</td>)}<td className={card.scoreToPar < 0 ? 'under' : card.scoreToPar > 0 ? 'over' : ''}>{relativeScore(card.scoreToPar)}</td></tr>)}
            </tbody></table></div>
          </div>}
        </div>
      </div>
    </section>
  );
}
