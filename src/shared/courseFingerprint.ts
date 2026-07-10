export interface FingerprintHole {
  tee: { x: number; y: number };
  cup: { x: number; y: number };
  par: number;
}

export interface FingerprintBuilding {
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  level?: number;
  branch?: string;
}

export interface FingerprintCourse {
  theme: string;
  tiles: Iterable<number>;
  elevC: Iterable<number>;
  holes: FingerprintHole[];
  buildings: FingerprintBuilding[];
}

function fnvMix(hash: number, value: number): number {
  hash ^= value & 0xff;
  hash = Math.imul(hash, 0x01000193);
  hash ^= (value >>> 8) & 0xff;
  return Math.imul(hash, 0x01000193) >>> 0;
}

function fnvText(hash: number, value: string): number {
  for (let index = 0; index < value.length; index++) hash = fnvMix(hash, value.charCodeAt(index));
  return hash;
}

/** Stable gameplay/layout fingerprint shared by browser saves and the online API. */
export function courseFingerprint(state: FingerprintCourse): string {
  let hash = fnvText(0x811c9dc5, state.theme);
  for (const tile of state.tiles) hash = fnvMix(hash, tile);
  for (const elevation of state.elevC) hash = fnvMix(hash, elevation);
  for (const hole of state.holes) {
    hash = fnvMix(hash, Math.round(hole.tee.x * 100));
    hash = fnvMix(hash, Math.round(hole.tee.y * 100));
    hash = fnvMix(hash, Math.round(hole.cup.x * 100));
    hash = fnvMix(hash, Math.round(hole.cup.y * 100));
    hash = fnvMix(hash, hole.par);
  }
  const buildings = [...state.buildings].sort((a, b) => a.x - b.x || a.y - b.y || a.kind.localeCompare(b.kind) || a.w - b.w || a.h - b.h);
  for (const building of buildings) {
    hash = fnvText(hash, building.kind);
    hash = fnvMix(hash, building.x);
    hash = fnvMix(hash, building.y);
    hash = fnvMix(hash, building.w);
    hash = fnvMix(hash, building.h);
    hash = fnvMix(hash, building.level ?? 1);
    hash = fnvText(hash, building.branch ?? 'base');
  }
  return `fm1-${hash.toString(16).padStart(8, '0')}`;
}
