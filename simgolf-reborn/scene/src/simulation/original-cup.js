// 0x42c354–0x42c477, reached within the original ground-motion branch.
// cellX/cellZ are the terrain-cell locals supplied by that update; do not
// recompute them from a later animation frame. Coordinates are 1024/tile.
export function originalCupCapture({ x, z, cellX, cellZ, terrainCode, cellFlags, speed, club, eventFlag }) {
  const int = Number.isInteger;
  if (![x,z,cellX,cellZ,speed].every(n=>int(n)&&n>=-0x80000000&&n<=0x7fffffff) ||
      !int(terrainCode)||terrainCode < -128||terrainCode>127 ||
      !int(cellFlags)||cellFlags<0||cellFlags>0xffff ||
      !int(club)||club<0||club>255 || typeof eventFlag!=='boolean')
    throw Error('Invalid original cup inputs.');
  if(cellX<0||cellX>=50||cellZ<0||cellZ>=50||terrainCode===20||!(cellFlags&0x80)||speed>=320)
    return null;
  const cupX=cellX*1024+512, cupZ=cellZ*1024+512;
  const dx=x-cupX, dz=z-cupZ;
  // Only the short-distance branch of 0x40a9f0 is reconstructed here.
  if(Math.abs(dx)>16384||Math.abs(dz)>16384)
    throw Error('Cup sample is outside the recovered short-distance domain.');
  const radius=Math.trunc(Math.trunc(1024/(club===13?1:3))/(eventFlag?30:20));
  const distance=Math.trunc(Math.sqrt(dx*dx+dz*dz));
  if(distance>=radius) return null;
  // Original code also triggers sound, increments its hole-completion byte,
  // calls 0x426b00 and clears a motion flag. Scoring belongs to the caller.
  return {x:cupX,z:cupZ,speed:0};
}
