import {test,expect} from '@playwright/test';
import {originalActorTurn} from '../src/simulation/original-actor-turn.js';
function fresh(){
 const b=new Uint8Array(256),a=new DataView(b.buffer);
 a.setInt32(8,20480,true);a.setInt32(12,25600,true);a.setInt32(0xdc,10240,true);a.setInt32(0xe0,10240,true);
 a.setInt32(0xcc,10240,true);a.setInt32(0xd0,10240,true);a.setInt32(0xd4,20,true);a.setInt32(0xd8,30,true);
 a.setInt32(0xec,100,true);a.setInt16(0xaa,1,true);b[0x29]=1;b[0x28]=1;b[0x78]=11;
 const partner=b.slice();
 return {actorId:0,actors:[b,partner],globalFlags:32,holeTargets:[null,{x:25,z:35}],seed:17,phaseCounter:0,difficulty:5,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,modeByte:0,detailLevel:4,environmentByte:0,conditionRange:20,metadata:[{}, {shape:1}],terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500)};
}
test('active shot crosses actor decision into actual ball movement',()=>{
 const s=fresh();s.actors=Array.from({length:152},(_,i)=>s.actors[i]||new Uint8Array(256));s.metadata[1]={shape:1,bounceCoefficient:4,rollCoefficient:3,scatterCoefficient:0};s.edgeMasks=new Uint8Array(2500);s.variant=0;s.luck=0;s.worldFlags=0;
 const a=new DataView(s.actors[0].buffer);a.setUint8(0x28,3);a.setInt32(0xe4,300,true);a.setUint32(0x18,0x40000,true);a.setUint8(0x25,5);
 const r=originalActorTurn(s,(_,state)=>({state,value:0,result:0,point:{x:0,y:0,visible:false}}));
 expect(r.next).toBe('0x4295ef');expect(new DataView(r.state.actors[0].buffer).getInt32(0xe0,true)).toBeLessThan(10240);expect(r.calls.some(e=>e.address===0x42f110)).toBe(true);
});
