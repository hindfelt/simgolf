import { center } from './world.js';
export const HELICOPTER_FEE = 200;
export function stepHelicopter(g, api) {
  g.nextHelicopter ??= g.time + 300;
  let h = g.helicopter;
  if (!h) {
    if (g.time < g.nextHelicopter || !api.ready()) return;
    const pad = g.facilities.find(f => f.type === 'helipad' && api.entrance(f));
    if (!pad) return;
    h = g.helicopter = { padId: pad.id, pad: center(pad.c,pad.r), entrance: api.entrance(pad),
      phase: 'arriving', since: g.time, guests: [] };
    api.event('A helicopter is approaching the helipad.');
  }
  // A boarded passenger cannot be admitted again while their flight is here.
  for (const id of h.guests) {
    const record = g.guestRoster?.find(v => v.id === id);
    if (record?.nextVisitAt !== null && record) record.nextVisitAt = Math.max(record.nextVisitAt, g.time + 600);
  }
  const elapsed = g.time - h.since;
  const phase = (name) => { h.phase = name; h.since = g.time; };
  if (h.phase === 'arriving' && elapsed >= 24) {
    api.money(HELICOPTER_FEE, 'Helicopter landing fee');
    phase('unloading');
    api.event('Helicopter landed: $200 landing fee.');
  } else if (h.phase === 'unloading' && elapsed >= 5) {
    if(!api.ready())return;
    h.guests = api.arrive(h.entrance);
    phase('parked');
  } else if (h.phase === 'parked' && h.guests.every(id => !g.guests.some(v => v.id === id))) {
    phase('boarding');
  } else if (h.phase === 'boarding' && elapsed >= 5) {
    phase('departing');
    api.event('The helicopter guests are flying home.');
  } else if (h.phase === 'departing' && elapsed >= 20) {
    g.helicopter = null;
    g.nextHelicopter = g.time + 600 + (g.nextId % 7) * 45;
  }
}
export function validateHelicopter(g) {
  if (g.nextHelicopter !== undefined && (!Number.isFinite(g.nextHelicopter) || g.nextHelicopter < 0)) throw Error('Invalid helicopter schedule.');
  const h = g.helicopter;
  if (!h) return;
  if (!['arriving','unloading','parked','boarding','departing'].includes(h.phase) ||
      !Number.isFinite(h.since) || h.since < 0 || h.since > g.time ||
      ![h.pad,h.entrance].every(p => p && Number.isFinite(p.x) && Number.isFinite(p.z)) ||
      !Array.isArray(h.guests) || h.guests.length > 2 || h.guests.some(id => !Number.isSafeInteger(id)) ||
      !g.facilities.some(f => f.id === h.padId && f.type === 'helipad')) throw Error('Invalid helicopter visit.');
}
