import {originalLaunchHandoff} from './original-launch-handoff.js';
import {originalAutoLaunchFinish} from './original-auto-launch-finish.js';
// q supplies the pre-assessment heading and persistent automatic context.
// prepared is originalLaunchPreparation's output for that same shot/map.
export function originalAutoPreparedLaunch(q,prepared,map,effects) {
 const update=originalLaunchHandoff(q.heading,prepared);
 return originalAutoLaunchFinish({...q,...update,terrainCode:prepared.terrainCode,
  state:{...q.state,...update.state,actor:{...q.state.actor,...update.state.actor}}},map,effects);
}
