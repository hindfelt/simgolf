import { useCallback, useEffect, useRef, useState } from 'react';
import { S } from '../game/state';
import {
  changeResidentProSkill,
  acceptProChallenge,
  declineProChallenge,
  deleteRetiredCourse,
  retireCourseForChampionship,
  startChampionshipRound,
  exportResidentProText,
  importResidentProText,
  updateResidentPro,
} from '../game/engine';
import { DIFFICULTIES, difficultyDefinition } from '../game/difficulty';
import { PRO_SKILLS } from '../game/proCircuit';
import type { CourseTheme, Difficulty } from '../game/types';
import { fmt$ } from '../game/rng';
import { useUI } from './store';
import Icon from './Icon';
import CharacterPortrait from './CharacterPortrait';
import { useFloatingPanelFocus } from './panelA11y';

const SHIRTS = ['#e9b53c', '#d0453a', '#3f7fd0', '#2fa48a', '#8e5bc0', '#efefef'];
const CAPS = ['#fffdf2', '#e9b53c', '#3f7fd0', '#d0453a', '#263b31', '#8e5bc0'];
const SKINS = ['#f1c6a0', '#e0a878', '#c98a5e', '#8d5a3a', '#6b4226', '#f6d7b8'];
const THEME_COLOR: Record<CourseTheme, string> = { parklands: '#5e9143', links: '#8c9564', desert: '#b48a4c', tropical: '#2c9b80' };

const scoreLabel = (score: number) => score === 0 ? 'E' : score > 0 ? `+${score}` : String(score);

