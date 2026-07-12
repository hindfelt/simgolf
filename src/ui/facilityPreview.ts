import type { BuildingKind } from '../game/types';

export type PreviewPropKind = 'bench' | 'flowerbed' | 'landmark' | 'ballwasher' | 'scenicbridge';

export type FacilityPreviewSource =
  | { renderer: 'prop'; key: PreviewPropKind }
  | { renderer: 'building'; key: string };

const PROP_KINDS = new Set<BuildingKind>(['bench', 'flowerbed', 'landmark', 'ballwasher', 'scenicbridge']);

/** Match the identity used by the world renderer instead of relying on the
 * generic building fallback for compact catalog previews. */
export function facilityPreviewSource(kind: BuildingKind): FacilityPreviewSource {
  if (PROP_KINDS.has(kind)) return { renderer: 'prop', key: kind as PreviewPropKind };
  if (kind === 'buildinglot') return { renderer: 'building', key: 'lot0' };
  return { renderer: 'building', key: kind };
}
