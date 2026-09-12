// Live update 0x42beb0–0x42bf82. Uses post-movement subcell coordinates
// but PRE-movement cell/terrain locals. Do not reuse the AI candidate's
// boolean boundary flag: the live path retains four distinct edge bits.
export function originalMotionSample({x,z,cellX,cellZ,terrainCode,heading},terrainAt) {
 const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
 if(![x,z,cellX,cellZ].every(int)||!Number.isInteger(terrainCode)||terrainCode< -128||terrainCode>127||
  !Number.isInteger(heading)||heading<0||heading>0xffffffff||typeof terrainAt!=='function')
  throw Error('Invalid original motion sample.');
 const subX=(x>>6)&15,subZ=(z>>6)&15;
 let boundaryFlags=0;
 for(const [active,dx,dz,bit] of [[subX<=1,-1,0,8],[subZ<=1,0,-1,1],[subX>=14,1,0,2],[subZ>=14,0,1,4]]) {
  if(!active)continue;
  // Caller supplies original map-edge storage semantics; no invented clamp.
  const neighbor=terrainAt(cellX+dx,cellZ+dz);
  if(!Number.isInteger(neighbor)||neighbor< -128||neighbor>127)throw Error('Invalid original neighbor terrain.');
  if(neighbor!==terrainCode)boundaryFlags|=bit;
 }
 return {subX,subZ,boundaryFlags,direction:(((heading>>28)+1)>>1)&7};
}
