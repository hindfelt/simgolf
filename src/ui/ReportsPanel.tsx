import { useUI } from './store';
import { S } from '../game/state';
import { empWagesPerSec } from '../game/employees';
import { openFacilityCount, passiveIncomePerSec } from '../game/buildings';
import { fmt$ } from '../game/rng';
import Icon from './Icon';

export default function ReportsPanel() {
  const open = useUI((s) => s.reportsPanel);
  const cash = useUI((s) => s.cash);
  const fee = useUI((s) => s.fee);
  const rep = useUI((s) => s.rep);
  const golfers = useUI((s) => s.golfers);
  const setStore = useUI((s) => s.set);
  if (!open) return null;

  const income = passiveIncomePerSec();
  const wages = empWagesPerSec();
  const net = income - wages;
  const rate = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(1)}`;
  const avgBeauty = S.holes.length ? S.holes.reduce((sum, h) => sum + h.beauty, 0) / S.holes.length : 0;
  const closed = S.buildings.filter((b) => !b.open && b.kind !== 'bench' && b.kind !== 'flowerbed').length;
  const arrivalRate = S.served + S.lost ? Math.round((S.served / (S.served + S.lost)) * 100) : 100;

  return (
    <section className="managementPanel reportsPanel" role="dialog" aria-modal="false" aria-labelledby="reports-title">
      <header className="panelHead">
        <div className="panelTitleMark"><Icon name="report" size={22} /></div>
        <div>
          <h2 id="reports-title">Course report</h2>
          <p>Live operating picture</p>
        </div>
        <button className="iconButton panelClose" aria-label="Close course report" onClick={() => setStore({ reportsPanel: false })}>
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="reportHero">
        <div><span>Bank balance</span><strong>{fmt$(cash)}</strong></div>
        <div><span>Reputation</span><strong>{rep.toFixed(1)} / 5</strong></div>
        <div><span>Green fee</span><strong>{fmt$(fee)} / hole</strong></div>
      </div>

      <div className="reportGrid">
        <article><span>On course</span><strong>{golfers}</strong><small>{S.served} holes served</small></article>
        <article><span>Facilities</span><strong>{openFacilityCount()}</strong><small>{closed ? `${closed} need a path` : 'all connected'}</small></article>
        <article><span>Cash flow</span><strong className={net < 0 ? 'negative' : 'positive'}>{net >= 0 ? '+' : ''}{rate(net)}/s</strong><small>{rate(income)} income · {rate(wages)} wages</small></article>
        <article><span>Guest conversion</span><strong>{arrivalRate}%</strong><small>{S.lost} walked away</small></article>
      </div>

      <div className="reportSectionHead">
        <h3>Hole card</h3>
        <span>Average scenery {Math.round(avgBeauty * 100)}%</span>
      </div>
      <div className="holeReport">
        {S.holes.map((h, i) => (
          <div className="holeRow" key={h.id}>
            <b>{i + 1}</b>
            <span>Par {h.par}</span>
            <div className="beautyMeter" aria-label={`Hole ${i + 1} scenery ${Math.round(h.beauty * 100)} percent`}>
              <i style={{ width: `${Math.round(h.beauty * 100)}%` }} />
            </div>
            <em>{Math.round(h.beauty * 100)}%</em>
          </div>
        ))}
      </div>

      {(closed > 0 || net < 0 || S.lost > 0) && (
        <div className="reportAlerts">
          {closed > 0 && <p><b>Connection:</b> {closed} facilit{closed === 1 ? 'y needs' : 'ies need'} a pathway to the clubhouse.</p>}
          {net < 0 && <p><b>Cash flow:</b> Staff wages exceed passive property income.</p>}
          {S.lost > 0 && <p><b>Pricing:</b> {S.lost} golfer{S.lost === 1 ? ' has' : 's have'} rejected your current offer.</p>}
        </div>
      )}
    </section>
  );
}
