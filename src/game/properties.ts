import type { CareerProgress, CourseTheme, ProProfile, PropertyId } from './types';

export const PROPERTY_INHERITANCE = 20_000;

export interface PropertyDefinition {
  id: PropertyId;
  name: string;
  region: string;
  theme: CourseTheme;
  price: number;
  ownedParcels: readonly number[];
  terrain: { relief: number; water: number; woodland: number; seed: number };
  description: string;
  unlock?: PropertyUnlock;
}

export interface PropertyUnlock {
  reputation?: number;
  fame?: number;
  tournament?: boolean;
  sgaTop100?: boolean;
  sgaTop18?: boolean;
  championshipStart?: boolean;
  championshipPodium?: boolean;
  championshipWin?: boolean;
}

export interface PropertyAvailabilityContext {
  funds: number;
  progress: CareerProgress;
  proProfile: Pick<ProProfile, 'fame' | 'starts' | 'podiums' | 'wins'>;
  purchased: readonly PropertyId[];
  currentPropertyId?: PropertyId | null;
  sandbox?: boolean;
}

export interface PropertyRequirementStatus {
  id: 'cash' | 'reputation' | 'fame' | 'tournament' | 'sgaTop100' | 'sgaTop18' | 'championshipStart' | 'championshipPodium' | 'championshipWin';
  label: string;
  met: boolean;
}

export interface PropertyAvailability {
  status: 'current' | 'purchased' | 'available' | 'locked';
  canPurchase: boolean;
  cashShortfall: number;
  requirements: PropertyRequirementStatus[];
  missing: PropertyRequirementStatus[];
}

const base = [0, 1, 4, 5] as const;
const parcels = (...extra: number[]) => [...base, ...extra];

