import { useUI } from './store';
import { selectBuilding } from '../game/engine';
import { CATALOG } from '../game/buildings';
import { fmt$ } from '../game/rng';
import type { BuildingKind } from '../game/types';
import Icon, { type IconName } from './Icon';

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

const ICONS: Record<BuildingKind, IconName> = {
  proshop: 'proShop',
  snackbar: 'snackBar',
  drivingrange: 'drivingRange',
  puttinggreen: 'puttingGreen',
  cartgarage: 'cartGarage',
  hotel: 'hotel',
  tennis: 'tennis',
  marina: 'marina',
  airstrip: 'airstrip',
  buildinglot: 'buildingLot',
  bench: 'bench',
  flowerbed: 'flower',
};

export default function BuildPanel() {
  const open = useUI((s) => s.buildPanel);
  const cash = useUI((s) => s.cash);
  const setStore = useUI((s) => s.set);
  if (open === false) return null;

  return (
    <section className="buildPanel" role="dialog" aria-modal="false" aria-labelledby="facilities-title">
      <div className="bpHead">
        <b id="facilities-title">Facilities</b>
        <span>Pick one, tap the course, then wire it to the clubhouse with a pathway.</span>
        <button className="bpClose" aria-label="Close facilities" onClick={() => setStore({ buildPanel: false })}>
          <Icon name="close" size={14} />
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
              <div className={'bpIc bpIc-' + k}><Icon name={ICONS[k]} size={25} /></div>
              <div className="bpName">{d.name}</div>
              <div className="bpCost">
                {fmt$(d.cost)} <span>{d.w}×{d.h}</span>
              </div>
              <div className="bpBlurb">{d.blurb}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
