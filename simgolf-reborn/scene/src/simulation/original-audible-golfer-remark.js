import {originalAudibleRemarkWorld} from './original-audible-remark-world.js';
import {originalRemarkRecordView,applyOriginalRemarkRecordView} from './original-remark-record-view.js';
// Entry/exit use golfer-loop record coordinates. Remark callbacks and detailed
// reaction diagnostics retain the remark routine's native record coordinates.
export function originalAudibleGolferRemark(q,options={}){
 const view=originalRemarkRecordView(q.state);
 const result=originalAudibleRemarkWorld({...q,state:view,holeRecords:view.holeRecords},options);
 return {...result,state:applyOriginalRemarkRecordView(q.state,result.state)};
}
