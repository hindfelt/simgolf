import { type CSSProperties, useEffect, useState } from 'react';
import { DIFFICULTIES } from '../game/difficulty';
import {
  careerProgressSnapshot,
  createPortfolioCourse,
  portfolioResorts,
  switchPortfolioResort,
} from '../game/engine';
import { PH, PW } from '../game/constants';
import {
  PROPERTY_INHERITANCE,
  WORLD_PROPERTIES,
  propertyAvailability,
  propertyById,
  type PropertyAvailability,
  type PropertyDefinition,
} from '../game/properties';
import { portfolioSupported, resortsForProperty, type ResortRecord } from '../game/portfolio';
import { S } from '../game/state';
import { THEME_PACKS, themePackById } from '../game/themePacks';
import type { CourseTheme, Difficulty, PropertyId, ThemePackId } from '../game/types';
import { fmt$ } from '../game/rng';
import { useUI } from './store';

type WorldLayout = {
  deedX: number;
  deedY: number;
  deedWidth: number;
  pinX: number;
  pinY: number;
};

const WORLD_LAYOUT: Record<PropertyId, WorldLayout> = {
  'kyoto-gardens': { deedX: 286, deedY: 2, deedWidth: 220, pinX: 315, pinY: 130 },
  'cape-breton-links': { deedX: 286, deedY: 40, deedWidth: 220, pinX: 130, pinY: 82 },
  'bavarian-vale': { deedX: 286, deedY: 78, deedWidth: 220, pinX: 270, pinY: 105 },
  'red-mesa': { deedX: 286, deedY: 116, deedWidth: 220, pinX: 76, pinY: 165 },
  'atacama-wash': { deedX: 286, deedY: 154, deedWidth: 220, pinX: 120, pinY: 286 },
  'namib-canyon': { deedX: 286, deedY: 192, deedWidth: 220, pinX: 241, pinY: 258 },
  'wadi-rum-reserve': { deedX: 286, deedY: 230, deedWidth: 220, pinX: 297, pinY: 201 },
  'maui-grove': { deedX: 286, deedY: 268, deedWidth: 220, pinX: 44, pinY: 230 },
  'ontario-lakes': { deedX: 286, deedY: 306, deedWidth: 220, pinX: 110, pinY: 93 },
  'maple-crossing': { deedX: 286, deedY: 344, deedWidth: 220, pinX: 112, pinY: 143 },
  'donegal-point': { deedX: 510, deedY: 2, deedWidth: 245, pinX: 225, pinY: 85 },
  'skagen-dunes': { deedX: 510, deedY: 53, deedWidth: 245, pinX: 258, pinY: 68 },
  'hebridean-reach': { deedX: 510, deedY: 104, deedWidth: 245, pinX: 205, pinY: 68 },
  'fiji-lagoon': { deedX: 510, deedY: 155, deedWidth: 245, pinX: 324, pinY: 221 },
  'palawan-bay': { deedX: 510, deedY: 206, deedWidth: 245, pinX: 319, pinY: 171 },
  'seychelles-crown': { deedX: 510, deedY: 257, deedWidth: 245, pinX: 272, pinY: 300 },
};

const THEME_MARK: Record<CourseTheme, string> = {
  parklands: '♣',
  links: '♜',
  desert: '△',
  tropical: '✦',
};

type VisualState = 'current' | 'purchased' | 'affordable' | 'released' | 'locked';

function visualState(availability: PropertyAvailability): VisualState {
  if (availability.status === 'current') return 'current';
  if (availability.status === 'purchased') return 'purchased';
  if (!availability.released) return 'locked';
  return availability.affordable ? 'affordable' : 'released';
}

function layoutStyle(layout: WorldLayout): CSSProperties {
  return {
    '--deed-x': `${layout.deedX}px`,
    '--deed-y': `${layout.deedY}px`,
    '--deed-width': `${layout.deedWidth}px`,
    '--pin-x': `${layout.pinX}px`,
    '--pin-y': `${layout.pinY}px`,
  } as CSSProperties;
}

