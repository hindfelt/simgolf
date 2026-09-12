"""Compare native airborne drag, terrain-height offset and obstacle deflections.
Compare ordered actor effects, including state changes inside sound callbacks.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_EDI,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x42f110,0x40c1f0,0x4672d0,0x4096e0,0x40c140,0x40bc90]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;current=None;draws=0;sound=None;calls=[]
def hook(u,a,size,data):
 global draws,sound,end
 if a in [0x42ca9d,0x4295ef]:end=hex(a);u.emu_stop();return
 if a==0x45ba70:draws+=1
 if a not in [0x42f110,0x40c1f0,0x4672d0,0x4096e0,0x40c140,0x40bc90]:return
 count={0x42f110:2,0x40c1f0:4,0x4672d0:3,0x4096e0:1,0x40c140:3,0x40bc90:2}[a]
 args=[signed(u.reg_read(UC_X86_REG_ESP)+4+4*n) for n in range(count)]
 calls.append(dict(address=a,args=args))
 if a==0x42f110:u.reg_write(UC_X86_REG_EAX,current['terrainHeight']&0xffffffff)
 if a==0x40c140:u.reg_write(UC_X86_REG_EAX,0)
 if a==0x40bc90:u.reg_write(UC_X86_REG_EAX,1)
 if a==0x40c1f0:
  sound=args[0]
  if current['effectMode']==1:write(0x577f18,read(0x577f18)|2)
  if current['effectMode']==2:write(0x577fec,1234)
 if a==0x4672d0:write(0x577f18,read(0x577f18)|0x8000)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3000):
 b=dict(x=20992+rng.randrange(-450,451),z=20992+rng.randrange(-450,451),height=rng.randrange(2,400),speed=rng.randrange(65536),verticalSpeed=rng.randrange(-2000,1),heading=rng.randrange(2**32),angularOffset=rng.randrange(-100000000,100000000),seed=0)
 q=dict(ball=b,previousTerrainHeight=rng.randrange(-200,201),terrainHeight=rng.randrange(-200,201),cellX=20,cellZ=20,terrainCode=rng.choice([1,13,14,15,16,21,22]),terrainFlags=rng.randrange(65536),variant=rng.randrange(5),stateFlags=2 if i%5==0 else 0,skillEnabled=bool(i%2),skillMask=512 if i%3 else 0,luck=rng.randrange(256),seed=rng.randrange(2**32))
 q['effectMode']=i%3;current=q;draws=0;sound=None;calls=[];sp=0x102000
 u.mem_write(0x577f00,bytes(256*152));u.mem_write(0x577f29,b'\x01');u.mem_write(0x574500+520,bytes(520));write(0x574518+520,20);write(0x57451c+520,20)
 q.update(bounceCoefficient=rng.randrange(8),scatterCoefficient=rng.randrange(4));write(sp+0x1c,0);write(sp+0x30,-1);write(sp+0x50,0);write(sp+0x10,0);write(0x820344,0)
 u.mem_write(0x576dc0+q['terrainCode']*48,bytes([q['bounceCoefficient']]));u.mem_write(0x576dc2+q['terrainCode']*48,bytes([q['scatterCoefficient']]))
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,b['x']);u.reg_write(UC_X86_REG_ECX,b['z']);u.reg_write(UC_X86_REG_EDI,20)
 for key,addr in [('x',0x577fdc),('z',0x577fe0),('verticalSpeed',0x577ff0),('height',0x577fe4),('speed',0x577fec),('heading',0x577fe8),('angularOffset',0x577ff4)]:write(addr,b[key])
 for a,v in [(sp+0x7c,q['previousTerrainHeight']),(sp+0x20,20),(sp+0x14,q['terrainCode']),(0x577f18,q['stateFlags']),(0x820454,q['seed'])]:write(a,v)
 u.mem_write(0x53ba00+1020*2,struct.pack('<H',q['terrainFlags']));u.mem_write(0x5a1f30,bytes([q['variant']]));u.mem_write(0x577f20,bytes([q['skillEnabled']]));u.mem_write(0x577f1e,struct.pack('<H',q['skillMask']));u.mem_write(0x578001,bytes([q['luck']]))
 before=list(u.mem_read(0x577f00,256))
 end=None;u.emu_start(0x42bf91,0x400fff,count=30000);assert end
 e=dict(actor=list(u.mem_read(0x577f00,256)),seed=read(0x820454),calls=calls,next=end,randomDraws=draws)
 rows.append([q,before,e])
module=(root/'simgolf-reborn/scene/src/simulation/original-airborne-motion.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAirborneMotion}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let effects=0,hits=0;
for(const [q,before,e] of rows){
 const h=new Uint8Array(520),v=new DataView(h.buffer);v.setInt32(0x18,20,true);v.setInt32(0x1c,20,true);const actors=Array.from({length:152},(_,i)=>i===0?new Uint8Array(before):new Uint8Array(256));actors[1][1]=q.luck;
 const state={actors,holes:[null,h],bounceCoefficient:q.bounceCoefficient,scatterCoefficient:q.scatterCoefficient,visualSlot:-1,direction:0,boundaryFlags:0,difficulty:0,actorId:0,previousTerrainHeight:q.previousTerrainHeight,ballTile:{x:q.cellX,z:q.cellZ},ballTerrain:q.terrainCode,terrainFlags:q.terrainFlags,variant:q.variant,luck:q.luck,seed:q.seed};
 const r=originalAirborneMotion(state,(event,state)=>{
  const a=new DataView(state.actors[0].buffer);
  if(event.address===0x40c1f0){if(q.effectMode===1)a.setUint32(0x18,a.getUint32(0x18,true)|2,true);if(q.effectMode===2)a.setInt32(0xec,1234,true);}
  if(event.address===0x4672d0)a.setUint32(0x18,a.getUint32(0x18,true)|0x8000,true);
  return {state,value:event.address===0x42f110?q.terrainHeight:event.address===0x40bc90?1:0};
 });
 const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,calls:r.calls,next:r.next,randomDraws:r.randomDraws};
 if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));effects+=r.calls.length;hits+=Number(r.hit);
}
console.log(`${rows.length} continuous native airborne motion paths match; ${effects} ordered effects, ${hits} collisions.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
