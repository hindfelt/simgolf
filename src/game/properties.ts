import type { CourseTheme, PropertyId } from './types';

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
}

const base = [0, 1, 4, 5] as const;
const parcels = (...extra: number[]) => [...base, ...extra];

/** Manual p.7: four locations in each terrain family, sixteen worldwide properties. */
export const WORLD_PROPERTIES: readonly PropertyDefinition[] = [
  { id: 'maple-crossing', name: 'Maple Crossing', region: 'Virginia, USA', theme: 'parklands', price: 0, ownedParcels: parcels(), terrain: { relief: .38, water: .32, woodland: .62, seed: 11 }, description: 'A forgiving wooded inheritance with a compact four-parcel deed.' },
  { id: 'kyoto-gardens', name: 'Kyoto Gardens', region: 'Kyoto, Japan', theme: 'parklands', price: 2_500, ownedParcels: parcels(2), terrain: { relief: .5, water: .55, woodland: .72, seed: 23 }, description: 'Five parcels of rolling garden country with streams and mature trees.' },
  { id: 'bavarian-vale', name: 'Bavarian Vale', region: 'Bavaria, Germany', theme: 'parklands', price: 6_500, ownedParcels: parcels(2, 6), terrain: { relief: .76, water: .35, woodland: .78, seed: 37 }, description: 'Six broad parcels under steep wooded foothills.' },
  { id: 'ontario-lakes', name: 'Ontario Lakes', region: 'Ontario, Canada', theme: 'parklands', price: 12_000, ownedParcels: parcels(2, 6, 8), terrain: { relief: .58, water: .9, woodland: .7, seed: 41 }, description: 'Seven valuable parcels wrapped around a chain of lakes.' },

  { id: 'donegal-point', name: 'Donegal Point', region: 'Donegal, Ireland', theme: 'links', price: 1_000, ownedParcels: parcels(), terrain: { relief: .32, water: .5, woodland: .16, seed: 53 }, description: 'A small windswept headland where every exposed shot matters.' },
  { id: 'skagen-dunes', name: 'Skagen Dunes', region: 'North Jutland, Denmark', theme: 'links', price: 4_000, ownedParcels: parcels(2), terrain: { relief: .24, water: .62, woodland: .08, seed: 67 }, description: 'Five low dune parcels with burns, firm turf and very few trees.' },
  { id: 'cape-breton-links', name: 'Cape Breton Links', region: 'Nova Scotia, Canada', theme: 'links', price: 8_500, ownedParcels: parcels(2, 6), terrain: { relief: .64, water: .68, woodland: .28, seed: 79 }, description: 'Six rugged coastal parcels climbing above the surf.' },
  { id: 'hebridean-reach', name: 'Hebridean Reach', region: 'Outer Hebrides, Scotland', theme: 'links', price: 18_000, ownedParcels: parcels(2, 3, 6, 7), terrain: { relief: .52, water: .82, woodland: .12, seed: 83 }, description: 'Eight prestigious seaside parcels built for a championship routing.' },

  { id: 'red-mesa', name: 'Red Mesa', region: 'Arizona, USA', theme: 'desert', price: 1_500, ownedParcels: parcels(), terrain: { relief: .72, water: .08, woodland: .08, seed: 97 }, description: 'Four inexpensive parcels beneath a severe red-rock ridge.' },
  { id: 'atacama-wash', name: 'Atacama Wash', region: 'Antofagasta, Chile', theme: 'desert', price: 4_500, ownedParcels: parcels(2), terrain: { relief: .46, water: .04, woodland: .03, seed: 101 }, description: 'Five dry, open parcels with almost nowhere to hide a bad shot.' },
  { id: 'namib-canyon', name: 'Namib Canyon', region: 'Erongo, Namibia', theme: 'desert', price: 9_000, ownedParcels: parcels(2, 6), terrain: { relief: .95, water: .12, woodland: .05, seed: 113 }, description: 'Six dramatic parcels divided by high ground and sandy waste.' },
  { id: 'wadi-rum-reserve', name: 'Wadi Rum Reserve', region: 'Aqaba, Jordan', theme: 'desert', price: 16_000, ownedParcels: parcels(2, 3, 6, 7), terrain: { relief: .86, water: .22, woodland: .09, seed: 127 }, description: 'Eight rare parcels around a sheltered oasis and monumental cliffs.' },

  { id: 'maui-grove', name: 'Maui Grove', region: 'Hawaiʻi, USA', theme: 'tropical', price: 2_000, ownedParcels: parcels(), terrain: { relief: .62, water: .6, woodland: .82, seed: 131 }, description: 'Four lush volcanic parcels with dense palms and bright water.' },
  { id: 'fiji-lagoon', name: 'Fiji Lagoon', region: 'Viti Levu, Fiji', theme: 'tropical', price: 5_500, ownedParcels: parcels(2), terrain: { relief: .34, water: .92, woodland: .72, seed: 149 }, description: 'Five low island parcels curled around a brilliant lagoon.' },
  { id: 'palawan-bay', name: 'Palawan Bay', region: 'Palawan, Philippines', theme: 'tropical', price: 10_500, ownedParcels: parcels(2, 6), terrain: { relief: .7, water: .78, woodland: .94, seed: 157 }, description: 'Six steep jungle parcels threaded between coves.' },
  { id: 'seychelles-crown', name: 'Seychelles Crown', region: 'Mahé, Seychelles', theme: 'tropical', price: 22_000, ownedParcels: parcels(2, 3, 6, 7, 8), terrain: { relief: .55, water: .98, woodland: .88, seed: 173 }, description: 'Nine immaculate island parcels—the most expensive deed on the map.' },
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

export function sanitizePropertyHistory(value: unknown): PropertyId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPropertyId))];
}
