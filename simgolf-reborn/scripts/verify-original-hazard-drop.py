"""Continuous native drop/penalty branch with native projection, lookup and distance."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EDI,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4672d0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];samples=0;mutate=False

def hook(u,a,size,data):
 global samples
 if a==0x42cfea:samples+=1
 if a in [0x40c1f0,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(4 if a==0x40c1f0 else 3)]))
  if mutate and a==0x4672d0:put(0x577fcc,read(0x577fcc)+128);put(0x577fe0,read(0x577fe0)+64)
u.hook_add(UC_HOOK_CODE,hook)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(2002);rows=[]
for i in range(800):
 b=bytearray(256);b[0x29]=1;b[0x2a]=rng.choice([1,7,8,127,255]);b[0x22]=rng.randrange(8);b[0x25]=rng.choice([0,13]);struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<ii',b,8,22000,24000)
 struct.pack_into('<ii',b,0xcc,rng.randrange(16000,22000),rng.randrange(16000,22000));struct.pack_into('<ii',b,0xdc,25000,25000)
 code=rng.choice([1,10,17,20]);centre=rng.choice([0,1]);terrain=[([17,10,1,1,1,1,1][(x+z+i)%7]) for x in range(50) for z in range(50)];terrain[24*50+24]=code
 scatter={1:-1,10:1,17:2,20:3};metadata=[{} for _ in range(21)]
 for c,v in scatter.items():metadata[c]=dict(scatterCoefficient=v);u.mem_write(0x576dc2+c*48,bytes([v&255]))
 q=dict(actorId=0,actors=[list(b)],landingTerrain=code,landingTile=dict(x=24,z=24),centreFlag=centre,holeTargets=[None,dict(x=45,z=45)],terrain=terrain,metadata=metadata,seed=17)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes(terrain));put(0x574518+520,45);put(0x57451c+520,45);put(0x102010,0);put(0x102014,code);put(0x102018,24);put(0x102020,24);put(0x102028,centre);put(0x820454,17)
 calls=[];samples=0;mutate=i%2==0;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,24);u.reg_write(UC_X86_REG_EDI,code);u.emu_start(0x42ceb2,0x42d110,count=100000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),calls=calls,candidates=samples,seed=read(0x820454))))
module=(root/'simgolf-reborn/scene/src/simulation/original-hazard-drop.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalHazardDrop}=await import(MODULE);let samples=0,penalties=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));r.q.terrain=Uint8Array.from(r.q.terrain);const a=originalHazardDrop(r.q,(e,state)=>{if(r.mutate&&e.address===0x4672d0){const v=new DataView(state.actors[0].buffer);v.setInt32(0xcc,v.getInt32(0xcc,true)+128,true);v.setInt32(0xe0,v.getInt32(0xe0,true)+64,true);}return {state};});const actual={actor:Array.from(a.state.actors[0]),calls:a.calls,candidates:a.candidates,seed:a.state.seed};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));samples+=a.candidates;penalties+=a.penalty?1:0;}console.log(`800 continuous native hazard cases match; ${samples} drop candidates and ${penalties} penalties.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
