// 0x423ee1–0x423f48. Original raw vertex heights, not interpolated physics
// heights. The distance already includes any earlier approach adjustment.
export function originalElevationDistance({distance,skillMask,origin,target},readHeight) {
 const int=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(!int(distance)||!Number.isInteger(skillMask))throw Error('Invalid original elevation distance.');
 if(!(skillMask&4))return distance;
 if(typeof readHeight!=='function'||![origin,target].every(p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.z)))throw Error('Original elevation correction requires tile positions and heights.');
 const targetHeight=readHeight(target.x,target.z),originHeight=readHeight(origin.x,origin.z);
 if(!int(targetHeight)||!int(originHeight))throw Error('Invalid original raw height.');
 const difference=(targetHeight-originHeight)|0;
 return (distance+Math.trunc(Math.imul(difference,25)/(difference>0?8:10)))|0;
}
