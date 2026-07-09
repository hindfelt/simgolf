import { useUI } from './store';
import { hireEmployee, fireEmployee } from '../game/engine';
import { EMP_CATALOG, hireCost, countEmp, skilledUnlocked, empWagesPerSec } from '../game/employees';
import { fmt$ } from '../game/rng';
import type { EmployeeKind } from '../game/types';
import Icon, { type IconName } from './Icon';

const ORDER: EmployeeKind[] = ['clubpro', 'ranger', 'groundskeeper', 'sodavendor', 'celebrity', 'marshall', 'turftech', 'refreshment'];

const ICONS: Record<EmployeeKind, IconName> = {
  clubpro: 'staff',
  ranger: 'fast',
  groundskeeper: 'terrain',
  sodavendor: 'water',
  celebrity: 'reputation',
  marshall: 'staff',
  turftech: 'fair',
  refreshment: 'fee',
};

export default function StaffPanel() {
  const open = useUI((s) => s.staffPanel);
  const cash = useUI((s) => s.cash);
  useUI((s) => s.staffVersion); // subscribe so roster edits re-render
  const setStore = useUI((s) => s.set);
  if (open === false) return null;

  const locked = !skilledUnlocked();

  return (
    <section className="buildPanel" role="dialog" aria-modal="false" aria-labelledby="staff-title">
      <div className="bpHead">
        <b id="staff-title">Staff</b>
        <span>
          Total wages: {fmt$(empWagesPerSec())}/s{locked ? ' · skilled staff unlock at 6 holes' : ''}
        </span>
        <button className="bpClose" aria-label="Close staff" onClick={() => setStore({ staffPanel: false })}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="bpGrid">
        {ORDER.map((k) => {
          const d = EMP_CATALOG[k];
          const n = countEmp(k);
          const cost = hireCost(k);
          const cantHire = (d.skilled && locked) || cash < cost;
          return (
            <div key={k} className="bpItem">
              <div className="bpIc"><Icon name={ICONS[k]} size={22} /></div>
              <div className="bpName">
                {d.name}
                {n > 0 ? ' ×' + n : ''}
              </div>
              <div className="bpCost">
                {fmt$(cost)} · ${d.wage.toFixed(1)}/s
              </div>
              <div className="bpBlurb">
                {d.blurb}
                {d.skilled && locked ? ' (needs 6 holes)' : ''}
              </div>
              <div className="bpBtns">
                <button disabled={cantHire} onClick={() => hireEmployee(k)}>
                  Hire
                </button>
                <button disabled={n === 0} onClick={() => fireEmployee(k)}>
                  Fire
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
