// Observe live transitions only: importing a save or reconnecting is not a shot.
export function createShotSoundTracker(){
 let previous=null,lastTime=null;
 return {reset(){previous=null;lastTime=null;},observe(g){
  const current=new Set(),events=[];
  const continuous=previous!==null&&g.time>=lastTime&&g.time-lastTime<=1;
  for(const v of [...g.guests,...(g.pro?[g.pro]:[])]){
   if(!v.shot)continue;
   const id=`${v.id}:${v.roundId}:${v.holeId}:${v.strokes}`;current.add(id);
   if(continuous&&!previous.has(id)&&v.shot.time<=.3)events.push({id,kind:v.shot.putt?'putt':'drive',position:{...v.shot.from}});
  }
  previous=current;lastTime=g.time;return events;
 }};
}
