// 0x4290ca–0x429192: closed-hole fallback and waiting groups at the tee.
export function originalWalkingQueue(snapshot, resolve) {
  let state = structuredClone(snapshot);
  const calls = [], id = state.actorId;
  let waitingGroups = state.waitingGroups | 0;
  function actor(index) {
    const bytes = state.actors?.[index];
    if (!Number.isInteger(index) || index < 0 || index >= 152 || !(bytes instanceof Uint8Array) || bytes.length !== 256) throw Error('Original walking actor unavailable.');
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  function effect(index) {
    const event = {address: 0x425b50, args: [index]};
    calls.push(event);
    const result = resolve(structuredClone(event), structuredClone(state));
    if (!result?.state || typeof result.then === 'function') throw Error('Expected synchronous walking cleanup.');
    state = structuredClone(result.state);
  }
  const a = actor(id), hole = state.holes?.[a.getInt8(0x29)];
  if (!(hole instanceof Uint8Array) || hole.length !== 520) throw Error('Original walking hole unavailable.');
  if (hole[0] === 0) a.setUint8(0x29, 19);
  if (a.getUint8(0x2a) === 0) {
    let clock = state.queueClock | 0;
    for (let other = 0; other < 152; other++) {
      const current = actor(id), candidate = actor(other);
      if (candidate.getInt8(0x29) <= 0 || other === id || candidate.getUint8(0x29) !== current.getUint8(0x29) || candidate.getUint8(0x2a) !== 0) continue;
      const ownAge = (clock - current.getInt16(0xc6, true)) | 0;
      const otherAge = (clock - candidate.getInt16(0xc6, true)) | 0;
      if (otherAge < ownAge) continue;
      const partner = current.getInt16(0xaa, true);
      if (other === partner) continue;
      if ((state.selectionState === id || state.selectionState === partner) && !(state.worldFlags & 0x4200000)) {
        effect(other);
        effect(other ^ 1);
        clock = state.queueClock | 0;
      } else waitingGroups = (waitingGroups + 1) | 0;
    }
  }
  return {state, calls, waitingGroups, next: '0x429192'};
}