/** Manual p.7: four locations in each terrain family, sixteen worldwide properties. */
export const WORLD_PROPERTIES: readonly PropertyDefinition[] = [
  { id: 'maple-crossing', name: 'Maple Crossing', region: 'Virginia, USA', theme: 'parklands', price: 0, ownedParcels: parcels(), terrain: { relief: .38, water: .32, woodland: .62, seed: 11 }, description: 'A forgiving wooded inheritance with a compact four-parcel deed.' },
  { id: 'kyoto-gardens', name: 'Kyoto Gardens', region: 'Kyoto, Japan', theme: 'parklands', price: 2_500, ownedParcels: parcels(2), terrain: { relief: .5, water: .55, woodland: .72, seed: 23 }, description: 'Five parcels of rolling garden country with streams and mature trees.' },
  { id: 'bavarian-vale', name: 'Bavarian Vale', region: 'Bavaria, Germany', theme: 'parklands', price: 6_500, ownedParcels: parcels(2, 6), terrain: { relief: .76, water: .35, woodland: .78, seed: 37 }, description: 'Six broad parcels under steep wooded foothills.', unlock: { reputation: 3.5, tournament: true } },
  { id: 'ontario-lakes', name: 'Ontario Lakes', region: 'Ontario, Canada', theme: 'parklands', price: 12_000, ownedParcels: parcels(2, 6, 8), terrain: { relief: .58, water: .9, woodland: .7, seed: 41 }, description: 'Seven valuable parcels wrapped around a chain of lakes.', unlock: { reputation: 4.5, fame: 125 } },

  { id: 'donegal-point', name: 'Donegal Point', region: 'Donegal, Ireland', theme: 'links', price: 1_000, ownedParcels: parcels(), terrain: { relief: .32, water: .5, woodland: .16, seed: 53 }, description: 'A small windswept headland where every exposed shot matters.' },
  { id: 'skagen-dunes', name: 'Skagen Dunes', region: 'North Jutland, Denmark', theme: 'links', price: 4_000, ownedParcels: parcels(2), terrain: { relief: .24, water: .62, woodland: .08, seed: 67 }, description: 'Five low dune parcels with burns, firm turf and very few trees.' },
  { id: 'cape-breton-links', name: 'Cape Breton Links', region: 'Nova Scotia, Canada', theme: 'links', price: 8_500, ownedParcels: parcels(2, 6), terrain: { relief: .64, water: .68, woodland: .28, seed: 79 }, description: 'Six rugged coastal parcels climbing above the surf.', unlock: { reputation: 3.5, fame: 50 } },
  { id: 'hebridean-reach', name: 'Hebridean Reach', region: 'Outer Hebrides, Scotland', theme: 'links', price: 18_000, ownedParcels: parcels(2, 3, 6, 7), terrain: { relief: .52, water: .82, woodland: .12, seed: 83 }, description: 'Eight prestigious seaside parcels built for a championship routing.', unlock: { reputation: 5, fame: 225, sgaTop18: true, championshipPodium: true } },

  { id: 'red-mesa', name: 'Red Mesa', region: 'Arizona, USA', theme: 'desert', price: 1_500, ownedParcels: parcels(), terrain: { relief: .72, water: .08, woodland: .08, seed: 97 }, description: 'Four inexpensive parcels beneath a severe red-rock ridge.' },
  { id: 'atacama-wash', name: 'Atacama Wash', region: 'Antofagasta, Chile', theme: 'desert', price: 4_500, ownedParcels: parcels(2), terrain: { relief: .46, water: .04, woodland: .03, seed: 101 }, description: 'Five dry, open parcels with almost nowhere to hide a bad shot.', unlock: { reputation: 3 } },
  { id: 'namib-canyon', name: 'Namib Canyon', region: 'Erongo, Namibia', theme: 'desert', price: 9_000, ownedParcels: parcels(2, 6), terrain: { relief: .95, water: .12, woodland: .05, seed: 113 }, description: 'Six dramatic parcels divided by high ground and sandy waste.', unlock: { reputation: 4, sgaTop100: true } },
  { id: 'wadi-rum-reserve', name: 'Wadi Rum Reserve', region: 'Aqaba, Jordan', theme: 'desert', price: 16_000, ownedParcels: parcels(2, 3, 6, 7), terrain: { relief: .86, water: .22, woodland: .09, seed: 127 }, description: 'Eight rare parcels around a sheltered oasis and monumental cliffs.', unlock: { reputation: 4.5, fame: 175, sgaTop18: true, championshipStart: true } },

  { id: 'maui-grove', name: 'Maui Grove', region: 'Hawaiʻi, USA', theme: 'tropical', price: 2_000, ownedParcels: parcels(), terrain: { relief: .62, water: .6, woodland: .82, seed: 131 }, description: 'Four lush volcanic parcels with dense palms and bright water.' },
  { id: 'fiji-lagoon', name: 'Fiji Lagoon', region: 'Viti Levu, Fiji', theme: 'tropical', price: 5_500, ownedParcels: parcels(2), terrain: { relief: .34, water: .92, woodland: .72, seed: 149 }, description: 'Five low island parcels curled around a brilliant lagoon.', unlock: { fame: 25 } },
  { id: 'palawan-bay', name: 'Palawan Bay', region: 'Palawan, Philippines', theme: 'tropical', price: 10_500, ownedParcels: parcels(2, 6), terrain: { relief: .7, water: .78, woodland: .94, seed: 157 }, description: 'Six steep jungle parcels threaded between coves.', unlock: { reputation: 4, fame: 100, sgaTop100: true } },
  { id: 'seychelles-crown', name: 'Seychelles Crown', region: 'Mahé, Seychelles', theme: 'tropical', price: 22_000, ownedParcels: parcels(2, 3, 6, 7, 8), terrain: { relief: .55, water: .98, woodland: .88, seed: 173 }, description: 'Nine immaculate island parcels—the most expensive deed on the map.', unlock: { reputation: 5, fame: 300, sgaTop18: true, championshipWin: true } },
] as const;

export function isPropertyId(value: unknown): value is PropertyId {
  return typeof value === 'string' && WORLD_PROPERTIES.some((property) => property.id === value);
}

