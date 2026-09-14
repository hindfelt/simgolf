import {test,expect} from '@playwright/test';
import {originalShotLine} from '../src/simulation/original-shot-line.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt32(0xcc,20000,true);a.setInt32(0xd0,25000,true);a.setInt32(0xd4,20,true);a.setInt32(0xd8,30,true);a.setInt32(0xec,100,true);b[0x29]=1;return {actorId:0,actors:[b],globalFlags:32,ballTerrain:1,holeTargets:[null,{x:25,z:35}]};}
test('shot line projects both endpoints before drawing and then projects the cup',()=>{
 const q=fresh();let n=0;const r=originalShotLine(q,(e,state)=>({state,point:e.address===0x47edd0?undefined:{x:100+n++,y:150,visible:true}}));
 expect(r.calls).toEqual([{address:0x42f270,args:[20000,25000,0]},{address:0x42f020,args:[20,30]},{address:0x47edd0,args:[100,150,101,150,0x80006318]},{address:0x42f020,args:[25,35]}]);
});
test('fixed target coordinates are shifted only for the flagged target format',()=>{
 const q=fresh();new DataView(q.actors[0].buffer).setUint32(0x18,0x10000000,true);
 const r=originalShotLine(q,(_,state)=>({state,point:{x:10,y:20,visible:true}}));expect(r.calls[1]).toEqual({address:0x42f270,args:[20480,30720,0]});
});
test('clipped or disabled lines produce no drawing and missing projection fails explicitly',()=>{
 const q=fresh();expect(originalShotLine({...q,globalFlags:0}).calls).toEqual([]);
 const r=originalShotLine(q,(_,state)=>({state,point:{x:-20,y:100,visible:false}}));expect(r.calls).toHaveLength(1);
 expect(()=>originalShotLine(q)).toThrow(/explicit resolver/);
});
