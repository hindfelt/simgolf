import { FACILITIES } from '../simulation/facilities.js';
import { connected, tile } from '../simulation/game.js';
import { lotValue } from '../simulation/housing.js';

export function facilityDetails(g, f) {
  const definition = FACILITIES[f.type];
  const linked = connected(g, f);
  const lines = [definition.scenery ? 'Scenery — no clubhouse path required.' :
    linked ? 'Connected to the clubhouse.' : 'Disconnected — join a path to the clubhouse from an access point beside this building.'];
  const benefits = {
    bench: 'Visitors rest here to recover energy.', snack: 'Visitors buy refreshments to reduce hunger and thirst.',
    ballwasher: 'Golfers clean their ball for a temporary accuracy benefit.',
    'pro-shop': 'Trains accuracy for visitors who already have that skill.',
    'driving-range': 'Trains length for skilled visitors; some golfers return for extra practice after their round.',
    'putting-green': 'Trains imagination for skilled visitors; some golfers return for extra putting practice.',
    hotel: 'Arriving visitors start better rested. This benefit does not require a visible hotel visit.',
    'cart-garage': 'New visitors can use golf carts.',
    marina: 'Brings additional visiting golfers by boat and adds a home-sale value bonus.',
    church: 'A connected church adds a home-sale value bonus.',
    airstrip: 'Brings additional visiting golfers by airport transfer and adds $100 to each visitor green fee.',
    flowerbed: 'Passing golfers can appreciate the flowers once per hole.',
    lighthouse: 'A coastal scenery landmark.',
  };
  if (benefits[f.type]) lines.push(benefits[f.type]);
  if(f.type==='tennis-court'){
    const users=g.guests.filter(v=>v.tennis?.facilityId===f.id);
    lines.push(`${f.served||0} completed visits · ${users.length} golfers using or approaching the courts.`);
    lines.push('Golfing partners can play tennis together after completing their round. One pair at a time.');
  }
  if (definition.recreation) lines.push('Improves the starting attitude of arriving golfers.');
  if(f.type==='marina'){
    const s=f.marinaActivity;
    lines.push(`${s?.trips||0} completed passenger boat visits.`);
    lines.push(s?.blocked?'Boat channel blocked — restore clear water ahead of the central berth.':`Boat: ${s?.phase||'waiting for a visit'}.`);
    if(s?.phase==='parked')lines.push(`Waiting for ${s.guests.filter(id=>g.guests.some(v=>v.id===id)).length} visitors to finish and return.`);
  }
  if (f.type === 'helipad') {
    const h = g.helicopter;
    lines.push('Brings additional golfers. $200 per landing; at most one helicopter on the property.');
    if (h?.padId === f.id) {
      lines.push(`Helicopter: ${h.phase}.`);
      if (h.phase === 'parked') lines.push(`Waiting for ${h.guests.filter(id => g.guests.some(v => v.id === id)).length} golfers to finish and return.`);
    } else if (h) lines.push('Another helipad is occupied; this one must wait.');
    else if (!linked) lines.push('Visits unavailable until the path is connected.');
    else if (!g.holes.some(hole => hole.open)) lines.push('Open a hole to receive visiting golfers.');
    else {
      const delay = Math.max(0, (g.nextHelicopter ?? g.time + 300) - g.time);
      lines.push(delay > 0 ? `Next visit eligible in ${Math.ceil(delay / 60)} simulation minutes; also needs room for a pair.` : 'Waiting for room to admit a visiting pair.');
    }
    const landings = g.ledger.filter(e => e.reason === 'Helicopter landing fee');
    lines.push(`Property total: ${landings.length} helicopter landings · $${landings.reduce((n,e)=>n+e.amount,0).toLocaleString()} landing income.`);
  } else if (f.type === 'building-lot') {
    lines.push(linked ? 'Available for an eligible golfer to buy.' : 'Not available for sale until connected.');
    lines.push(`Estimated sale value: $${lotValue(g,f,connected,tile).amount.toLocaleString()}.`);
  } else if (f.type === 'home') {
    const sale = g.housingSales?.find(s => s.facilityId === f.id);
    const owner = g.guestRoster.find(v => v.id === sale?.buyerId);
    lines.push(owner ? `Resident: ${owner.name}.` : 'Residential home.');
  } else if (['bench','snack','ballwasher','pro-shop','driving-range','putting-green'].includes(f.type)) {
    const users = [...g.guests, ...(g.pro ? [g.pro] : [])].filter(v => v.serviceId === f.id && ['walking','service'].includes(v.phase));
    lines.push(`${f.served || 0} completed visits · ${users.length} golfers using or approaching this building.`);
  }
  return {name: definition.name, lines};
}
export function inspectFacility(dialog, g, f) {
  const details = facilityDetails(g,f);
  dialog.replaceChildren();
  const title = document.createElement('h2');title.textContent=details.name;dialog.append(title);
  for(const line of details.lines) {const p=document.createElement('p');p.textContent=line;dialog.append(p);}
  const close=document.createElement('button');close.textContent='Back to course';close.onclick=()=>dialog.close();dialog.append(close);
  dialog.showModal();
}
