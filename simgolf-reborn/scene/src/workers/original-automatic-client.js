import {originalSearchClient} from './original-search-client.js';
// An effect response is a paused calculation, not a completed shot. Resolve
// its state change and resubmit the SAME snapshot with the reply appended.
// Course/actor changes require a fresh revision and discarded reply history.
export function originalAutomaticClient(){
 return originalSearchClient({workerUrl:new URL('./original-automatic.worker.js',import.meta.url)});
}
