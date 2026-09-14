"""Native selected-actor visual following, with native heading and RNG."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def read(a,signed=True):return struct.unpack('<i' if signed else '<I',u.mem_read(a,4))[0]
branch=None
def hook(u,address,size,data):
 global branch
 if address in [0x402c6f,0x403488,0x40383c]:branch='skip' if address==0x40383c else hex(address);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(2002);rows=[]
for i in range(1024):
 slot=i%64;b=bytearray(76);b[0x13]=rng.choice([0,1,2,255]);struct.pack_into('<ii',b,0,rng.randrange(50000),rng.randrange(50000));actor=bytearray(256)
 for offset in [8,12,0xdc,0xe0]:struct.pack_into('<i',actor,offset,rng.choice([0,10000,20000,40000]))
 struct.pack_into('<h',actor,0xa6,rng.choice([-1,0,1]));actor[0x29]=rng.choice([1,2]);actor[0x2a]=rng.choice([0,1]);seed=rng.randrange(2**32);records=[None]*64;records[slot]=list(b)
 q=dict(visualRecords=records,actors=[list(actor)],selectedActor=0,seed=seed)
 u.mem_write(0x5842a0+76*slot,bytes(b));u.mem_write(0x577f00,bytes(actor));u.mem_write(0x5a4440,bytes(4));u.mem_write(0x820454,struct.pack('<I',seed));u.mem_write(0x10201c,struct.pack('<i',slot));u.reg_write(UC_X86_REG_ESI,slot*76);u.reg_write(UC_X86_REG_ESP,0x102000);branch=None;u.emu_start(0x402b6b,0x400fff,count=2000)
 expected=dict(record=list(u.mem_read(0x5842a0+76*slot,76)),seed=read(0x820454,False),next=branch)
 if branch!='0x402c6f':expected['locals']=dict(x=read(0x102010),z=read(0x102014),dx=read(0x102030),dz=read(0x102028))
 rows.append(dict(q=q,slot=slot,expected=expected))
module=(root/'simgolf-reborn/scene/src/simulation/original-visual-follow.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalVisualFollow}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.visualRecords=r.q.visualRecords.map(b=>b===null?null:Uint8Array.from(b));r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));const out=originalVisualFollow(r.q,r.slot);const actual={record:Array.from(out.state.visualRecords[r.slot]),seed:out.state.seed,next:out.next,...(out.locals?{locals:out.locals}:{})};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1024 native visual-follow cases match targets, facing, delay, branch and RNG.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
