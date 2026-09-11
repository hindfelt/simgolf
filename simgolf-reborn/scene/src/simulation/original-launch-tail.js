import {originalShotShape} from './original-shot-shape.js';
import {originalLaunchRecovery} from './original-launch-recovery.js';
import {originalLaunchFinish} from './original-launch-finish.js';
// Entire final arithmetic sequence 0x42536b–0x425ab9. Upstream planning
// has already selected targets, lie and velocity; rendering state is excluded.
export function originalLaunchTail(q,terrainClass) {
 const shaped=originalShotShape(q),baseSpeed=shaped.speed;
 const recovered=originalLaunchRecovery({...q,...shaped,baseSpeed},terrainClass);
 const finished=originalLaunchFinish({...q,...shaped,...recovered,baseSpeed,shotClass:terrainClass(recovered.lie)});
 return {...finished,lie:recovered.lie,shotType:shaped.shotType,draws:recovered.draws+finished.draws};
}
