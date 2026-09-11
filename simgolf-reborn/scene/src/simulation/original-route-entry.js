// 0x42245e–0x42252c, after the native stack frame is allocated.
// The initial range query sees these flags before mode/target normalization.
export function originalRouteEntry(q,rangeFor) {
 const query={actorId:q.actorId,worldFlags:(q.worldFlags|0x800000)>>>0,
  candidateSkillMask:q.skillMask,searchActive:1,searchFlag:1,cornerTarget:0};
 const range=rangeFor({...query});
 const originTile={x:q.origin.x>>10,z:q.origin.z>>10};
 return {...query,scores:Array.from({length:441},()=>Array(6).fill(0)),
  winnerTargetX:-1,curve:0,range,previousTarget:{...q.previousTarget},
  originTile,terrainCode:q.terrainAt(originTile).code};
}
