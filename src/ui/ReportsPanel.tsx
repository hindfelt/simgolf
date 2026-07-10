import { useState } from 'react';
import { useUI } from './store';
import { S } from '../game/state';
import { empWagesPerSec } from '../game/employees';
import { facilityMaintenancePerSec, openFacilityCount, passiveIncomePerSec, upgradedFacilityCount, upgradingFacilityCount } from '../game/buildings';
import { fmt$ } from '../game/rng';
import { moveHole, renumberByProximity, hostTournament, canHostTournament, tournamentUnlocked, GOAL_DEFS, setHoleFee } from '../game/engine';
import Icon from './Icon';
import { SGA_CLASS_INFO, sgaFeeMultiplier } from '../game/sga';
import { FINANCE_CATEGORY_INFO, financialYearAt, summarizeFinance } from '../game/finance';
import { membershipActive } from '../game/memberships';

const TOURNAMENT_PURSE = 1500;

/** A small SVG sparkline: values normalized into a 0..height band, oldest to newest, left to right. */
function Sparkline({ values, max, color, width = 220, height = 34 }: { values: number[]; max: number; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <div className="sparklineEmpty">Not enough history yet — check back in a bit.</div>;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (Math.max(0, Math.min(max, v)) / max) * height).toFixed(1)}`).join(' ');
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function FinancialReport({ cash }: { cash: number }) {
  const currentYear = financialYearAt(S.time);
  const years = summarizeFinance(S.financeLedger, currentYear);
  const current = years.find((year) => year.year === currentYear)!;
  const categories = Object.entries(current.categories)
    .filter(([, amount]) => amount)
    .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!));
  const ledger = [...S.financeLedger].sort((a, b) => b.time - a.time || b.id - a.id).slice(0, 45);
  const ledgerBalance = S.financeLedger.reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <div className="financialReport">
      <div className="reportHero reportHeroFinancial">
        <div><span>Year {currentYear} income</span><strong className="positive">+{fmt$(current.income)}</strong></div>
        <div><span>Year {currentYear} expenses</span><strong className="negative">−{fmt$(current.expenses)}</strong></div>
        <div><span>Operating profit</span><strong className={current.profit < 0 ? 'negative' : 'positive'}>{current.profit >= 0 ? '+' : '−'}{fmt$(Math.abs(current.profit))}</strong></div>
      </div>

      <div className="financeReconcile">
        <span>Bank balance</span><b>{fmt$(cash)}</b>
        <small>{ledgerBalance === cash ? 'Ledger reconciled' : `Ledger balance ${fmt$(ledgerBalance)}`}</small>
      </div>

      <div className="reportSectionHead"><h3>Year {currentYear} breakdown</h3><span>Operating categories</span></div>
      <div className="financeBreakdown">
        {categories.length === 0 && <p className="commentEmpty">No operating transactions in this year yet.</p>}
        {categories.map(([category, amount]) => (
          <div key={category}>
            <span>{FINANCE_CATEGORY_INFO[category as keyof typeof FINANCE_CATEGORY_INFO].label}</span>
            <b className={amount! < 0 ? 'negative' : 'positive'}>{amount! >= 0 ? '+' : '−'}{fmt$(Math.abs(amount!))}</b>
          </div>
        ))}
      </div>

      <div className="reportSectionHead"><h3>Annual statements</h3><span>Newest first</span></div>
      <div className="financeTableWrap">
        <table className="financeTable">
          <thead><tr><th>Year</th><th>Income</th><th>Expenses</th><th>Profit</th><th>Capital</th></tr></thead>
          <tbody>{years.map((year) => (
            <tr key={year.year} className={year.year === currentYear ? 'financeCurrentYear' : ''}>
              <th>Year {year.year}</th>
              <td className="positive">+{fmt$(year.income)}</td>
              <td className="negative">−{fmt$(year.expenses)}</td>
              <td className={year.profit < 0 ? 'negative' : 'positive'}>{year.profit >= 0 ? '+' : '−'}{fmt$(Math.abs(year.profit))}</td>
              <td>{year.capital ? fmt$(year.capital) : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="reportSectionHead"><h3>General ledger</h3><span>{S.financeLedger.length} journal lines</span></div>
      <div className="financeLedger">
        {ledger.map((entry) => (
          <div key={entry.id}>
            <span className="financeLedgerYear">Y{entry.year}</span>
            <span><b>{entry.detail}</b><small>{FINANCE_CATEGORY_INFO[entry.category].label}</small></span>
            <strong className={entry.amount < 0 ? 'negative' : 'positive'}>{entry.amount >= 0 ? '+' : '−'}{fmt$(Math.abs(entry.amount))}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembershipReport() {
  const year = financialYearAt(S.time);
  const roster = S.regulars.slice().sort((a, b) => {
    const active = Number(membershipActive(b.membership, year)) - Number(membershipActive(a.membership, year));
    return active || (b.lifetimeSpend ?? 0) - (a.lifetimeSpend ?? 0) || b.visits - a.visits;
  });
  const activeMembers = roster.filter((regular) => membershipActive(regular.membership, year));
  const lifetime = activeMembers.filter((regular) => regular.membership?.tier === 'lifetime').length;
  const membershipRevenue = S.financeLedger.filter((entry) => entry.category === 'memberships' && entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const onCourse = new Set(S.golfers.map((golfer) => golfer.name));
  return (
    <div className="membershipReport">
      <div className="reportHero">
        <div><span>Active members</span><strong>{activeMembers.length}</strong></div>
        <div><span>Lifetime members</span><strong>{lifetime}</strong></div>
        <div><span>Membership revenue</span><strong>{fmt$(membershipRevenue)}</strong></div>
      </div>
      <p className="membershipExplainer">Happy repeat guests can join after three complete visits. Active members receive 10% off green fees and are three times more likely to return; exceptional annual members can upgrade for life.</p>
      <div className="reportSectionHead"><h3>Membership roster</h3><span>Financial year {year}</span></div>
      <div className="membershipRoster">
        {roster.map((regular) => {
          const active = membershipActive(regular.membership, year);
          const membership = regular.membership;
          const status = membership?.tier === 'lifetime'
            ? 'Lifetime member'
            : membership
              ? active ? `Annual · through Y${membership.expiresYear}` : `Annual · expired Y${membership.expiresYear}`
              : 'Prospective guest';
          return (
            <div className={`membershipRow ${active ? 'membershipActive' : ''}`} key={regular.name}>
              <span className="memberIdentity"><b>{regular.name}</b><small>{status}{onCourse.has(regular.name) ? ' · on course' : ''}</small></span>
              <span><b>{regular.visits}</b><small>visits</small></span>
              <span><b>{regular.holesPlayed ?? 0}</b><small>holes</small></span>
              <span><b>{fmt$(regular.lifetimeSpend ?? 0)}</b><small>lifetime spend</small></span>
              <span><b>{membership ? fmt$(membership.paid) : '—'}</b><small>dues</small></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPanel() {
  const open = useUI((s) => s.reportsPanel);
  const cash = useUI((s) => s.cash);
  const fee = useUI((s) => s.fee);
  const rep = useUI((s) => s.rep);
  const golfers = useUI((s) => s.golfers);
  const setStore = useUI((s) => s.set);
  useUI((s) => s.holesVersion); // subscribe so reordering re-renders the hole card
  useUI((s) => s.simTick); // subscribe so the tournament countdown + goal checks stay live
  const [tab, setTab] = useState<'course' | 'financial' | 'members'>('course');
  if (!open) return null;

  const income = passiveIncomePerSec();
  const wages = empWagesPerSec();
  const maintenance = facilityMaintenancePerSec();
  const net = income - wages - maintenance;
  const rate = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(1)}`;
  const avgBeauty = S.holes.length ? S.holes.reduce((sum, h) => sum + h.beauty, 0) / S.holes.length : 0;
  const avgInterest = S.holes.length ? S.holes.reduce((sum, h) => sum + h.interest, 0) / S.holes.length : 0;
  const closed = S.buildings.filter((b) => !b.open && b.kind !== 'bench' && b.kind !== 'flowerbed' && b.kind !== 'landmark').length;
  const arrivalRate = S.served + S.lost ? Math.round((S.served / (S.served + S.lost)) * 100) : 100;

  return (
    <section className="managementPanel reportsPanel" role="dialog" aria-modal="false" aria-labelledby="reports-title">
      <header className="panelHead">
        <div className="panelTitleMark"><Icon name="report" size={22} /></div>
        <div>
          <h2 id="reports-title">Resort reports</h2>
          <p>{tab === 'course' ? 'Course operations' : tab === 'financial' ? 'Financial report' : 'Membership roster'}</p>
        </div>
        <button className="iconButton panelClose" aria-label="Close course report" onClick={() => setStore({ reportsPanel: false })}>
          <Icon name="close" size={16} />
        </button>
      </header>

      <nav className="reportTabs" aria-label="Report type">
        <button className={tab === 'course' ? 'active' : ''} onClick={() => setTab('course')}>Course</button>
        <button className={tab === 'financial' ? 'active' : ''} onClick={() => setTab('financial')}>Financial</button>
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Membership</button>
      </nav>

      {tab === 'financial' && <FinancialReport cash={cash} />}
      {tab === 'members' && <MembershipReport />}
      {tab === 'course' && <>

      <div className="reportHero">
        <div><span>Bank balance</span><strong>{fmt$(cash)}</strong></div>
        <div><span>Reputation</span><strong>{rep.toFixed(1)} / 5</strong></div>
        <div><span>Green fee</span><strong>{fmt$(fee)} / hole</strong></div>
      </div>

      <div className="reportGrid">
        <article><span>On course</span><strong>{golfers}</strong><small>{S.served} holes served</small></article>
        <article><span>Facilities</span><strong>{openFacilityCount()}</strong><small>{upgradedFacilityCount()} upgraded{upgradingFacilityCount() ? ` · ${upgradingFacilityCount()} building` : closed ? ` · ${closed} need a path` : ''}</small></article>
        <article><span>Cash flow</span><strong className={net < 0 ? 'negative' : 'positive'}>{net >= 0 ? '+' : ''}{rate(net)}/s</strong><small>{rate(income)} income · {rate(wages)} wages · {rate(maintenance)} upkeep</small></article>
        <article><span>Guest conversion</span><strong>{arrivalRate}%</strong><small>{S.lost} walked away</small></article>
      </div>

      <div className="reportSectionHead">
        <h3>Histograph</h3>
        <span>Reputation over time</span>
      </div>
      <Sparkline values={S.history.map((h) => h.rep)} max={5} color="#e9b53c" />

      <div className="reportSectionHead">
        <h3>Goals</h3>
        <span>{GOAL_DEFS.filter((g) => S.goalsAchieved[g.id]).length} / {GOAL_DEFS.length} complete</span>
      </div>
      <ul className="goalList">
        {GOAL_DEFS.map((g) => (
          <li key={g.id} className={S.goalsAchieved[g.id] ? 'goalDone' : ''}>
            <span className="goalCheck">{S.goalsAchieved[g.id] ? '✓' : '○'}</span>
            {g.label}
          </li>
        ))}
      </ul>

      <div className="reportSectionHead">
        <h3>Tournament</h3>
      </div>
      {S.tournament ? (
        <p className="tournamentStatus">
          🏆 In progress — {Math.ceil(S.tournament.timeLeft)}s left · {S.tournament.entrants} entrants · ${TOURNAMENT_PURSE} purse
        </p>
      ) : (
        <>
          <button className="routingButton" disabled={!canHostTournament()} onClick={() => hostTournament()}>
            Host weekend tournament (${TOURNAMENT_PURSE} purse)
          </button>
          {!tournamentUnlocked() && <p className="tournamentStatus">Reach 3★ reputation to unlock tournaments.</p>}
          {tournamentUnlocked() && S.holes.length < 3 && <p className="tournamentStatus">Build at least 3 holes to host one.</p>}
          {tournamentUnlocked() && S.holes.length >= 3 && S.cash < TOURNAMENT_PURSE && (
            <p className="tournamentStatus">Need {fmt$(TOURNAMENT_PURSE)} cash on hand.</p>
          )}
          {tournamentUnlocked() && S.holes.length >= 3 && S.cash >= TOURNAMENT_PURSE && S.tournamentCooldown > 0 && (
            <p className="tournamentStatus">Next tournament available in {Math.ceil(S.tournamentCooldown)}s.</p>
          )}
        </>
      )}

      <div className="reportSectionHead">
        <h3>Hole card</h3>
        <span>Scenery {Math.round(avgBeauty * 100)}% · Excitement {Math.round(avgInterest * 100)}%</span>
      </div>
      {S.holes.length > 2 && (
        <button className="routingButton" onClick={() => renumberByProximity()}>
          Renumber by proximity — shortest walk
        </button>
      )}
      <div className="holeReport">
        {S.holes.map((h, i) => (
          <div className="holeRow" key={h.id}>
            <div className="holeRowHead">
              <b>{i + 1}</b>
              <span>Par {h.par}</span>
              <span className={`sgaBadge sga-${h.sgaClass ?? 'Breather'}`} title={SGA_CLASS_INFO[h.sgaClass ?? 'Breather'].description}>{h.top18 ? '★ ' : ''}{h.sgaClass ?? 'Breather'}</span>
              <div className="holeReorder">
                <button
                  aria-label={`Move hole ${i + 1} earlier in play order`}
                  disabled={i === 0}
                  onClick={() => moveHole(i, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move hole ${i + 1} later in play order`}
                  disabled={i === S.holes.length - 1}
                  onClick={() => moveHole(i, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
            <div className="holeStat">
              <span>Scenery</span>
              <div className="beautyMeter" aria-label={`Hole ${i + 1} scenery ${Math.round(h.beauty * 100)} percent`}>
                <i style={{ width: `${Math.round(h.beauty * 100)}%` }} />
              </div>
              <em>{Math.round(h.beauty * 100)}%</em>
            </div>
            <div className="holeStat">
              <span>Excitement</span>
              <div className="interestMeter" aria-label={`Hole ${i + 1} excitement ${Math.round(h.interest * 100)} percent`}>
                <i style={{ width: `${Math.round(h.interest * 100)}%` }} />
              </div>
              <em>{Math.round(h.interest * 100)}%</em>
            </div>
            <div className="holeSkillDemand" title={SGA_CLASS_INFO[h.sgaClass ?? 'Breather'].description}>
              <span>Tests</span>
              {(['length', 'accuracy', 'imagination'] as const).map((skill) => <i key={skill} className={(h.skillDemand?.[skill] ?? 0) >= (skill === 'imagination' ? .34 : skill === 'length' ? .48 : .42) ? 'required' : ''}><b>{skill[0].toUpperCase()}</b><em style={{ width: `${Math.round((h.skillDemand?.[skill] ?? 0) * 100)}%` }} /></i>)}
              <strong>{SGA_CLASS_INFO[h.sgaClass ?? 'Breather'].skills}</strong>
            </div>
            <div className="holeFeeRow">
              <span>Fee</span>
              <button aria-label={`Lower hole ${i + 1} fee`} onClick={() => setHoleFee(h.id, (h.fee ?? fee) - 5)}>−</button>
              <em className={h.fee != null ? 'holeFeeCustom' : ''}>{h.fee != null ? fmt$(h.fee) : `${fmt$(fee)} (global)`}</em>
              <button aria-label={`Raise hole ${i + 1} fee`} onClick={() => setHoleFee(h.id, (h.fee ?? fee) + 5)}>+</button>
              {h.fee != null && (
                <button aria-label={`Reset hole ${i + 1} fee to the global rate`} title="Reset to global fee" onClick={() => setHoleFee(h.id, null)}>
                  ↺
                </button>
              )}
            </div>
            {(h.top100 || h.top18) && <div className="sgaAccreditation"><span>{h.top18 ? '★ SGA Top 18 hole' : 'SGA Top 100 hole'}</span><b>Fee revenue ×{sgaFeeMultiplier(h).toFixed(2)}</b></div>}
          </div>
        ))}
      </div>

      {(closed > 0 || net < 0 || S.lost > 0) && (
        <div className="reportAlerts">
          {closed > 0 && <p><b>Connection:</b> {closed} facilit{closed === 1 ? 'y needs' : 'ies need'} a pathway to the clubhouse.</p>}
          {net < 0 && <p><b>Cash flow:</b> Staff wages and facility upkeep exceed passive property income.</p>}
          {maintenance > income && maintenance > 0 && <p><b>Upkeep:</b> Facility maintenance exceeds passive property income.</p>}
          {S.lost > 0 && <p><b>Pricing:</b> {S.lost} golfer{S.lost === 1 ? ' has' : 's have'} rejected your current offer.</p>}
        </div>
      )}

      <div className="reportSectionHead">
        <h3>Player comments</h3>
        <span>{S.comments.length} logged</span>
      </div>
      <div className="commentLog">
        {S.comments.length === 0 && <p className="commentEmpty">Nothing yet — golfers will speak up once they're on course.</p>}
        {S.comments.slice(-15).reverse().map((c) => (
          <div className="commentRow" key={c.id}>
            <b className={c.cls === 'bad' ? 'commentBad' : c.cls === 'money' ? 'commentMoney' : ''}>{c.name}</b>
            <span>{c.txt}</span>
          </div>
        ))}
      </div>
      </>}
    </section>
  );
}
