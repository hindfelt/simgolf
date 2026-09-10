const directions=[{x:0,z:-1},{x:1,z:-1},{x:1,z:0},{x:1,z:1},
  {x:0,z:1},{x:-1,z:1},{x:-1,z:0},{x:-1,z:-1}];
// Direct-approach branch 0x4239f7–0x423b66, after the planner's route-search
// decision. Terrain values are original signed shot-class bytes, not heights.
export function originalShotApproach({distance,facing,target,terrainCode,currentShotClass,shotClassAt}) {
  if(!Number.isInteger(distance)||distance<0||distance>2000||
    !Number.isInteger(facing)||facing<0||facing>7||
    !target||![target.x,target.z].every(n=>Number.isInteger(n)&&n>=0&&n<50)||
    !Number.isInteger(terrainCode)||terrainCode<0||terrainCode>127||
    !Number.isInteger(currentShotClass)||currentShotClass< -128||currentShotClass>127)
    throw Error('Invalid original approach inputs.');
  const landing={x:target.x*1024+512,z:target.z*1024+512};
  if(terrainCode===1||distance<=25)return {distance,landing};
  if(typeof shotClassAt!=='function')throw Error('Original approach needs terrain classes.');
  const classAt=(direction,sign)=>{
    const value=shotClassAt({x:target.x+direction.x*sign,z:target.z+direction.z*sign});
    if(!Number.isInteger(value)||value< -128||value>127)throw Error('Invalid original approach terrain class.');
    return value;
  };
  const a=directions[facing&6],b=directions[(facing+1)&6];
  const balance=classAt(a,-1)+classAt(b,-1)-classAt(a,1)-classAt(b,1);
  if(balance>=4)distance+=Math.max(0,Math.min(12,Math.trunc(distance/4)-(currentShotClass>0?0:6)));
  if(balance<=-4)distance-=6;
  return {distance,landing};
}
