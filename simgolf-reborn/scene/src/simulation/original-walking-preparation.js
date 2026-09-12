import {originalWalkingQueue} from './original-walking-queue.js';
import {originalWalkingPartner} from './original-walking-partner.js';
import {originalWalkingWatch} from './original-walking-watch.js';
import {originalWalkingBallDestination} from './original-walking-ball-destination.js';
import {originalWalkingTeeDestination} from './original-walking-tee-destination.js';
import {originalWalkingServiceSearch} from './original-walking-service-search.js';
import {originalWalkingServiceFallback} from './original-walking-service-fallback.js';
import {originalWalkingPartnerService} from './original-walking-partner-service.js';
import {originalWalkingType6Service} from './original-walking-type6-service.js';

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
  let prepared = {...result, ...destination, ...tee};
  if (tee.next === '0x429947') {
    const service = originalWalkingServiceSearch({...tee.state, destination: tee.destination});
    prepared = {...prepared, ...service, calls: [...result.calls, ...service.calls]};
    if (service.next !== '0x4299c0') return prepared;
  }
  const fallback = originalWalkingServiceFallback({...prepared.state, destination: prepared.destination, serviceIndex: prepared.serviceIndex ?? -1, waitingGroups: queue.waitingGroups, skipPrimaryService: tee.next === '0x429a84'});
  const combined = {...prepared, ...fallback, calls: [...prepared.calls, ...fallback.calls]};
  if (fallback.next !== '0x429aae') return combined;
  const secondary = originalWalkingPartnerService({...fallback.state, destination: fallback.destination, serviceIndex: fallback.serviceIndex});
  const optional = originalWalkingType6Service({...secondary.state, destination: secondary.destination, serviceIndex: secondary.serviceIndex});
  return {...combined, ...secondary, ...optional, calls: [...combined.calls, ...secondary.calls, ...optional.calls]};
}
