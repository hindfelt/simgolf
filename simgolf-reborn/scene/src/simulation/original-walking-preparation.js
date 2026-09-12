import {originalWalkingQueue} from './original-walking-queue.js';
import {originalWalkingPartner} from './original-walking-partner.js';
import {originalWalkingWatch} from './original-walking-watch.js';

// Continuous preparation from 0x4290ca. Destination selection is still explicit.
export function originalWalkingPreparation(snapshot, resolve) {
  const queue = originalWalkingQueue(snapshot, resolve);
  const partner = originalWalkingPartner(queue.state);
  const watch = originalWalkingWatch(partner.state);
  return {...watch, calls: queue.calls, waitingGroups: queue.waitingGroups,
    cupHeading: partner.cupHeading, followPartner: partner.followPartner};
}
