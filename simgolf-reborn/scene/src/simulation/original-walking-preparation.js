import {originalWalkingQueue} from './original-walking-queue.js';
import {originalWalkingPartner} from './original-walking-partner.js';
import {originalWalkingWatch} from './original-walking-watch.js';
import {originalWalkingBallDestination} from './original-walking-ball-destination.js';
import {originalWalkingTeeDestination} from './original-walking-tee-destination.js';
import {originalWalkingServiceSearch} from './original-walking-service-search.js';

// Continuous preparation from 0x4290ca through ball destination selection.
export function originalWalkingPreparation(snapshot, resolve) {
  const queue = originalWalkingQueue(snapshot, resolve);
  const partner = originalWalkingPartner(queue.state);
  const watch = originalWalkingWatch(partner.state);
  const result = {...watch, calls: queue.calls, waitingGroups: queue.waitingGroups,
    cupHeading: partner.cupHeading, followPartner: partner.followPartner};
  if (watch.next !== '0x42960b') return result;
  const destination = originalWalkingBallDestination({...watch.state, cupHeading: partner.cupHeading, followPartner: partner.followPartner});
  if (destination.next !== '0x4297c7') return {...result, ...destination};
  const tee = originalWalkingTeeDestination({...destination.state, waitingGroups: queue.waitingGroups});
  const prepared = {...result, ...destination, ...tee};
  if (tee.next !== '0x429947') return prepared;
  const service = originalWalkingServiceSearch({...tee.state, destination: tee.destination});
  return {...prepared, ...service, calls: [...result.calls, ...service.calls]};
}
