import {originalHeading} from './original-heading.js';
import {originalMapDistance} from './original-route-distance.js';
import {originalRandom} from './original-rng.js';

// 0x4294d1–0x4295ef: nearby golfer watches a partner's airborne shot.
export function originalWalkingWatch(snapshot) {
  const state = structuredClone(snapshot), id = state.actorId;
  const onward = () => ({state, randomDraws: 0, next: '0x42960b'});
  if (state.ballTerrain === 1) return onward();
  function actor(index) {
    const b = state.actors?.[index];
    if (!Number.isInteger(index) || index < 0 || index >= 152 || !(b instanceof Uint8Array) || b.length !== 256) throw Error('Original walking actor unavailable.');
    return new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  const a = actor(id), p = actor(a.getInt16(0xaa, true));
  if (!p.getUint8(0x29)) return onward();
  const distance = originalMapDistance((a.getInt32(8, true) - p.getInt32(8, true)) | 0, (a.getInt32(12, true) - p.getInt32(12, true)) | 0);
  if ((Math.imul(distance, 25) & ~1023) >= 40960 || p.getInt32(0xe4, true) === 0) return onward();
  const animation = p.getInt8(0x25);
  if (!(p.getUint32(0x18, true) & 0x40000) && animation >= 11 && ![12,13,16].includes(animation)) return onward();
  const heading = originalHeading((p.getInt32(0xdc, true) - a.getInt32(8, true)) | 0, (p.getInt32(0xe0, true) - a.getInt32(12, true)) | 0);
  const delta = (heading - p.getInt32(0xe8, true)) | 0;
  // The native signed absolute value retains INT_MIN on overflow.
  const angle = (delta < 0 ? -delta : delta) | 0;
  if (angle >= 0x4aaaaaaa) return onward();
  a.setUint8(0x25, 11);
  a.setUint8(0x22, ((((heading >> 28) & 15) + 1) >> 1) & 7);
  const rng = originalRandom(state.seed);
  a.setInt16(0xa6, -rng.next(4), true);
  a.setInt16(0x1c, 0, true);
  state.seed = rng.state;
  return {state, randomDraws: 1, next: 'skip'};
}
