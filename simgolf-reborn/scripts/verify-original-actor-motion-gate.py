"""Native motion/delay/cleanup dispatch with controlled cleanup callbacks."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x406450,0x426b00]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
calls=[];next_branch=None;replacement=0
stops={0x42889c:'continue',0x42bdb5:'motion',0x4295ef:'skip'}
def hook(u,a,size,data):
 global next_branch
 if a in stops:next_branch=stops[a];u.emu_stop()
 if a in [0x406450,0x426b00]:
  calls.append(dict(address=a,args=[0]))
  if a==0x406450:put(0x577f18,replacement)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2000):
 b=bytearray(256);flags=rng.choice([0,0x40000,0x48000,0x80048000]);delay=rng.choice([-32768,-1,0,1]);speed=rng.choice([0,100,-100]);b[0x2a]=rng.choice([9,10,127,255]);struct.pack_into('<I',b,0x18,flags);struct.pack_into('<i',b,0xec,speed);struct.pack_into('<h',b,0xa6,delay)
 phase=i%2;replacement=rng.choice([8,0x8000,0x40000]);q=dict(actorId=0,phaseCounter=phase,actors=[list(b)])
 u.mem_write(0x577f00,bytes(b));put(0x831828,phase);put(0x102010,0);put(0x102050,0)
 calls=[];next_branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,0);u.emu_start(0x42880a,0x400fff,count=1000)
 previous=None if delay<0 else struct.unpack('<I',u.mem_read(0x102050,4))[0]
 rows.append(dict(q=q,replacement=replacement,expected=dict(state={**q,'actors':[list(u.mem_read(0x577f00,256))]},calls=calls,previousFlags=previous,next=next_branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-motion-gate.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorMotionGate}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(a=>Uint8Array.from(a));const a=originalActorMotionGate(r.q,(e,s)=>{if(e.address===0x406450)new DataView(s.actors[0].buffer).setUint32(0x18,r.replacement,true);return {state:s};});a.state.actors=a.state.actors.map(a=>Array.from(a));if(!isDeepStrictEqual(a,r.expected))throw Error(JSON.stringify({r,a}));}console.log('2000 native motion gate cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