function WorldGlobe() {
  return (
    <svg className="worldGlobeArt" viewBox="0 0 360 360" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="world-ocean" cx="33%" cy="25%" r="72%">
          <stop offset="0" stopColor="#f5f2ff" />
          <stop offset=".48" stopColor="#b9b8ef" />
          <stop offset=".78" stopColor="#787bc7" />
          <stop offset="1" stopColor="#353b90" />
        </radialGradient>
        <pattern id="world-dimples" width="31" height="27" patternUnits="userSpaceOnUse">
          <ellipse cx="10" cy="9" rx="7" ry="5.5" fill="rgba(74,72,151,.22)" />
          <ellipse cx="8" cy="7" rx="4" ry="3" fill="rgba(255,255,255,.22)" />
        </pattern>
        <clipPath id="world-clip"><circle cx="180" cy="180" r="164" /></clipPath>
        <filter id="world-land-shadow"><feDropShadow dx="3" dy="5" stdDeviation="2.5" floodColor="#172861" floodOpacity=".62" /></filter>
      </defs>
      <ellipse cx="184" cy="342" rx="139" ry="13" fill="rgba(20,23,68,.34)" />
      <circle cx="180" cy="180" r="169" fill="#292f80" />
      <circle cx="176" cy="175" r="164" fill="url(#world-ocean)" stroke="#d9d8ff" strokeWidth="5" />
      <circle cx="176" cy="175" r="162" fill="url(#world-dimples)" opacity=".88" />
      <g clipPath="url(#world-clip)" fill="#32e43f" stroke="#16652a" strokeWidth="4" strokeLinejoin="round" filter="url(#world-land-shadow)">
        <path d="M45 86 73 58 109 51 132 65 149 61 165 77 150 95 132 100 123 119 98 125 92 143 68 146 51 128 27 123 27 103Z" />
        <path d="M105 137 128 149 137 177 128 200 139 222 127 255 111 282 94 276 87 244 72 222 73 188 87 165Z" />
        <path d="M179 65 205 51 232 62 252 57 288 73 322 99 327 122 306 137 278 130 260 141 236 126 216 132 198 116 183 122 164 105Z" />
        <path d="M183 127 213 132 229 153 225 184 207 199 198 229 179 249 163 226 157 194 144 172 151 145Z" />
        <path d="M273 225 303 218 324 236 315 255 290 260 270 247Z" />
        <path d="M315 143 337 151 344 168 326 176 308 164Z" />
      </g>
      <path d="M54 73 C102 29 184 13 245 36" fill="none" stroke="rgba(255,255,255,.57)" strokeWidth="9" strokeLinecap="round" />
      <circle cx="176" cy="175" r="164" fill="none" stroke="rgba(24,28,91,.55)" strokeWidth="3" />
    </svg>
  );
}

function propertyStatusCopy(property: PropertyDefinition, availability: PropertyAvailability): string {
  if (availability.status === 'current') return 'Current resort';
  if (availability.status === 'purchased') return 'Already purchased';
  if (!availability.released) return availability.missing.find((requirement) => requirement.id !== 'cash')?.label ?? 'Career milestone required';
  if (availability.cashShortfall) return `${fmt$(availability.cashShortfall)} more needed`;
  return property.price ? `${fmt$(property.price)} deed available` : 'Inheritance available';
}

