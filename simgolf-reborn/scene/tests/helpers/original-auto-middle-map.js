// Controlled world records shared by the uninterrupted native verifier/tests.
export function middleMap(q) {
 const records=Array.from({length:256},(_,i)=>({type:i%5===0?-1:i%3===0?q.record.type:i%2?6:7,x:(i%16)*3,z:Math.floor(i/16)*3,value:q.record.value}));
 return {heightAt:(x,z)=>q.heightBase+((x+z)&3),
  terrainAt:(x,z)=>{const i=x*50+z;if(i<0||i>=2500)return 0;x=Math.floor(i/50);z=i%50;
   if(q.originTerrainCode!==undefined&&x===q.origin.x&&z===q.origin.z)return q.originTerrainCode;
   if(x===q.state.actor.target.x&&z===q.state.actor.target.z)return q.targetTerrainCode;
   return (x-z)%7===0?3:[2,19,21,22][(x+z)%4];},
  marksAt:(x,z)=>x===q.origin.x&&z===q.origin.z?q.originFlags:(x+z)%6===0?0x100:0,
  shotClassAt:code=>code===17?q.restorationClasses?.[0]??0:code===20?q.restorationClasses?.[1]??0:code===3?1:code===19?2:0,kindAt:code=>code===3?13:0,categoryAt:code=>[21,22].includes(code)?16:0,
  baseSizeAt:type=>({4:2,5:3,6:1,7:2})[type],expansionAt:type=>type===6?3:9,objectAt:index=>index===-1?q.missingRecord:records[index],
  holeRecordAt:()=>q.holeRecord,profileHoleMarkAt:()=>q.profileHoleMark,
  profileIndexFor:id=>id===0?q.state.actor.profileIndex:q.otherProfileIndex,profileByteAt:index=>q.profileBytes[index]};
}
export function middleEffects(q) {
 return {emit:(event,state)=>{
  const actor=event.actorId===0?state.actor:state.partner;
  if(q.effect==='marker'&&event.actorId===0)actor.marker=(actor.marker+1)&255;
  if(q.effect==='reaction')actor.reaction=1;
  return state;
 }};
}
