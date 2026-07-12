import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFloatingPanelFocus } from './panelA11y';
import { buildingSprite, propSprite } from '../game/sprites';
import { facilityPreviewSource } from './facilityPreview';

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

type CatalogCategory = 'all' | 'resort' | 'travel' | 'property' | 'scenery';

const CATEGORY_FOR: Record<BuildingKind, Exclude<CatalogCategory, 'all'>> = {
  proshop: 'resort',
  snackbar: 'resort',
  drivingrange: 'resort',
  puttinggreen: 'resort',
  cartgarage: 'resort',
  hotel: 'resort',
  tennis: 'resort',
  marina: 'travel',
  airstrip: 'travel',
  buildinglot: 'property',
  bench: 'scenery',
  flowerbed: 'scenery',
  landmark: 'scenery',
  ballwasher: 'scenery',
  scenicbridge: 'scenery',
};

const CATEGORIES: { id: CatalogCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'resort', label: 'Resort' },
  { id: 'travel', label: 'Travel' },
  { id: 'property', label: 'Property' },
  { id: 'scenery', label: 'Scenery' },
];

function FacilityPreview({ kind, width, height }: { kind: BuildingKind; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cssWidth = 112;
    const cssHeight = 66;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.imageSmoothingEnabled = false;
    const source = facilityPreviewSource(kind);
    const sprite = source.renderer === 'prop' ? propSprite(source.key) : buildingSprite(source.key, width, height, 0);
    const scale = Math.min((cssWidth - 8) / sprite.cv.width, (cssHeight - 5) / sprite.cv.height, 1.15);
    const drawWidth = sprite.cv.width * scale;
    const drawHeight = sprite.cv.height * scale;
    ctx.drawImage(sprite.cv, (cssWidth - drawWidth) / 2, cssHeight - drawHeight, drawWidth, drawHeight);
  }, [height, kind, width]);

  return <canvas ref={canvasRef} className="facilityPreview" aria-hidden="true" />;
}

export default function BuildPanel() {
  const open = useUI((s) => s.buildPanel);
  const cash = useUI((s) => s.cash);
  const courseTheme = useUI((s) => s.courseTheme);
  const setStore = useUI((s) => s.set);
  useUI((s) => s.simTick);
  const [tab, setTab] = useState<'build' | 'manage'>('build');
  const [category, setCategory] = useState<CatalogCategory>('all');
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setStore({ buildPanel: false }), [setStore]);
  const facilities = S.buildings.filter((building) => isUpgradeableFacility(building.kind));
  useEffect(() => {
    if (!open) return;
    setTab('build');
    setCategory('all');
  }, [open]);
  useFloatingPanelFocus(open, panelRef, close);
  if (open === false) return null;

  const visibleKinds = category === 'all' ? ORDER : ORDER.filter((kind) => CATEGORY_FOR[kind] === category);

  return (
    <section className={'buildPanel fieldDeskPanel ' + (tab === 'build' ? 'catalogMode' : 'manageMode')} ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="facilities-title" tabIndex={-1}>
      <div className="bpHead">
        <span className="deskSeal" aria-hidden="true"><Icon name="resort" size={17} /></span>
        <b id="facilities-title">Resort field desk</b>
        <span>{tab === 'build' ? 'Pick one, tap the course, then connect it with a pathway.' : 'Choose Service or Prestige, then grow each facility through three visible levels.'}</span>
        <button className="bpClose" aria-label="Close facilities" onClick={close}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="facilityTabs" role="group" aria-label="Facility actions">
        <button aria-pressed={tab === 'build'} className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}>Build new</button>
        <button aria-pressed={tab === 'manage'} className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')}>
          Manage & upgrade <span>{facilities.length}</span>
        </button>
      </div>

      {tab === 'build' ? (
        <div className="facilityCatalog" aria-label="Build new facilities">
          <div className="catalogFilters" role="toolbar" aria-label="Facility categories">
            {CATEGORIES.map((item) => {
              const count = item.id === 'all' ? ORDER.length : ORDER.filter((kind) => CATEGORY_FOR[kind] === item.id).length;
              return <button key={item.id} className={category === item.id ? 'active' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}<span>{count}</span></button>;
            })}
          </div>
          <div className="bpGrid facilityCatalogGrid">
          {visibleKinds.map((k) => {
            const d = themedDef(k, courseTheme);
            const landmarkLocked = k === 'landmark' && !S.specialVisitors.landmarkDonated;
            const gifted = k === 'landmark' && S.specialVisitors.landmarkCredits > 0;
            const afford = !landmarkLocked && (gifted || cash >= d.cost);
            const price = gifted ? "Ivana's gift" : fmt$(d.cost);
            const availability = gifted ? 'Gift ready to place' : landmarkLocked ? 'Unlock: earn Ivana Richman’s first donation' : afford ? 'Available to place' : `Need ${fmt$(d.cost - cash)} more`;
            return (
              <button
                key={k}
                className={'bpItem catalogCard category-' + CATEGORY_FOR[k] + (afford ? '' : landmarkLocked ? ' locked' : ' broke')}
                aria-disabled={!afford}
                aria-label={`${d.name}. ${price}. ${d.w} by ${d.h} tiles. ${availability}.`}
                aria-describedby={`catalog-description-${k}`}
                onClick={() => {
                  if (!afford) return;
                  selectBuilding(k);
                  setStore({ buildPanel: false });
                }}
              >
                <div className="bpCardHead">
                  <div className={'bpPreview bpPreview-' + k}><FacilityPreview kind={k} width={d.w} height={d.h} /></div>
                  <div className="bpIdentity"><b>{d.name}</b><small>{CATEGORIES.find((item) => item.id === CATEGORY_FOR[k])!.label}</small></div>
                </div>
                <div className="bpBlurb" id={`catalog-description-${k}`}>{landmarkLocked ? 'Ivana Richman must enjoy the course and donate the first Landmark.' : d.blurb}</div>
                <div className="bpMeta"><strong>{price}</strong><span aria-label={`${d.w} by ${d.h} tile footprint`}>{d.w}×{d.h} tiles</span></div>
                <div className={'bpAvailability' + (afford ? ' ready' : ' unavailable')}>{availability}</div>
              </button>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="facilityManageGrid" aria-label="Manage and upgrade facilities">
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
