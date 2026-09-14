"""Native visual route branch, with a controlled pathfinder return."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_EDI,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];direction=0;branch=None
def hook(u,address,size,data):
 global branch
 if address in [0x403634,0x40383c]:branch='skip' if address==0x40383c else hex(address);u.emu_stop()
 if address==0x42def0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=address,args=list(struct.unpack('<5i',u.mem_read(sp+4,20)))))
  assert read(0x59d208)&256
  u.mem_write(0x59d208,struct.pack('<I',read(0x59d208)|0x4000));u.reg_write(UC_X86_REG_EAX,direction);u.reg_write(UC_X86_REG_EIP,read(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(741);rows=[]
for i in range(512):
 slot=i%64;b=bytearray(76);struct.pack_into('<ii',b,0,rng.randrange(50000),rng.randrange(50000));b[0x12]=rng.choice([1,16,24]);struct.pack_into('<h',b,0x18,rng.choice([0,0,1,-1]));seed=rng.randrange(2**32);phase=rng.randrange(2**32);flags=rng.randrange(2**32);home=dict(x=rng.randrange(50),z=rng.randrange(50));loc=dict(x=rng.randrange(50000),z=rng.randrange(50000),dx=rng.randrange(-50000,50000),dz=rng.randrange(-50000,50000));direction=rng.choice(list(range(8))+[255]);records=[None]*64;records[slot]=list(b)
 q=dict(visualRecords=records,worldFlags=flags,phaseCounter=phase,seed=seed,clubhouse=home)
 for address,value in [(0x59d208,flags),(0x831828,phase),(0x820454,seed),(0x576ba0,home['x']),(0x576ba4,home['z']),(0x10201c,slot),(0x102028,loc['dz']),(0x102030,loc['dx'])]:u.mem_write(address,struct.pack('<I',value&0xffffffff))
 u.mem_write(0x5842a0+slot*76,bytes(b));u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_ESI,slot*76);u.reg_write(UC_X86_REG_EDI,loc['x']);u.reg_write(UC_X86_REG_EBX,loc['z']);calls=[];branch=None;u.emu_start(0x403488,0x400fff,count=5000)
 rows.append(dict(q=q,slot=slot,locals=loc,direction=direction,expected=dict(record=list(u.mem_read(0x5842a0+slot*76,76)),seed=read(0x820454),worldFlags=read(0x59d208),calls=calls,next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-visual-route.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalVisualRoute}=await import(MODULE);let i=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.visualRecords=r.q.visualRecords.map(b=>b===null?null:Uint8Array.from(b));const out=originalVisualRoute(r.q,r.slot,r.locals,(event,state)=>{state.worldFlags=(state.worldFlags|0x4000)>>>0;return {state,value:r.direction};});const actual={record:Array.from(out.state.visualRecords[r.slot]),seed:out.state.seed,worldFlags:out.state.worldFlags,calls:out.calls,next:out.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({case:i,expected:r.expected,actual}));i++;}console.log('512 native visual route cases match records, calls, flags, branch and RNG.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
