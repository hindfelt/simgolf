import {originalRoundResultPrelude} from './original-round-result-prelude.js';
import {originalRoundPerformance} from './original-round-performance.js';

// Result path from 0x427a53 up to the next-hole entry at 0x427e25.
export function originalRoundResults(snapshot,resolve){
 const result=originalRoundResultPrelude(snapshot,resolve);
 if(result.next==='0x427e25')return result;
 return {...originalRoundPerformance({...result.state,totals:result.totals}),calls:result.calls,totals:result.totals,rank:result.rank,announced:result.announced};
}
