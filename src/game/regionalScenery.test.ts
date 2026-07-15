import { describe, expect, it } from 'vitest';
import { destinationSceneryFor, WORLD_PROPERTIES } from './properties';
import { regionalBuildingSpriteKey } from './sprites';
import { sharedTreeKindFor, treeCollisionProfile } from './treeGeometry';

describe('destination-specific regional scenery', () => {
  it('gives Kyoto a complete cherry-garden and temple-house art direction', () => {
    expect(destinationSceneryFor('kyoto-gardens')).toEqual({
      vegetation: 'cherry',
      architecture: 'temple',
    });
    expect(sharedTreeKindFor('parklands', 0.01, 'cherry')).toBe('cherry');
    expect(sharedTreeKindFor('parklands', 0.99, 'cherry')).toBe('cherry');
  });

  it('uses cacti and adobe houses throughout the desert destination family', () => {
    const desertProperties = WORLD_PROPERTIES.filter((property) => property.theme === 'desert');
    expect(desertProperties).toHaveLength(4);
    for (const property of desertProperties) {
      expect(destinationSceneryFor(property.id)).toEqual({
        vegetation: 'cactus',
        architecture: 'adobe',
      });
      expect(sharedTreeKindFor(property.theme, property.terrain.seed / 200, 'cactus')).toBe('cactus');
    }
  });

  it('keeps unstyled destinations on the existing terrain-driven art', () => {
    expect(destinationSceneryFor('maple-crossing')).toEqual({
      vegetation: 'theme',
      architecture: 'classic',
    });
    expect(destinationSceneryFor('not-a-property')).toEqual(destinationSceneryFor('maple-crossing'));
  });

  it('keeps regional house sprite caches isolated and collision species aligned', () => {
    expect(regionalBuildingSpriteKey('house2_3')).toBe('house2_3');
    expect(regionalBuildingSpriteKey('house2_3', 'temple')).toBe('temple:house2_3');
    expect(regionalBuildingSpriteKey('house2_3', 'adobe')).toBe('adobe:house2_3');

    const cactus = treeCollisionProfile(8, 9, 'desert', 'cactus');
    const cherry = treeCollisionProfile(8, 9, 'parklands', 'cherry');
    expect(cactus.kind).toBe('cactus');
    expect(cherry.kind).toBe('cherry');
    expect(cactus.canopyRadius).toBeLessThan(cherry.canopyRadius);
    expect(cactus.trunkTop).toBeLessThan(cherry.trunkTop);
  });
});
