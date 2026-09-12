"""Native post-rebound flags, slopes, scattering and terrain stop."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c140,0x40bc90]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
current=None;draws=0;queried=[];calls=[]
def hook(u,a,size,data):
 global draws
 if a in [0x40c140,0x40bc90]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[signed(sp+4+i*4) for i in range(3 if a==0x40c140 else 2)]))
 if a==0x40c140:
  d=read(u.reg_read(UC_X86_REG_ESP)+12);queried.append(d);u.reg_write(UC_X86_REG_EAX,current['slopes'][d]&0xffffffff)
  if current['mutate']:write(0x577ff0,123+len(queried));write(0x577fe8,98765)
 if a==0x40bc90:u.reg_write(UC_X86_REG_EAX,current['currentTerrainCode'])
 if a==0x45ba70:draws+=1
u.reg_write(UC_X86_REG_FPCW,0x37f);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3000):
 q=dict(speed=rng.randrange(4000),heading=rng.randrange(2**32),verticalSpeed=rng.randrange(10000),stateFlags=rng.choice([0,128,256,384]),direction=rng.randrange(8),scatterCoefficient=rng.randrange(-2,6),currentTerrainCode=rng.choice([1,17]),boundaryFlags=rng.choice([0,0,8]),seed=rng.randrange(2**32),slopes=[rng.randrange(-8,9) for j in range(8)])
 q['mutate']=bool(i%2);current=q;draws=0;queried=[];calls=[];sp=0x102000
 u.mem_write(0x577f00,bytes(256))
 for addr in [0x57724c,0x577250,0x4c1e18]:write(addr,77)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,48)
 for a,v in [(0x577fec,q['speed']),(0x577fe8,q['heading']),(0x577ff0,q['verticalSpeed']),(0x577f18,q['stateFlags']),(sp+0x50,q['direction']),(sp+0x1c,q['boundaryFlags']),(0x820454,q['seed'])]:write(a,v)
 u.mem_write(0x576dc2+48,bytes([q['scatterCoefficient']&255]))
 before=list(u.mem_read(0x577f00,256))
 u.emu_start(0x42c648,0x42c815,count=10000)
 e=dict(actor=list(u.mem_read(0x577f00,256)),seed=read(0x820454),calls=calls,randomDraws=draws,terrainStopX=signed(0x57724c),terrainStopZ=signed(0x577250),terrainStopState=signed(0x4c1e18))
 rows.append([q,before,e])
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-impact.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalActorImpact}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,b,e] of rows){let n=0;const r=originalActorImpact({...q,actors:[new Uint8Array(b)],actorId:0,terrainStopX:77,terrainStopZ:77,terrainStopState:77},(event,state)=>{let value=q.currentTerrainCode;if(event.address===0x40c140){value=q.slopes[event.args[2]];n++;if(q.mutate){const a=new DataView(state.actors[0].buffer);a.setInt32(0xf0,123+n,true);a.setUint32(0xe8,98765,true);}}return {state,value};});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,calls:r.calls,randomDraws:r.randomDraws,terrainStopX:r.state.terrainStopX,terrainStopZ:r.state.terrainStopZ,terrainStopState:r.state.terrainStopState};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} native actor impacts match full actor state, terrain-stop globals, ordered queries and RNG.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
