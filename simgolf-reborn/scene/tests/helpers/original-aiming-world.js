// Controlled actor/effect fixture for the complete first-hole aiming path.
export function aimingWorld(){
const actors=Array.from({length:152},()=>new Uint8Array(256)),b=actors[2],a=new DataView(b.buffer);
b[0x29]=1;b[0x28]=1;b[0x78]=11;a.setInt16(0xaa,3,true);actors[3][0x20]=32;
for(const [o,v] of [[8,20000],[12,25000],[0xdc,20000],[0xe0,25000],[0xcc,20000],[0xd0,25000],[0x10,-1]])a.setInt32(o,v,true);
a.setUint32(0x18,0x200,true);
return {actors,seed:17,phaseCounter:30,globalFlags:32,updateScratch:0,modeCounter:0,modeByte:0,holeTargets:[null,{x:25,z:35}],difficulty:5,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,detailLevel:4,environmentByte:0,conditionRange:20,variant:0,luck:0,terrain:new Uint8Array(2500).fill(2),metadata:Array.from({length:23},()=>({shape:1})),tileFlags:new Uint16Array(2500)};
}
