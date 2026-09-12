import {originalWalkingEntry} from './original-walking-entry.js';
import {originalAngryComplaint} from './original-angry-complaint.js';
export function originalWalkingEntryComplaint(snapshot,resolve){
 const entry=originalWalkingEntry(snapshot);
 if(entry.next!=='0x428b38')return {...entry,calls:[]};
 return originalAngryComplaint(entry.state,resolve);
}