export function propertyById(id: PropertyId | string | null | undefined): PropertyDefinition {
  return WORLD_PROPERTIES.find((property) => property.id === id) ?? WORLD_PROPERTIES[0];
}

export function starterPropertyForTheme(theme: CourseTheme): PropertyDefinition {
  return WORLD_PROPERTIES.find((property) => property.theme === theme) ?? WORLD_PROPERTIES[0];
}

export function propertyAffordable(property: PropertyDefinition, funds: number): boolean {
  return property.price <= Math.max(0, funds);
}

const finiteNonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

/** Shared engine/UI unlock evaluation. Prestige is earned, never spent. */
export function propertyAvailability(property: PropertyDefinition, context: PropertyAvailabilityContext): PropertyAvailability {
  const funds = finiteNonNegative(context.funds);
  const reputation = Math.min(5, finiteNonNegative(context.progress.bestReputation));
  const fame = Math.trunc(finiteNonNegative(context.proProfile.fame));
  const unlock = property.unlock ?? {};
  const requirements: PropertyRequirementStatus[] = [
    { id: 'cash', label: property.price ? `${property.price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} deed` : 'Inherited deed', met: funds >= property.price },
  ];
  if (unlock.reputation) requirements.push({ id: 'reputation', label: `${unlock.reputation.toFixed(1)}★ career rating`, met: reputation >= unlock.reputation });
  if (unlock.fame) requirements.push({ id: 'fame', label: `${unlock.fame} pro fame`, met: fame >= unlock.fame });
  if (unlock.tournament) requirements.push({ id: 'tournament', label: 'Host a tournament', met: context.progress.tournamentHosted });
  if (unlock.sgaTop100) requirements.push({ id: 'sgaTop100', label: 'Earn an SGA Top 100 hole', met: context.progress.sgaTop100Earned });
  if (unlock.sgaTop18) requirements.push({ id: 'sgaTop18', label: 'Earn an SGA Top 18 hole', met: context.progress.sgaTop18Earned });
  if (unlock.championshipStart) requirements.push({ id: 'championshipStart', label: 'Start a championship', met: context.proProfile.starts >= 1 });
  if (unlock.championshipPodium) requirements.push({ id: 'championshipPodium', label: 'Reach a championship podium', met: context.proProfile.podiums >= 1 });
  if (unlock.championshipWin) requirements.push({ id: 'championshipWin', label: 'Win a championship', met: context.proProfile.wins >= 1 });

  const isCurrent = context.currentPropertyId === property.id;
  const isPurchased = context.purchased.includes(property.id);
  const missing = context.sandbox ? [] : requirements.filter((requirement) => !requirement.met);
  const status = isCurrent ? 'current' : isPurchased ? 'purchased' : missing.length ? 'locked' : 'available';
  return {
    status,
    canPurchase: !!context.sandbox || (!isPurchased && !isCurrent && missing.length === 0),
    cashShortfall: Math.max(0, property.price - funds),
    requirements,
    missing,
  };
}

export function sanitizeCareerProgress(value: unknown, accomplishments: readonly string[] = []): CareerProgress {
  const raw = value && typeof value === 'object' ? value as Partial<CareerProgress> : {};
  const inferredRep = accomplishments.includes('rep5') ? 5 : accomplishments.includes('rep4') ? 4 : accomplishments.includes('rep3') ? 3 : 2.5;
  const sgaTop18Earned = raw.sgaTop18Earned === true;
  return {
    version: 1,
    bestReputation: Math.min(5, Math.max(inferredRep, finiteNonNegative(Number(raw.bestReputation)))),
    tournamentHosted: raw.tournamentHosted === true || accomplishments.includes('tournament'),
    // Every Top 18 hole is necessarily also in the Top 100. Preserve that
    // hierarchy when repairing older or partially-written profile data.
    sgaTop100Earned: raw.sgaTop100Earned === true || sgaTop18Earned,
    sgaTop18Earned,
  };
}

export function sanitizePropertyHistory(value: unknown): PropertyId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPropertyId))];
}
