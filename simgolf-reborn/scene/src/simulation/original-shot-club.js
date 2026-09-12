// Original launch selection, 0x423f48–0x423ff8. Distance has already been
// adjusted for approach/elevation; this is before conversion to ball velocity.
export function originalShotClub({distance,range,terrainCode,explicitTarget,mode,actorFlags}) {
 if(!Number.isInteger(distance)||distance< -2147483648||distance>2147483647||
    !Number.isInteger(range)||range<=0||range>330||!Number.isInteger(terrainCode)||
    typeof explicitTarget!=='boolean'||!Number.isInteger(mode)||!Number.isInteger(actorFlags))
  throw Error('Invalid original club-selection input.');
 let strength=Math.max(0,Math.min(range,distance));
 let club=Math.max(terrainCode!==0?1:0,Math.min(11,Math.trunc(60*(range-strength)/(3*range))));
 if(explicitTarget&&mode===3&&club<5){strength=Math.trunc(13*range/18);club=5;}
 if(terrainCode===1&&strength<50&&!(actorFlags&1))club=13;
 return {strength,club};
}
