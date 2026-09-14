import {originalRouteSegment} from './original-route-distance.js';
import {originalDesignGeometry} from './original-design-geometry.js';

// 0x413230–0x413619: active passes 2 and 3 use masks 3 and 7.
// planShot must implement the original planner; this orchestration does not
// substitute the browser's route heuristic or advance real golfers.
export function originalDesignPass({tee,green,teeHeight,greenHeight,flags=0,planShot,terrainAt,landingCache}) {
  const tileValid=p=>p && [p.x,p.z].every(n=>Number.isInteger(n)&&n>=0&&n<50);
  const cached=landingCache!==undefined;
  if(!tileValid(tee)||!tileValid(green)||(!cached&&typeof planShot!=='function')||typeof terrainAt!=='function'||
      (cached&&(!Array.isArray(landingCache)||landingCache.length<2||landingCache.length>6||!landingCache.every(tileValid))))
    throw Error('Invalid original design pass.');
  const centre=p=>({x:p.x*1024+512,z:p.z*1024+512});
  const landings=[];
  const plan=(skillMask,shot,from)=>{
    // Source 0x4133ad consumes the same sequential tile cache as 0x413381 writes.
    if(cached) {
      const point=landingCache[landings.length];
      if(!point)throw Error('Original design landing cache is incomplete.');
      landings.push({...point});
      return {...point};
    }
    const point=planShot({actorId:154,skillMask,shot,from:{...from},green:{...green}});
    if(!point||![point.x,point.z].every(n=>Number.isInteger(n)&&n>=0&&n<51200))
      throw Error('Original planner returned an invalid landing.');
    const landing={x:point.x>>10,z:point.z>>10};
    landings.push({...landing});
    return landing;
  };
  const firstLanding=plan(3,0,centre(tee));
  const segments=[];
  let from=centre(tee),last={...tee},suggestedPar=0,stop='shot-limit';
  for(let shot=0;shot<5;shot++) {
    last=plan(7,shot,from);
    const terrain=terrainAt({...last});
    if(!terrain||!Number.isInteger(terrain.shotClass)||!Number.isInteger(terrain.code))
      throw Error('Invalid original design terrain.');
    if(terrain.shotClass>1){stop='unplayable';break;}
    segments.push({origin:{...from},targetTile:{...last}});
    from=centre(last);
    if(!suggestedPar && terrain.code===1)suggestedPar=shot+3;
    if(last.x===green.x && last.z===green.z){stop='cup';break;}
  }
  // The final source coordinate check also runs after terrain/shot-limit exits.
  const reachedCup=last.x===green.x && last.z===green.z;
  const routeMeasure=segments.reduce((sum,s)=>sum+originalRouteSegment(s.origin,s.targetTile),0);
  return {firstLanding,landings,segments,last,stop,reachedCup,suggestedPar,routeMeasure,
    length:reachedCup?(routeMeasure<<16)>>16:0,
    geometry:originalDesignGeometry({tee,green,firstLanding,routeMeasure,teeHeight,greenHeight,flags})};
}
