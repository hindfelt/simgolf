import {originalWalkingQueue} from './original-walking-queue.js';
import {originalWalkingPartner} from './original-walking-partner.js';
import {originalWalkingWatch} from './original-walking-watch.js';
import {originalWalkingBallDestination} from './original-walking-ball-destination.js';

// Continuous preparation from 0x4290ca through ball destination selection.
export function originalWalkingPreparation(snapshot, resolve) {
  const queue = originalWalkingQueue(snapshot, resolve);
  const partner = originalWalkingPartner(queue.state);
  const watch = originalWalkingWatch(partner.state);
  const result = {...watch, calls: queue.calls, waitingGroups: queue.waitingGroups,
    cupHeading: partner.cupHeading, followPartner: partner.followPartner};
  if (watch.next !== '0x42960b') return result;
  const destination = originalWalkingBallDestination({...watch.state, cupHeading: partner.cupHeading, followPartner: partner.followPartner});
  return {...result, ...destination};
}
