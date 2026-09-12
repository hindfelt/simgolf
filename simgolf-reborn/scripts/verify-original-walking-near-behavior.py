"""Continuous near steering, avoidance and congestion; reaction effects controlled."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[]
def hook(u,a,size,data):
 global end
 if a in [0x42af66,0x42adac]:end=hex(a);u.emu_stop()
 if a in [0x46c140,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,2 if a==0x46c140 else 4)];calls.append(dict(address=a,args=args))
  if a==0x4672d0:u.mem_write(0x577f78+args[0]*256,bytes([36]))
  u.reg_write(UC_X86_REG_EAX,1);u.reg_write(UC_X86_REG_EIP,get(sp)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42793);rows=[]
for i in range(700):
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
 q.update(distance=500,delta=dict(x=250,z=-200),reversalCheck=1,difficulty=i%3);struct.pack_into('<h',b,id*256+0xac,-1 if i%5==0 else 1);put(0x820344,q['difficulty']);put(0x10202c,1);put(0x10207c,-200);u.reg_write(UC_X86_REG_EDI,250);u.reg_write(UC_X86_REG_EAX,500)
 u.mem_write(0x577f00,bytes(b));put(0x5a446c,q['avoidanceCursor']);put(0x568f6c,100);put(0x820454,q['seed']);put(0x102010,id);put(0x102024,q['followPartner']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;calls=[];u.emu_start(0x42a71c,0x400fff,count=100000);assert end
 rows.append([q,list(b),dict(actors=list(u.mem_read(0x577f00,len(b))),movementReady=get(0x102044),crowdCount=get(0x102048),scanIndex=get(0x10201c),seed=get(0x820454)&0xffffffff,calls=calls,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingNearBehavior}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,e] of rows){const r=originalWalkingNearBehavior({...q,actors:Array.from({length:152},(_,i)=>new Uint8Array(b.slice(i*256,(i+1)*256)))},(event,state)=>{if(event.address===0x4672d0)state.actors[event.args[0]][0x78]=36;return {state,value:1};});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),movementReady:r.movementReady,crowdCount:r.crowdCount,scanIndex:r.scanIndex,seed:r.state.seed,calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));coverage[r.next]=(coverage[r.next]??0)+1;}console.log(`${rows.length} native near-behavior cases match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-near-behavior.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
