// golf.exe 0x40a9f0–0x40aa70, restricted to original map-coordinate differences.
// Large components have independent scaling; replacing this with hypot changes
// the original result when either component exceeds 16384.
export function originalMapDistance(dx,dz) {
  if (![dx,dz].every(n=>Number.isInteger(n) && Math.abs(n)<=51200))
    throw Error('Original distance is outside the verified map domain.');
  let x=dx,z=dz,scale=1;
  if(Math.abs(x)>16384){x=Math.trunc(x/8);scale=8;}
  if(Math.abs(z)>16384){z=Math.trunc(z/8);scale*=8;}
  return Math.trunc(Math.sqrt(x*x+z*z)*scale);
}
// 0x40c1a0–0x40c1e1: fixed-point origin to target tile centre.
export function originalRouteSegment(origin,targetTile) {
  if (!origin || !targetTile || ![origin.x,origin.z].every(n=>Number.isInteger(n)&&n>=0&&n<=51200) ||
      ![targetTile.x,targetTile.z].every(n=>Number.isInteger(n)&&n>=0&&n<50))
    throw Error('Invalid original route segment.');
  const distance=originalMapDistance(origin.x-targetTile.x*1024-512,origin.z-targetTile.z*1024-512);
  return Math.trunc(distance*25/1024);
}
