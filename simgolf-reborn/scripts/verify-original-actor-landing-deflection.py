"""Execute native rock/luck landing deflections, including distance and heading."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4672d0]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
draws=0;sounds=[];adjusted=False;calls=[];current=None
def hook(u,a,size,data):
 global draws,adjusted
 if a==0x45ba70:draws+=1
 if a in [0x40c1f0,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[read(sp+4+i*4) for i in range(4 if a==0x40c1f0 else 3)];calls.append(dict(address=a,args=args))
 if a==0x40c1f0:
  sounds.append(args[0])
  if current['mutate'] and args[0]!=24:write(0x577fec,200)
  if current['mutate'] and args[0]==24:write(0x577fe8,123456);write(0x577fdc,21000)
 if a==0x4672d0:write(0x577f18,1234)
 if a==0x4672d0:adjusted=True
u.reg_write(UC_X86_REG_FPCW,0x37f);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3000):
 q=dict(x=20992+rng.randrange(-4096,4097),z=20992+rng.randrange(-4096,4097),speed=rng.choice([256,257,1000]),heading=rng.randrange(2**32),terrainCode=rng.choice([1,12]),boundaryFlags=rng.choice([0,0,8]),skillEnabled=bool(i%3),skillMask=512 if i%2 else 0,luck=rng.randrange(256),scatterCoefficient=rng.choice([-1,0,1]),targetTile=dict(x=20,z=20),seed=rng.randrange(2**32))
 q['mutate']=bool(i%2);current=q;draws=0;sounds=[];adjusted=False;calls=[];sp=0x102000
 u.mem_write(0x577f00,bytes(256))
 u.mem_write(0x574500+520,bytes(520))
 write(sp+0x10,0)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,48);u.reg_write(UC_X86_REG_ESI,0)
 for a,v in [(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577fec,q['speed']),(0x577fe8,q['heading']),(0x820454,q['seed']),(sp+0x14,q['terrainCode']),(sp+0x1c,q['boundaryFlags']),(0x574518+520,20),(0x57451c+520,20)]:write(a,v)
 for a,v in [(0x577f20,q['skillEnabled']),(0x578001,q['luck']),(0x577f29,1),(0x576dc2+48,q['scatterCoefficient']&255)]:u.mem_write(a,bytes([v]))
 u.mem_write(0x577f1e,struct.pack('<H',q['skillMask']))
 before=list(u.mem_read(0x577f00,256));hole=list(u.mem_read(0x574500+520,520))
 u.emu_start(0x42c815,0x42c9ea,count=10000)
 rows.append([q,before,hole,dict(actor=list(u.mem_read(0x577f00,256)),seed=read(0x820454),randomDraws=draws,calls=calls,luckAdjusted=adjusted)])
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-landing-deflection.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalActorLandingDeflection}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let effects=0;
for(const [q,b,h,e] of rows){const r=originalActorLandingDeflection({...q,actorId:0,ballTerrain:q.terrainCode,actors:[new Uint8Array(b)],holes:[null,new Uint8Array(h)]},(event,state)=>{const a=new DataView(state.actors[0].buffer);if(event.address===0x40c1f0&&q.mutate){if(event.args[0]!==24)a.setInt32(0xec,200,true);else{a.setUint32(0xe8,123456,true);a.setInt32(0xdc,21000,true);}}if(event.address===0x4672d0)a.setUint32(0x18,1234,true);return {state};});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,randomDraws:r.randomDraws,calls:r.calls,luckAdjusted:r.luckAdjusted};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));effects+=r.calls.length;}
console.log(`${rows.length} native landing actor sequences match; ${effects} ordered effects.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
