"""Compare composed next-hole transition with continuous original x86 execution."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x425b50,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
calls=[];branch=None;base=0;mutate=False

def hook(u,a,size,data):
 global branch
 if a in [0x427f01,0x427efa,0x4280a3,0x4280e3,0x4280f8]:branch=hex(a) if a in [0x427f01,0x427efa] else 'return';u.emu_stop()
 if a==0x425b50:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4,4))[0]]))
  if mutate:u.mem_write(base+0x29,b'\x07');u.mem_write(base+0xc6,b'\xfe\xff')
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(2002);rows=[]
for i in range(1200):
 id=rng.choice([0,1,127,128,150]);partner=151;base=0x577f00+id*256
 b=bytearray(rng.randbytes(256));b[0x29]=rng.randrange(19);struct.pack_into('<h',b,0xaa,partner);struct.pack_into('<h',b,0xbe,0)
 other=bytearray(256);other[0x29]=rng.choice([0,1,18,19,255]);holes=[rng.choice([0,0,3,4,5]) for _ in range(21)]
 flags=rng.choice([0,0x200000,0x4000000,0x4200000,1]);count=rng.choice([0,1,18,32767,2147483647,-1]);mutate=i%2==0
 q=dict(actorId=id,actor=list(b),partner=list(other),holes=holes,globalFlags=flags,courseHoleCount=count,difficulty=2,adjustmentSetting=0)
 u.mem_write(base,bytes(b));u.mem_write(0x577f00+partner*256,bytes(other))
 for j,n in enumerate(holes):u.mem_write(0x574500+j*520,bytes([n])+bytes(519))
 u.mem_write(0x583432,bytes(44));put(0x820344,2);put(0x542be4,0);put(0x59d208,flags);put(0x5672a0,count);put(0x102034,id);calls=[];branch=None
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x427e25,0x400fff,count=1000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(base,256)),calls=calls,next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-next-hole-transition.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalNextHoleTransition}=await import(MODULE);let effects=0,ends=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);actors[151]=Uint8Array.from(q.partner);const a=originalNextHoleTransition({...q,actors,completionRecords:[new Uint8Array(44)],holeRecords:q.holes.map(n=>{const b=new Uint8Array(520);b[0]=n;return b;})},(_,state)=>{if(r.mutate){state.actors[q.actorId][0x29]=7;state.actors[q.actorId][0xc6]=254;state.actors[q.actorId][0xc7]=255;}return {state};});const actual={actor:Array.from(a.state.actors[q.actorId]),calls:a.calls,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));effects+=a.calls.length;ends+=a.next==='return';}console.log(`1200 continuous native composed next-hole cases match; ${effects} reset calls, ${ends} returns.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
