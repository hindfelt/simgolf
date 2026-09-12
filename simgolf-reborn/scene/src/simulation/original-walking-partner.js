import {originalHeading} from './original-heading.js';
import {originalMapDistance, originalRouteSegment} from './original-route-distance.js';
import {originalTerrainByte} from './original-terrain-byte.js';

// 0x429192–0x4294d1. Computes the partner-follow local; movement follows later.
export function originalWalkingPartner(snapshot) {
  const state = structuredClone(snapshot), id = state.actorId;
  function actor(index) {
    const b = state.actors?.[index];
    if (!Number.isInteger(index) || index < 0 || index >= 152 || !(b instanceof Uint8Array) || b.length !== 256) throw Error('Original walking actor unavailable.');
    return new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  const a = actor(id), p = actor(a.getInt16(0xaa, true));
  const ball = v => ({x: v.getInt32(0xdc, true), z: v.getInt32(0xe0, true)});
  const position = v => ({x: v.getInt32(8, true), z: v.getInt32(12, true)});
  const own = ball(a), partner = ball(p), pos = position(a);
  let cupHeading = state.cupHeading >>> 0, followPartner = state.followPartner | 0;
  let target;
  if (own.x || partner.x) {
    const b = state.holes?.[a.getInt8(0x29)];
    if (!(b instanceof Uint8Array) || b.length !== 520) throw Error('Original walking hole unavailable.');
    const h = new DataView(b.buffer, b.byteOffset, b.byteLength);
    target = {x: h.getInt32(0x18, true), z: h.getInt32(0x1c, true)};
  }
  if (own.x) cupHeading = originalHeading(((target.x << 10) + 512 - own.x) | 0, ((target.z << 10) + 512 - own.z) | 0);
  // Native computes and discards the partner's cup heading here.
  if (partner.x) originalHeading(((target.x << 10) + 512 - partner.x) | 0, ((target.z << 10) + 512 - partner.z) | 0);
  const distance = (from, to) => originalMapDistance((from.x - to.x) | 0, (from.z - to.z) | 0);
  if (own.x && partner.x && a.getUint8(0x29) === p.getUint8(0x29) && originalRouteSegment(own, target) < originalRouteSegment(partner, target)) {
    const x = partner.x >> 10, z = partner.z >> 10;
    const terrain = x < 0 || x >= 50 || z < 0 || z >= 50 ? 20 : originalTerrainByte(state, x, z);
    if (distance(pos, partner) < distance(pos, own) || terrain === 1) {
      if (originalRouteSegment(pos, target) > originalRouteSegment(partner, target)) followPartner = 1;
    }
    const metadata = code => {
      const m = state.metadata?.[code];
      if (!m || !Number.isInteger(m.shotClass)) throw Error('Original walking terrain metadata unavailable.');
      return (m.shotClass << 24) >> 24;
    };
    if ((metadata(state.ballTerrain) <= 0 && metadata(terrain) > 0) || (p.getUint32(0x18, true) & 0x40000)) followPartner = 0;
    if (state.ballTerrain !== 1) {
      if (distance(own, partner) < 1536) followPartner = 1;
      if (distance(own, position(p)) < 512) followPartner = 1;
    }
  }
  if (a.getUint32(0x18, true) & 0x4000) followPartner = 0;
  if (!own.x) followPartner = id & 1;
  return {state, cupHeading, followPartner, next: '0x4294d1'};
}