export default function ProCircuitPanel() {
  const open = useUI((state) => state.proPanel);
  const version = useUI((state) => state.proVersion);
  useUI((state) => state.simTick);
  const setStore = useUI((state) => state.set);
  const [tab, setTab] = useState<'pro' | 'championship'>('pro');
  const [name, setName] = useState(S.proProfile.name);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [useResident, setUseResident] = useState(true);
  const proFileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setStore({ proPanel: false }), [setStore]);
  useFloatingPanelFocus(open, panelRef, close);

  useEffect(() => setName(S.proProfile.name), [version, open]);
  useEffect(() => {
    if (!S.retiredCourses.some((course) => course.id === selectedCourseId)) setSelectedCourseId(S.retiredCourses[0]?.id ?? '');
  }, [version, open, selectedCourseId]);

  if (!open) return null;
  const pro = S.proProfile;
  const history = S.championshipHistory;
  const selectedCourse = S.retiredCourses.find((course) => course.id === selectedCourseId);

  const retire = () => {
    const courseName = window.prompt('Name this championship course:', S.courseName);
    if (courseName == null) return;
    const retired = retireCourseForChampionship(courseName);
    if (retired) {
      setSelectedCourseId(retired.id);
      setTab('championship');
    }
  };

  const exportPro = () => {
    const blob = new Blob([exportResidentProText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${pro.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'golf-pro'}.fairway-pro.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="managementPanel proCircuitPanel" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="pro-circuit-title" tabIndex={-1}>
      <header className="panelHead">
        <div className="panelTitleMark proMark"><Icon name="trophy" size={22} /></div>
        <div><h2 id="pro-circuit-title">Resident pro &amp; championship</h2><p>Build a golfer · retire a course · compete for money and fame</p></div>
        <button className="iconButton panelClose" aria-label="Close pro circuit" onClick={close}><Icon name="close" size={16} /></button>
      </header>
      <div className="proTabs" role="tablist" aria-label="Pro circuit sections">
        <button role="tab" aria-selected={tab === 'pro'} className={tab === 'pro' ? 'active' : ''} onClick={() => setTab('pro')}>{S.proProfile.name}</button>
        <button role="tab" aria-selected={tab === 'championship'} className={tab === 'championship' ? 'active' : ''} onClick={() => setTab('championship')}>Championship mode <span>{S.retiredCourses.length}</span></button>
      </div>

      {tab === 'pro' ? (
        <div className="proWorkspace">
          <aside className="proIdentityCard">
            <CharacterPortrait name={pro.name} identity={pro.visualSeed} shirt={pro.shirt} skin={pro.skin} cap={pro.cap} expression="pleased" variant="profile" className="proPortrait" />
            <label>Resident pro<input value={name} maxLength={28} onChange={(event) => setName(event.target.value)} onBlur={() => updateResidentPro({ name })} /></label>
            <div className="proPalette"><b>Shirt</b>{SHIRTS.map((color) => <button key={color} aria-label={`Shirt ${color}`} aria-pressed={pro.shirt === color} className={pro.shirt === color ? 'active' : ''} style={{ background: color }} onClick={() => updateResidentPro({ shirt: color })} />)}</div>
            <div className="proPalette"><b>Cap</b>{CAPS.map((color) => <button key={color} aria-label={`Cap ${color}`} aria-pressed={pro.cap === color} className={pro.cap === color ? 'active' : ''} style={{ background: color }} onClick={() => updateResidentPro({ cap: color })} />)}</div>
            <div className="proPalette"><b>Skin</b>{SKINS.map((color) => <button key={color} aria-label={`Skin ${color}`} aria-pressed={pro.skin === color} className={pro.skin === color ? 'active' : ''} style={{ background: color }} onClick={() => updateResidentPro({ skin: color })} />)}</div>
            <div className="proCareer">
              <div><span>Starts</span><b>{pro.starts}</b></div><div><span>Wins</span><b>{pro.wins}</b></div><div><span>Podiums</span><b>{pro.podiums}</b></div>
              <div><span>Earnings</span><b>{fmt$(pro.careerEarnings)}</b></div><div><span>Fame</span><b>{pro.fame}</b></div><div><span>Goals / practice</span><b>{pro.accomplishments.length} / {pro.practiceRounds}</b></div>
            </div>
            <div className="proFileActions"><button onClick={exportPro}><Icon name="save" size={13} /> Save pro</button><button onClick={() => proFileRef.current?.click()}><Icon name="publish" size={13} /> Load pro</button></div>
            <input ref={proFileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) file.text().then(importResidentProText); event.target.value = ''; }} />
          </aside>
          <div className="proSkillsBoard">
            <header><div><span>Skill points</span><strong>{pro.unspentSkillPoints}</strong></div><p>Accomplishments award free points. Finished rounds train the shots you use; practice facilities accelerate progress.</p></header>
            <div className="proSkillGrid">
              {PRO_SKILLS.map((skill) => {
                const level = pro.skills[skill.id];
                const practice = pro.practice[skill.id];
                return (
                  <article key={skill.id}>
                    <div><b>{skill.label}</b><small>{skill.description}</small></div>
                    <div className="skillGrowth">
                      <div className="skillMeter" role="meter" aria-label={`${skill.label} ${level * 10}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={level * 10}><i style={{ width: `${level * 10}%` }} /></div>
                      <div className="practiceMeter" role="progressbar" aria-label={`${skill.label} practice ${practice}% toward next level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={practice}><i style={{ width: `${practice}%` }} /><small>{level >= 10 ? 'MASTERED' : `PRACTICE ${practice}%`}</small></div>
                    </div>
                    <div className="skillStepper"><button disabled={level <= 0} onClick={() => changeResidentProSkill(skill.id, -1)}>−</button><strong>{level * 10}%</strong><button disabled={level >= 10 || pro.unspentSkillPoints <= 0} onClick={() => changeResidentProSkill(skill.id, 1)}>+</button></div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="championshipWorkspace">
          <section className={'proChallengeOffer' + (S.proChallengeOffer ? ' live' : '')}>
            {S.proChallengeOffer ? <>
              <CharacterPortrait
                name={S.proChallengeOffer.opponent.name}
                shirt={S.proChallengeOffer.opponent.shirt}
                skin={S.proChallengeOffer.opponent.skin}
                cap={S.proChallengeOffer.opponent.cap}
                expression="cross"
                variant="simfoto"
                className="touringProPortrait"
              />
              <div className="proChallengeCopy"><span>Incoming SGA pro challenge</span><h3>{S.proChallengeOffer.opponent.name}</h3><b>{S.proChallengeOffer.opponent.title}</b><p>One round on your current course. Every hole won or lost transfers the wager.</p>
                <div className="touringSkills">
                  <i data-label="Length" role="meter" aria-label={`Length ${Math.round(S.proChallengeOffer.opponent.length * 100)} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(S.proChallengeOffer.opponent.length * 100)}><span style={{ width: `${S.proChallengeOffer.opponent.length * 100}%` }} /></i>
                  <i data-label="Accuracy" role="meter" aria-label={`Accuracy ${Math.round(S.proChallengeOffer.opponent.accuracy * 100)} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(S.proChallengeOffer.opponent.accuracy * 100)}><span style={{ width: `${S.proChallengeOffer.opponent.accuracy * 100}%` }} /></i>
                  <i data-label="Imagination" role="meter" aria-label={`Imagination ${Math.round(S.proChallengeOffer.opponent.imagination * 100)} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(S.proChallengeOffer.opponent.imagination * 100)}><span style={{ width: `${S.proChallengeOffer.opponent.imagination * 100}%` }} /></i>
                </div>
              </div>
              <div className="challengeTerms"><span>Wager / hole</span><strong>{fmt$(S.proChallengeOffer.wagerPerHole)}</strong><small>Maximum exposure {fmt$(S.proChallengeOffer.wagerPerHole * S.holes.length)} · {Math.ceil(S.proChallengeOffer.remaining)}s left</small><button disabled={!S.sandbox && S.cash < S.proChallengeOffer.wagerPerHole * S.holes.length} onClick={() => acceptProChallenge() && setStore({ proPanel: false })}>Accept challenge</button><button className="decline" onClick={declineProChallenge}>Decline</button></div>
            </> : <><Icon name="trophy" size={26} /><div><b>Touring-pro challenges</b><span>{S.holes.length < 3 ? 'Build 3 holes to attract challengers.' : S.rep < 2.8 ? 'Reach 2.8★ reputation to attract challengers.' : `SGA scouts are watching. Next opportunity in about ${Math.ceil(S.proChallengeCooldown)}s.`}</span></div></>}
          </section>
          <section className="retiredCourseSection">
            <header><div><b>Retired championship courses</b><span>Saved independently from normal course slots</span></div><button onClick={retire}><Icon name="save" size={14} /> Retire current course</button></header>
            <div className="retiredCourseList">
              {!S.retiredCourses.length && <div className="circuitEmpty"><Icon name="course" size={26} /><b>No championship courses</b><span>Retire the current course to make it available on the pro circuit.</span></div>}
              {S.retiredCourses.map((course) => (
                <div key={course.id} className={'retiredCourseCard' + (selectedCourseId === course.id ? ' active' : '')}>
                  <button className="retiredCourseSelect" aria-pressed={selectedCourseId === course.id} onClick={() => setSelectedCourseId(course.id)}>
                    <i style={{ background: THEME_COLOR[course.theme] }} /><span><b>{course.name}</b><small>{course.holes} holes · par {course.par} · {course.theme}</small></span>
                  </button>
                  <button className="retiredCourseRemove" aria-label={`Remove ${course.name} from Championship Mode`} title="Remove course" onClick={() => { if (window.confirm(`Remove ${course.name} from Championship Mode?`)) deleteRetiredCourse(course.id); }}>×</button>
                </div>
              ))}
            </div>
          </section>

          <section className="championshipSetup">
            <div className="circuitTicket">
              <span>Next event</span><b>{selectedCourse ? `${selectedCourse.name} ${pro.starts >= 9 ? 'World Championship' : pro.starts >= 6 ? 'National Invitational' : pro.starts >= 3 ? 'Regional Classic' : 'Club Open'}` : 'Select a retired course'}</b>
              <small>12-player stroke-play field · one official card</small>
            </div>
            <h3>Difficulty</h3>
            <div className="circuitDifficulty" role="group" aria-label="Championship difficulty">{DIFFICULTIES.map((item) => <button key={item.id} aria-pressed={difficulty === item.id} className={difficulty === item.id ? 'active' : ''} onClick={() => setDifficulty(item.id)}><b>{item.label}</b><span>{'◆'.repeat(DIFFICULTIES.indexOf(item) + 1)}</span></button>)}</div>
            <p>{difficultyDefinition(difficulty).description} Stronger fields award larger purses.</p>
            <h3>Pro golfer</h3>
            <div className="proChoice" role="group" aria-label="Championship golfer">
              <button aria-label={`${pro.name}, your saved golfer with ${pro.unspentSkillPoints} unspent skill points`} aria-pressed={useResident} className={useResident ? 'active' : ''} onClick={() => setUseResident(true)}><CharacterPortrait name={pro.name} identity={pro.visualSeed} shirt={pro.shirt} skin={pro.skin} cap={pro.cap} expression="pleased" className="proChoicePortrait" /><span><b>{pro.name}</b><small>Your saved skills · {pro.unspentSkillPoints} points free</small></span></button>
              <button aria-label="Gary Golf, default balanced golfer" aria-pressed={!useResident} className={!useResident ? 'active' : ''} onClick={() => setUseResident(false)}><CharacterPortrait name="Gary Golf" identity="default-tour-pro" shirt="#3f7fd0" skin="#f1c6a0" cap="#efefef" expression="triumphant" className="proChoicePortrait" /><span><b>Gary Golf</b><small>Default balanced pro</small></span></button>
            </div>
            <button className="startChampionship" disabled={!selectedCourse} onClick={() => selectedCourse && startChampionshipRound(selectedCourse.id, difficulty, useResident) && setStore({ proPanel: false })}><Icon name="trophy" size={17} /> Play championship</button>
          </section>

          <section className="circuitHistory">
            <header><b>Pro-circuit record</b><span>{history.length ? `${history.length} event${history.length === 1 ? '' : 's'}` : 'No starts yet'}</span></header>
            {history.slice(0, 6).map((result) => <div key={result.id}><strong className={result.rank === 1 ? 'win' : ''}>#{result.rank}</strong><span><b>{result.title}</b><small>{result.proName} · {result.difficulty}</small></span><em>{scoreLabel(result.standings.find((row) => row.player)?.scoreToPar ?? 0)}</em><b>{fmt$(result.prize)}</b></div>)}
          </section>
          <section className="circuitHistory challengeHistory">
            <header><b>Pro Challenge record</b><span>{S.proChallengeHistory.length ? `${S.proChallengeHistory.length} match${S.proChallengeHistory.length === 1 ? '' : 'es'}` : 'No matches yet'}</span></header>
            {S.proChallengeHistory.slice(0, 6).map((result) => <div key={result.id}><strong className={result.outcome === 'won' ? 'win' : ''}>{result.outcome === 'won' ? 'W' : result.outcome === 'lost' ? 'L' : 'T'}</strong><span><b>{result.proName} vs {result.opponent.name}</b><small>{result.holesWon}-{result.holesLost}-{result.holesTied} · {fmt$(result.wagerPerHole)}/hole</small></span><em>{result.net >= 0 ? '+' : '−'}{fmt$(Math.abs(result.net))}</em><b>{new Date(result.playedAt).toLocaleDateString()}</b></div>)}
          </section>
        </div>
      )}
    </section>
  );
}
