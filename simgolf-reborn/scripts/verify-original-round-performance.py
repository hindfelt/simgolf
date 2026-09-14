"""Compare native performance record updates and threshold state."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def hook(u,a,size,data):
 if a==0x427e25:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9712);rows=[]
for i in range(1600):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(rng.randbytes(256));b[0x20]=rng.choice([0,0,32]);struct.pack_into('<h',b,0xbe,0);r=rng.randbytes(44)
 q=dict(actorId=id,actor=list(b),record=list(r),difficulty=rng.choice([0,1,3,2147483647]),performanceBonus=rng.choice([-5,0,10,2147483647]),courseHoleCount=rng.randrange(1,20),periodIndex=rng.choice([0,1,65536]),cashTotal=rng.choice([0,199,200,1000]),secondaryBalance=rng.choice([-1,0,1]),totals=dict(completionBits=rng.choice([0,2,10,2147483647]),projectedStrokes=rng.choice([-1,0,70,300]),projectedRelative=rng.choice([-128,-3,0,3,127,2147483647])))
 u.mem_write(base,bytes(b));u.mem_write(0x583430,r)
 for address,name in [(0x820344,'difficulty'),(0x542bd4,'performanceBonus'),(0x5672a0,'courseHoleCount'),(0x5a5784,'periodIndex'),(0x570a24,'cashTotal'),(0x56bc00,'secondaryBalance')]:put(address,q[name])
 for offset,name in [(0x14,'completionBits'),(0x20,'projectedStrokes'),(0x10,'projectedRelative')]:put(0x102000+offset,q['totals'][name])
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x427d38,0x400fff,count=1000)
 points=u.reg_read(UC_X86_REG_ESI);points=points if points<2**31 else points-2**32
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(base,256)),record=list(u.mem_read(0x583430,44)),performancePoints=points)))
module=(root/'simgolf-reborn/scene/src/simulation/original-round-performance.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRoundPerformance}=await import(MODULE);for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalRoundPerformance({...q,actors,completionRecords:[Uint8Array.from(q.record)]});const actual={actor:Array.from(a.state.actors[q.actorId]),record:Array.from(a.state.completionRecords[0]),performancePoints:a.performancePoints};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));}console.log('1600 native performance-summary cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