function WorldDeed({
  property,
  availability,
  selected,
  onSelect,
}: {
  property: PropertyDefinition;
  availability: PropertyAvailability;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = visualState(availability);
  const status = propertyStatusCopy(property, availability);
  return (
    <>
      <button
        type="button"
        className={`worldGlobePin ${state}${selected ? ' selected' : ''}`}
        style={layoutStyle(WORLD_LAYOUT[property.id])}
        aria-label={`Locate ${property.name}. ${status}`}
        aria-pressed={selected}
        onClick={onSelect}
      ><span aria-hidden="true" /></button>
      <button
        type="button"
        className={`worldDeed world-${property.theme} ${state}${selected ? ' selected' : ''}`}
        style={layoutStyle(WORLD_LAYOUT[property.id])}
        data-property-id={property.id}
        data-property-state={state}
        aria-label={`${property.name}, ${property.region}. ${status}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        <i className="worldDeedMedallion" aria-hidden="true">{THEME_MARK[property.theme]}</i>
        <span><b>{property.name}</b><small>{property.region}</small><em>{property.ownedParcels.length * 10} acres · {status}</em></span>
        <i className="worldDeedPin" aria-hidden="true" />
      </button>
    </>
  );
}

export default function WorldScreen({ initial, close }: { initial: boolean; close: () => void }) {
  const liveCash = useUI((state) => state.cash);
  useUI((state) => state.simTick);
  const currentDifficulty = useUI((state) => state.difficulty);
  const currentThemePack = useUI((state) => state.themePackId);
  const portfolioVersion = useUI((state) => state.portfolioVersion);
  const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty);
  const [themePackId, setThemePackId] = useState<ThemePackId>(currentThemePack);
  const [themeCourseId, setThemeCourseId] = useState<string | null>(S.themePackId === currentThemePack ? S.themeCourseId : null);
  const [resorts, setResorts] = useState<ResortRecord[]>([]);
  const [travelling, setTravelling] = useState(false);

  useEffect(() => {
    let alive = true;
    void portfolioResorts().then((records) => { if (alive) setResorts(records); });
    return () => { alive = false; };
  }, [portfolioVersion]);

  const availableFunds = initial || S.sandbox ? PROPERTY_INHERITANCE : liveCash;
  const careerProgress = careerProgressSnapshot();
  const availabilityFor = (candidate: PropertyDefinition) => propertyAvailability(candidate, {
    funds: availableFunds,
    progress: careerProgress,
    proProfile: S.proProfile,
    purchased: S.propertiesPurchased,
    // A sandbox is a separate copy, not ownership of the underlying career
    // deed. Keep that deed purchasable while its sandbox is currently open.
    currentPropertyId: initial || S.sandbox ? null : S.propertyId,
  });
  const firstAvailable = WORLD_PROPERTIES.find((candidate) => availabilityFor(candidate).canPurchase) ?? propertyById(S.propertyId);
  const [propertyId, setPropertyId] = useState<PropertyId>(initial ? firstAvailable.id : propertyById(S.propertyId).id);
  const property = propertyById(propertyId);
  const availability = availabilityFor(property);
  const state = visualState(availability);
  const purchased = availability.status === 'purchased' || availability.status === 'current';
  const propertyResorts = resortsForProperty(resorts, property.id);
  const careerResort = propertyResorts.find((resort) => resort.kind === 'career');
  const themePack = themePackById(themePackId);

  const start = async (sandbox: boolean) => {
    if (!sandbox && !availability.canPurchase) return;
    const action = sandbox ? `Start a sandbox on ${property.name}` : `Purchase ${property.name}`;
    const detail = !portfolioSupported()
      ? `${action}? This browser cannot keep a switchable resort portfolio. Continuing will replace ${S.courseName}; save it to a named slot or export it first.`
      : sandbox
        ? `${action} as a separate portfolio resort? ${S.courseName} will remain exactly as it is.`
        : `${action} and transfer the available ${fmt$(availableFunds)} development fund? ${S.courseName} will remain in your portfolio, with its operating cash moved to the new project.`;
    if (!initial && !window.confirm(detail)) return;
    setTravelling(true);
    await createPortfolioCourse(sandbox, difficulty, property.theme, themePackId, themeCourseId, property.id, availableFunds, !initial);
    setTravelling(false);
  };

  const visit = async (resort: ResortRecord) => {
    if (resort.active) return;
    setTravelling(true);
    await switchPortfolioResort(resort.id);
    setTravelling(false);
  };

  const purchaseLabel = travelling
    ? 'Preparing resort…'
    : !availability.released
      ? 'Complete the highlighted milestones'
      : availability.cashShortfall
        ? `Save ${fmt$(availability.cashShortfall)} more`
        : `Purchase ${property.name}${property.price ? ` · ${fmt$(property.price)}` : ''}`;

  return (
    <section className={`worldOffice ${initial ? 'initialWorldOffice' : 'portfolioWorldOffice'}`}>
      <header className="worldOfficeHeader">
        <div className="worldQuestion"><h1 id="modal-title">Where will you build your golf course?</h1><small>Choose a pin or property deed</small></div>
        <div className="worldProgressRibbon" aria-label="Worldwide resort career progress">
          <span><small>{initial ? 'Inheritance' : 'Available bank'}</small><b>{fmt$(availableFunds)}</b></span>
          <span><small>Career</small><b>{fmt$(careerProgress.lifetimeOperatingEarnings ?? 0)}</b></span>
          <span><small>Rating</small><b>{careerProgress.bestReputation.toFixed(1)}★</b></span>
          <span><small>Fame</small><b>{S.proProfile.fame}</b></span>
          <span><small>Deeds</small><b>{S.propertiesPurchased.length}/16</b></span>
        </div>
      </header>

      <div className="worldStage" role="group" aria-label="Sixteen worldwide property deeds">
        <WorldGlobe />
        <svg className="worldConnections" viewBox="0 0 760 390" aria-hidden="true" focusable="false">
          {WORLD_PROPERTIES.map((candidate) => {
            const layout = WORLD_LAYOUT[candidate.id];
            const candidateAvailability = availabilityFor(candidate);
            return <line key={candidate.id} className={`${visualState(candidateAvailability)}${propertyId === candidate.id ? ' selected' : ''}`} x1={layout.pinX} y1={layout.pinY} x2={layout.deedX + 7} y2={layout.deedY + 17} />;
          })}
        </svg>
        {WORLD_PROPERTIES.map((candidate) => (
          <WorldDeed
            key={candidate.id}
            property={candidate}
            availability={availabilityFor(candidate)}
            selected={propertyId === candidate.id}
            onSelect={() => setPropertyId(candidate.id)}
          />
        ))}
        <div className="worldPinLegend" aria-label="Property pin legend">
          <span><i className="affordable" />Available</span>
          <span><i className="released" />Insufficient funds</span>
          <span><i className="locked" />Career milestone</span>
          <span><i className="purchased" />Already purchased</span>
        </div>
      </div>

      <footer className={`worldDeedDesk inspector-${property.theme}`} data-selected-property={property.id}>
        <section className="worldSelectedIdentity" aria-live="polite">
          <i className="worldSelectedMedallion" aria-hidden="true">{THEME_MARK[property.theme]}</i>
          <span><b>{property.name}</b><small>{property.region} · {property.theme}</small></span>
          <strong className={`worldSelectedStatus ${state}`}>{propertyStatusCopy(property, availability)}</strong>
          <p>{property.description}</p>
          {!!propertyResorts.length && <div className="worldPortfolioRail" aria-label={`${property.name} saved resorts`}>
            {propertyResorts.map((resort) => (
              <button
                type="button"
                key={resort.id}
                className={'portfolioDeed' + (resort.active ? ' active' : '')}
                disabled={travelling || resort.active}
                aria-current={resort.active ? 'page' : undefined}
                aria-label={`${resort.active ? 'Current' : 'Visit'} ${resort.kind} resort ${resort.summary.courseName}, ${fmt$(resort.summary.cash)}, ${resort.summary.rep.toFixed(1)} stars, ${resort.summary.holes} holes`}
                onClick={() => void visit(resort)}
              ><b>{resort.summary.courseName}</b><small>{resort.active ? 'Here now' : `Visit · ${fmt$(resort.summary.cash)} · ${resort.summary.rep.toFixed(1)}★`}</small></button>
            ))}
          </div>}
        </section>

        <section className="propertyUnlocks" aria-label={`${property.name} deed requirements`}>
          <header><b>Deed requirements</b><span>{availability.requirements.filter((requirement) => requirement.met).length}/{availability.requirements.length}</span></header>
          <ul>
            {availability.requirements.map((requirement) => (
              <li className={requirement.met ? 'met' : 'missing'} key={requirement.id}><i aria-hidden="true">{requirement.met ? '✓' : '○'}</i><span>{requirement.label}</span></li>
            ))}
          </ul>
        </section>

        <section className="propertyFacts worldDeedFacts" aria-label={`${property.name} property facts`}>
          <div className="parcelDeed" role="img" aria-label={`${property.ownedParcels.length} of ${PW * PH} parcels included in the starting deed`} style={{ gridTemplateColumns: `repeat(${PW}, 1fr)` }}>{Array.from({ length: PW * PH }, (_, parcel) => <i key={parcel} className={property.ownedParcels.includes(parcel) ? 'owned' : ''} />)}</div>
          <span><b>{property.ownedParcels.length * 10}</b><small>acres</small></span>
          {(['relief', 'water', 'woodland'] as const).map((metric) => <span key={metric}><b>{Math.round(property.terrain[metric] * 100)}%</b><small>{metric}</small></span>)}
        </section>

        <div className="worldOfficeActions">
          {purchased ? (
            <button className="worldCareerAction" disabled={travelling || !careerResort || careerResort.active} onClick={() => careerResort && void visit(careerResort)}>
              {travelling ? 'Preparing…' : careerResort?.active ? `${careerResort.summary.courseName} is open` : careerResort ? `Visit ${careerResort.summary.courseName}` : 'Purchased deed'}
            </button>
          ) : (
            <button className="worldCareerAction" disabled={travelling || !availability.canPurchase} onClick={() => void start(false)}>{purchaseLabel}</button>
          )}
          <button className="worldSandboxAction" disabled={travelling} onClick={() => void start(true)}>{travelling ? 'Saving portfolio…' : `Sandbox on ${property.name} — unlimited funds & land`}</button>
          <details className="worldSetupOptions">
            <summary>Resort options</summary>
            <div className="worldSetupPopover">
              <header><b>Resort options</b><span>Theme Pack and difficulty travel with the new course.</span></header>
              <div className="worldOptionPacks">
                {THEME_PACKS.map((pack) => (
                  <button key={pack.id} className={themePackId === pack.id ? 'active' : ''} style={{ '--pack-accent': pack.accent } as CSSProperties} aria-pressed={themePackId === pack.id} onClick={() => { setThemePackId(pack.id); setThemeCourseId(null); }}><i /><span><b>{pack.name}</b><small>{pack.strapline}</small></span></button>
                ))}
              </div>
              <p>{themePack.description}</p>
              <div className="worldOptionDifficulty">
                {DIFFICULTIES.map((item, index) => <button key={item.id} className={difficulty === item.id ? 'active' : ''} aria-pressed={difficulty === item.id} onClick={() => setDifficulty(item.id)}><b>{item.label}</b><span>{'◆'.repeat(index + 1)}</span></button>)}
              </div>
              {!!themePack.courses?.length && <div className="worldOptionCourses">
                <button className={themeCourseId === null ? 'active' : ''} aria-pressed={themeCourseId === null} onClick={() => setThemeCourseId(null)}>Fresh property</button>
                {themePack.courses.map((course) => <button key={course.id} className={themeCourseId === course.id ? 'active' : ''} aria-pressed={themeCourseId === course.id} onClick={() => setThemeCourseId(course.id)}>{course.name}</button>)}
              </div>}
            </div>
          </details>
          {!initial && <button className="worldBackAction" onClick={close} aria-label="Keep current course and close World Screen">←</button>}
        </div>
      </footer>
    </section>
  );
}
