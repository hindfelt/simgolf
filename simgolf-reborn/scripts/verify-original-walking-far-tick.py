"""Continuous far routing through movement; slope/reaction/audio effects controlled."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EDI,UC_X86_REG_EBX,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[]
def hook(u,a,size,data):
 global end
 if a in [0x4295ef,0x42adac,0x42d23c,0x42b825]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a in [0x46c140,0x4672d0,0x40c1f0,0x40c140,0x42def0]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,2 if a==0x46c140 else 6 if a==0x42def0 else 5 if a==0x40c1f0 else 4)];calls.append(dict(address=a,args=args))
  if a==0x42def0:return
  if a==0x4672d0:u.mem_write(0x577f78+args[0]*256,bytes([36]))
  u.reg_write(UC_X86_REG_EAX,1);u.reg_write(UC_X86_REG_EIP,get(sp)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4)

for address in [0x4295ef,0x42adac,0x42d23c,0x42b825,0x46c140,0x4672d0,0x40c1f0,0x40c140,0x42def0]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42793);rows=[]
for i in range(160):
 b=bytearray(152*256);id=i%2
 for j in range(20):
  off=j*256;b[off+0x29]=rng.choice([0,1,1,1,2]);b[off+0x2a]=rng.choice([0,0,1]);b[off+0x22]=rng.randrange(8);b[off+0x25]=rng.choice([0,11,12]);b[off+0x78]=rng.choice([0,36]);struct.pack_into('<h',b,off+0xaa,j^1);struct.pack_into('<h',b,off+0xc6,rng.randrange(4));struct.pack_into('<h',b,off+0xb2,7);struct.pack_into('<ii',b,off+8,24000+rng.randrange(-500,500),24000+rng.randrange(-500,500));struct.pack_into('<I',b,off+0x18,rng.choice([0,0,0,0x1000,0x20000000]))
 b[id*256+0x29]=1;struct.pack_into('<I',b,id*256+0x18,rng.choice([0,0,0x1000,0x2000]))
 q=dict(actorId=id,avoidanceCursor=rng.randrange(152),queueClock=100,followPartner=rng.randrange(2),seed=rng.getrandbits(32))
 if i%4==0:
  q['avoidanceCursor']=id
  for j in range(20):
   off=j*256;b[off+0x29]=1;b[off+0x2a]=0;b[off+0x22]=2;b[off+0x25]=0;struct.pack_into('<h',b,off+0xc6,0);struct.pack_into('<I',b,off+0x18,0);struct.pack_into('<ii',b,off+8,24200,24000)
  struct.pack_into('<I',b,id*256+0x18,0x1000 if i%8==0 else 0);struct.pack_into('<ii',b,id*256+8,24000,24000)
 q.update(distance=6000,delta=dict(x=250,z=-200),reversalCheck=1,difficulty=i%3);struct.pack_into('<h',b,id*256+0xac,-1 if i%5==0 else 1);put(0x820344,q['difficulty']);put(0x10202c,1);put(0x10207c,-200);u.reg_write(UC_X86_REG_EDI,250);u.reg_write(UC_X86_REG_EAX,500)
 q.update(actorIndex=23*50+23,actorTile=dict(x=23,z=23),nextTerrain=1,phaseCounter=i,worldFlags=0,selectionState=-1,cachedFlags=0,cartUpgrade=0,fastWalking=0,destination=dict(x=24250,z=23800),walkingOverride=0);put(0x59d208,0);put(0x5a4440,-1);put(0x599a9c,0);put(0x831828,i);put(0x102070,6000);put(0x10203c,q['actorIndex']);put(0x102040,23);put(0x10204c,23);put(0x102050,0);put(0x102034,0);u.mem_write(0x570d38,bytes([10]*2500));u.mem_write(0x53ba00,bytes(5000));u.mem_write(0x576dc2+48,bytes([0]));u.mem_write(0x576dc5+48,bytes([1]));u.mem_write(0x577f00,bytes(b));put(0x5a446c,q['avoidanceCursor']);put(0x568f6c,100);put(0x820454,q['seed']);put(0x102010,id);put(0x102024,q['followPartner']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_FPCW,0x37f);q.update(destination=dict(x=30000,z=30000),previousFacing=i%8,ballTerrain=1);put(0x102048,q['previousFacing']);put(0x102030,1);u.reg_write(UC_X86_REG_EBX,30000);u.reg_write(UC_X86_REG_ESI,30000);u.mem_write(0x53aabc,bytes([2]*2500));put(0x838684,0);u.mem_write(0x58bdc0,bytes(2500));struct.pack_into('<h',b,id*256+0x1c,128 if i%5==0 else 0);u.mem_write(0x577f00,bytes(b));end=None;calls=[];u.emu_start(0x42aa30,0x400fff,count=10000000);assert end
 rows.append([q,list(b),dict(actors=list(u.mem_read(0x577f00,len(b))),seed=get(0x820454)&0xffffffff,calls=calls,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingFarTick}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,e] of rows){const r=originalWalkingFarTick({...q,actors:Array.from({length:152},(_,i)=>new Uint8Array(b.slice(i*256,(i+1)*256))),terrain:new Uint8Array(2500).fill(10),tileFlags:new Uint16Array(2500),metadata:[{}, {walkingCost:1,shotClass:0}],traversalCosts:new Int8Array(2500).fill(2),metadataClass:new Uint8Array(128)},(event,state)=>{if(event.address===0x4672d0)state.actors[event.args[0]][0x78]=36;return {state,value:1};});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),seed:r.state.seed,calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));coverage[r.next]=(coverage[r.next]??0)+1;const before=b.slice(q.actorId*256+8,q.actorId*256+16),after=Array.from(r.state.actors[q.actorId].slice(8,16));if(!isDeepStrictEqual(before,after))coverage.positionChanges=(coverage.positionChanges??0)+1;}console.log(`${rows.length} continuous native far-walking ticks match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-far-tick.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
