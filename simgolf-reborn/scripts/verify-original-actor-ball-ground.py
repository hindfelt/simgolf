"""Continuous native drop/penalty branch with native projection, lookup and distance."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EDI,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4672d0,0x4093b0,0x4219e0,0x40c140,0x42f110]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];samples=0;mutate=False

def hook(u,a,size,data):
 global samples
 if a==0x4295ef:u.emu_stop()
 if a in [0x40c140,0x42f110]:u.reg_write(UC_X86_REG_EAX,0)
 if a==0x4219e0:u.reg_write(UC_X86_REG_EAX,100)
 if a==0x40bc90 and struct.unpack('<I',u.mem_read(u.reg_read(UC_X86_REG_ESP),4))[0]==0x42c7d5:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4),read(sp+8)]))
 if a==0x42cfea:samples+=1
 if a in [0x40c1f0,0x4672d0,0x4093b0,0x4219e0,0x40c140,0x42f110]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(4 if a==0x40c1f0 else 3 if a in [0x4672d0,0x40c140] else 2 if a==0x42f110 else 1)]))
  if mutate and a==0x4672d0:put(0x577fcc,read(0x577fcc)+128);put(0x577fe0,read(0x577fe0)+64)
u.hook_add(UC_HOOK_CODE,hook)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(2002);rows=[]
for i in range(800):
 b=bytearray(256);b[0x29]=1;b[0x2a]=rng.choice([1,7,8,127,255]);b[0x22]=rng.randrange(8);b[0x25]=rng.choice([0,13]);struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<ii',b,8,22000,24000)
 struct.pack_into('<ii',b,0xcc,rng.randrange(16000,22000),rng.randrange(16000,22000));struct.pack_into('<ii',b,0xdc,25000,25000)
 struct.pack_into('<i',b,0xec,32);struct.pack_into('<i',b,0xf0,-64)
 code=rng.choice([1,10,17,20]);centre=rng.choice([0,1]);terrain=[([17,10,1,1,1,1,1][(x+z+i)%7]) for x in range(50) for z in range(50)];terrain[24*50+24]=code
 scatter={1:-1,10:1,17:2,20:3};metadata=[{} for _ in range(21)]
 for c,v in scatter.items():u.mem_write(0x576dc0+c*48,b'\x00\x00');metadata[c]=dict(scatterCoefficient=v);u.mem_write(0x576dc2+c*48,bytes([v&255]))
 q=dict(rollCoefficient=0,phaseCounter=1,edgeFlags=0,stepX=0,stepCosine=0,subX=6,subZ=6,ballTile=dict(x=24,z=24),worldFlags=0,bounceCoefficient=0,boundaryFlags=0,ballTerrain=code,scatterCoefficient=scatter[code],direction=0,luck=0,actorId=0,actors=[list(b)],landingTerrain=code,landingTile=dict(x=24,z=24),centreFlag=centre,holeTargets=[None,dict(x=45,z=45)],terrain=terrain,metadata=metadata,seed=17)
 u.mem_write(0x574500+520,bytes(520));u.mem_write(0x574500+520,b'\x04');u.mem_write(0x5698c0,bytes(184));u.mem_write(0x53d934,bytes(2500));u.mem_write(0x53ba00,bytes(5000));put(0x820344,0);put(0x102030,-1);put(0x102050,0);put(0x10201c,0);put(0x102074,6);put(0x102070,0);put(0x10206c,0);put(0x831828,1);put(0x59d208,0);u.mem_write(0x5608b0+1224,b'\x00')
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes(terrain));put(0x574518+520,45);put(0x57451c+520,45);put(0x102010,0);put(0x102014,code);put(0x102018,24);put(0x102020,24);put(0x102028,centre);put(0x820454,17)
 calls=[];samples=0;mutate=i%2==0;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,6);u.reg_write(UC_X86_REG_EDI,code);u.reg_write(UC_X86_REG_EAX,25000);u.reg_write(UC_X86_REG_ECX,25000);u.emu_start(0x42bdc3,0x400fff,count=100000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(hole=list(u.mem_read(0x574500+520,520)),stat=list(u.mem_read(0x5698c0,184)),wear=u.mem_read(0x53d934+1224,1)[0],actor=list(u.mem_read(0x577f00,256)),calls=calls,candidates=samples,seed=read(0x820454))))
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-ball-motion.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorBallMotion}=await import(MODULE);let samples=0,penalties=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));r.q.terrain=Uint8Array.from(r.q.terrain);const h=new Uint8Array(520),v=new DataView(h.buffer);h[0]=4;v.setInt32(0x18,45,true);v.setInt32(0x1c,45,true);Object.assign(r.q,{holeRecords:[null,h],statRecords:[new Uint8Array(184)],tileWear:new Uint8Array(2500),tileFlags:new Uint16Array(2500),difficulty:0,visualSlot:-1});const a=originalActorBallMotion(r.q,(e,state)=>{if(r.mutate&&e.address===0x4672d0){const v=new DataView(state.actors[0].buffer);v.setInt32(0xcc,v.getInt32(0xcc,true)+128,true);v.setInt32(0xe0,v.getInt32(0xe0,true)+64,true);}return {state,result:100,value:e.address===0x40bc90?state.terrain[(e.args[0]>>10)*50+(e.args[1]>>10)]:0};});const actual={hole:Array.from(a.state.holeRecords[1]),stat:Array.from(a.state.statRecords[0]),wear:a.state.tileWear[1224],actor:Array.from(a.state.actors[0]),calls:a.calls,candidates:a.candidates,seed:a.state.seed};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({expected:r.expected,actual}));samples+=a.candidates;penalties+=a.penalty?1:0;}console.log(`800 continuous native moved-ground-to-accounting paths match; ${samples} drop candidates and ${penalties} penalties.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
