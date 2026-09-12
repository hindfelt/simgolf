import {originalWalkingEntryComplaint} from './original-walking-entry-complaint.js';
import {originalAngryDeparture} from './original-angry-departure.js';
import {originalFinishedDeparture} from './original-finished-departure.js';
export function originalWalkingPrelude(snapshot,resolve){
 const entry=originalWalkingEntryComplaint(snapshot,resolve);
 const angry=originalAngryDeparture(entry.state,resolve);
 const combined={...entry,...angry,calls:[...entry.calls,...angry.calls]};
 if(angry.next!=='0x429024')return combined;
 const finished=originalFinishedDeparture(angry.state);
 return {...combined,...finished,calls:[...combined.calls,...finished.calls]};
}
