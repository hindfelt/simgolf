import { useUI } from './store';
import { selectBuilding } from '../game/engine';
import { CATALOG } from '../game/buildings';
import { fmt$ } from '../game/rng';
import type { BuildingKind } from '../game/types';

const ORDER: BuildingKind[] = [
  'proshop',
  'snackbar',
  'drivingrange',
  'puttinggreen',
  'cartgarage',
  'hotel',
  'tennis',
  'marina',
  'airstrip',
  'buildinglot',
  'bench',
  'flowerbed',
];

export default function BuildPanel() {
  const open = useUI((s) => s.buildPanel);
  const cash = useUI((s) => s.cash);
  const setStore = useUI((s) => s.set);
  if (open === false) return null;

  return (
    <div className="buildPanel">
      <div className="bpHead">
        <b>Facilities</b>
        <span>Pick one, tap the course, then wire it to the clubhouse with a pathway.</span>
        <button className="bpClose" onClick={() => setStore({ buildPanel: false })}>
          ✕
        </button>
      </div>
      <div className="bpGrid">
        {ORDER.map((k) => {
          const d = CATALOG[k];
          const afford = cash >= d.cost;
          return (
            <button
              key={k}
              className={'bpItem' + (afford ? '' : ' broke')}
              disabled={!afford}
              onClick={() => {
                selectBuilding(k);
                setStore({ buildPanel: false });
              }}
            >
              <div className="bpIc">{d.short}</div>
              <div className="bpName">{d.name}</div>
              <div className="bpCost">{fmt$(d.cost)}</div>
              <div className="bpBlurb">{d.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
