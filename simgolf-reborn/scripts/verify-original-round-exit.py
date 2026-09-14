"""Verify complete ordinary round exits and explicit special-class branches."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
branch=None

def hook(u,a,size,data):
 global branch
 if a in [0x425b74,0x425e30,0x426137,0x426ad5]:branch='return' if a==0x426ad5 else hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9312);rows=[]
for i in range(1024):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(rng.randbytes(256));b[0x20]=i%256;selection=rng.randrange(-2147483648,2147483648)
 q=dict(actorId=id,actor=list(b),selectionState=selection);u.mem_write(base,bytes(b));put(0x5a4440,selection);put(0x102004,id)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x425b50,0x400fff,count=1000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(base,256)),selectionState=struct.unpack('<i',u.mem_read(0x5a4440,4))[0],next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-round-exit.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRoundExit}=await import(MODULE);let exits=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalRoundExit({...q,actors});const actual={actor:Array.from(a.state.actors[q.actorId]),selectionState:a.state.selectionState,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));exits+=a.next==='return';}console.log(`1024 native exits match across all class bytes; ${exits} common exits.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
