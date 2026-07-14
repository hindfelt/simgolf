import { describe, expect, it } from 'vitest';
import { deployedEntryPath, entryIsStale } from './BuildFreshness';

describe('deployed build freshness', () => {
  it('extracts the deployed Vite module regardless of attribute order or quoting', () => {
    expect(deployedEntryPath('<script type="module" src="/assets/index-current.js"></script>', 'https://simgolf.test/'))
      .toBe('/assets/index-current.js');
    expect(deployedEntryPath("<script src='./assets/index-current.js' defer type='module'></script>", 'https://simgolf.test/play'))
      .toBe('/assets/index-current.js');
  });

  it('ignores non-module scripts and malformed markup', () => {
    expect(deployedEntryPath('<script src="/legacy.js"></script>', 'https://simgolf.test/')).toBeNull();
    expect(deployedEntryPath('<main>no entry</main>', 'https://simgolf.test/')).toBeNull();
  });

  it('flags only a different deployed entry as stale', () => {
    const current = '<script type="module" src="/assets/index-5854156.js"></script>';
    const next = '<script type="module" src="/assets/index-next.js"></script>';
    expect(entryIsStale('/assets/index-5854156.js', current, 'https://simgolf.test/')).toBe(false);
    expect(entryIsStale('/assets/index-5854156.js', next, 'https://simgolf.test/')).toBe(true);
    expect(entryIsStale('/assets/index-5854156.js', '<main />', 'https://simgolf.test/')).toBe(false);
  });
});
