"""Native 152-actor nearby scan and stop decision with reaction mutations."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4672d0,b'\xc3');u.reg_write(UC_X86_REG_FPCW,0x37f)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];end=None;q=None
def hook(u,a,size,data):
 global end
 if a in [0x42ca9d,0x4295ef]:end=hex(a);u.emu_stop();return
 if a!=0x4672d0:return
 sp=u.reg_read(UC_X86_REG_ESP);args=[read(sp+4+i*4) for i in range(3)];calls.append(dict(address=a,args=args))
 if q['mutate']:
  write(0x577f00+q['actorId']*256+0xec,1);write(0x577f00+q['actorId']*256+0xf0,0)
  write(0x820344,0)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(99);rows=[]
for i in range(500):
 q=dict(actorId=rng.randrange(152),difficulty=rng.randrange(5),mutate=bool(i%2),checkNearby=bool(i%3))
 blocks=[]
 for j in range(152):
  b=bytearray(256);b[0x29]=rng.choice([0,1,2,3,19])
  for o,v in [(8,rng.choice([rng.randrange(10000,50000),rng.randrange(20000,22001)])),(12,rng.choice([rng.randrange(10000,50000),rng.randrange(20000,22001)])),(0xdc,rng.choice([0,21000])),(0xe0,21000),(0xec,rng.randrange(100)),(0xf0,rng.choice([0,200,201,900]))]:struct.pack_into('<i',b,o,v)
  blocks.append(list(b));u.mem_write(0x577f00+j*256,bytes(b))
 write(0x820344,q['difficulty']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,q['actorId']*256);calls=[];end=None
 u.emu_start(0x42c9ea if q['checkNearby'] else 0x42ca6c,0x42caa0,count=20000);assert end
 # Only callback-controlled shooter fields can change; compare the entire actor arena.
 rows.append([q,blocks,dict(actors=[list(u.mem_read(0x577f00+j*256,256)) for j in range(152)],difficulty=read(0x820344),calls=calls,next=end,stopped=end=='0x42ca9d')])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalActorMotionTail}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let effects=0;
for(const [q,blocks,e] of rows){const r=originalActorMotionTail({...q,actors:blocks.map(b=>new Uint8Array(b))},(event,state)=>{if(q.mutate){const a=new DataView(state.actors[q.actorId].buffer);a.setInt32(0xec,1,true);a.setInt32(0xf0,0,true);state.difficulty=0;}return {state};},{checkNearby:q.checkNearby});const a={actors:r.state.actors.map(b=>Array.from(b)),difficulty:r.state.difficulty,calls:r.calls,next:r.next,stopped:r.stopped};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,calls:r.calls,expectedCalls:e.calls,next:r.next,expectedNext:e.next}));effects+=r.calls.length;}
console.log(`${rows.length} native motion tails match all 152 actor records; ${effects} nearby reactions.`);
""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-motion-tail.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
