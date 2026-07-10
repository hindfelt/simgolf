import { useState } from 'react';
import { useUI } from './store';
import { selectBuilding, upgradeFacility } from '../game/engine';
import {
  facilityDisplayName,
  facilityLevel,
  facilityMaintenanceFor,
  facilityUpgradeOptions,
  isUpgradeableFacility,
  themedDef,
} from '../game/buildings';
import { S } from '../game/state';
import { fmt$ } from '../game/rng';
import type { BuildingKind, FacilityBranch } from '../game/types';
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
  'landmark',
  'ballwasher',
  'scenicbridge',
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
  landmark: 'landmark',
  ballwasher: 'ballwasher',
  scenicbridge: 'scenicbridge',
};

export default function BuildPanel() {
  const open = useUI((s) => s.buildPanel);
  const cash = useUI((s) => s.cash);
  const courseTheme = useUI((s) => s.courseTheme);
  const setStore = useUI((s) => s.set);
  useUI((s) => s.simTick);
  const [tab, setTab] = useState<'build' | 'manage'>('build');
  const facilities = S.buildings.filter((building) => isUpgradeableFacility(building.kind));
  if (open === false) return null;

  return (
    <section className="buildPanel" role="dialog" aria-modal="false" aria-labelledby="facilities-title">
      <div className="bpHead">
        <b id="facilities-title">Resort & facilities</b>
        <span>{tab === 'build' ? 'Pick one, tap the course, then connect it with a pathway.' : 'Choose Service or Prestige, then grow each facility through three visible levels.'}</span>
        <button className="bpClose" aria-label="Close facilities" onClick={() => setStore({ buildPanel: false })}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="facilityTabs" role="tablist" aria-label="Facility actions">
        <button role="tab" aria-selected={tab === 'build'} className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}>Build new</button>
        <button role="tab" aria-selected={tab === 'manage'} className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')}>
          Manage & upgrade <span>{facilities.length}</span>
        </button>
      </div>

      {tab === 'build' ? (
        <div className="bpGrid">
          {ORDER.map((k) => {
            const d = themedDef(k, courseTheme);
            const landmarkLocked = k === 'landmark' && !S.specialVisitors.landmarkDonated;
            const gifted = k === 'landmark' && S.specialVisitors.landmarkCredits > 0;
            const afford = !landmarkLocked && (gifted || cash >= d.cost);
            return (
              <button
                key={k}
                className={'bpItem' + (afford ? '' : landmarkLocked ? ' locked' : ' broke')}
                disabled={!afford}
                onClick={() => {
                  selectBuilding(k);
                  setStore({ buildPanel: false });
                }}
              >
                <div className={'bpIc bpIc-' + k}><Icon name={ICONS[k]} size={25} /></div>
                <div className="bpName">{d.name}</div>
                <div className="bpCost">
                  {gifted ? "Ivana's gift" : landmarkLocked ? 'Patron locked' : fmt$(d.cost)} <span>{d.w}×{d.h}</span>
                </div>
                <div className="bpBlurb">{landmarkLocked ? 'Ivana Richman must enjoy the course and donate the first Landmark.' : d.blurb}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="facilityManageGrid">
          {facilities.length === 0 && (
            <div className="facilityEmpty">
              <Icon name="resort" size={30} />
              <b>No upgradeable facilities yet</b>
              <span>Build a resort facility first, then return here to specialize it.</span>
              <button onClick={() => setTab('build')}>Browse facility catalog</button>
            </div>
          )}
          {facilities.map((building, index) => {
            const level = facilityLevel(building);
            const options = facilityUpgradeOptions(building);
            const work = building.upgrade;
            const progress = work ? Math.round((1 - work.remaining / work.duration) * 100) : 0;
            return (
              <article className={'facilityManageCard branch-' + (building.branch ?? 'none') + (work ? ' upgrading' : '')} key={building.id}>
                <header>
                  <div className={'bpIc bpIc-' + building.kind}><Icon name={ICONS[building.kind]} size={24} /></div>
                  <div>
                    <b>{facilityDisplayName(building, courseTheme)}</b>
                    <span>Facility {index + 1} · Level {['I', 'I', 'II', 'III'][level]}</span>
                  </div>
                  <em className={building.open ? 'online' : 'offline'}>{work ? 'BUILDING' : building.open ? 'OPEN' : 'NO PATH'}</em>
                </header>

                {work ? (
                  <div className="upgradeProgress">
                    <div><span>Level {work.targetLevel} construction</span><b>{Math.ceil(work.remaining)}s</b></div>
                    <i><span style={{ width: `${progress}%` }} /></i>
                    <small>The facility is offline until construction finishes.</small>
                  </div>
                ) : level >= 3 ? (
                  <div className="upgradeComplete">
                    <b>Maximum level reached</b>
                    <span>{building.branch === 'service' ? 'Service operations fully developed.' : 'Prestige experience fully developed.'}</span>
                    <small>Maintenance ${facilityMaintenanceFor(building).toFixed(2)}/s</small>
                  </div>
                ) : (
                  <div className="upgradeChoices">
                    {options.map((option) => {
                      const broke = cash < option.cost;
                      const disabled = !!option.lockedReason || broke;
                      return (
                        <button
                          key={option.branch}
                          className={'upgradeChoice ' + option.branch}
                          disabled={disabled}
                          onClick={() => upgradeFacility(building.id, option.branch as FacilityBranch)}
                        >
                          <span className="upgradeBranch">{option.branch === 'service' ? '⚙ Service' : '★ Prestige'}</span>
                          <b>{option.name}</b>
                          <small>{option.summary}</small>
                          <em>{fmt$(option.cost)} · {option.duration}s</em>
                          {(option.lockedReason || broke) && <i>{option.lockedReason ?? `Need ${fmt$(option.cost)}`}</i>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
