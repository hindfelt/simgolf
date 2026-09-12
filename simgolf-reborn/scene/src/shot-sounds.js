// Observe live transitions only: importing a save or reconnecting is not a shot.
export function createShotSoundTracker(){
 let previous=null,lastTime=null;
 return {reset(){previous=null;lastTime=null;},observe(g){
  const current=new Set(),events=[];
  const delta=g.time-lastTime,continuous=previous!==null&&delta>=0&&delta<=1;
  const freshAge=Math.max(.3,delta+.05);
  for(const v of [...g.guests,...(g.pro?[g.pro]:[])]){
   const visit=`${v.id}:${v.roundId}`;
   if(v.shot){
    const id=`shot:${visit}:${v.holeId}:${v.strokes}`;current.add(id);
    if(continuous&&!previous.has(id)&&v.shot.time<=freshAge)events.push({id,kind:v.shot.putt?'putt':'drive',position:{...v.shot.from}});
   }
   for(const score of v.scorecard||[]){
    const id=`cup:${visit}:${score.holeId}`;current.add(id);
    const green=g.holes?.find(h=>h.id===score.holeId)?.green;
    // A pickup or penalty can complete a scorecard too. Require the observed
    // shot to end at this cup without an extra penalty stroke being added.
    if(continuous&&!previous.has(id)&&!v.shot&&green&&v.ball&&
      previous.has(`shot:${visit}:${score.holeId}:${score.strokes}`)&&
      g.time>=score.completedAt&&g.time-score.completedAt<=freshAge&&
      Math.hypot(v.ball.x-green.x,v.ball.z-green.z)<.75)
      events.push({id,kind:'cup',position:{x:green.x,z:green.z}});
   }
  }
  previous=current;lastTime=g.time;return events;
 }};
}
