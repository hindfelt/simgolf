"""Native 152-slot dispatch, skipped slots and FF entry-state RNG.
Normal actor bodies are controlled replacements; special FF handling runs natively.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
u.mem_write(0x42819c,b'\xe9'+struct.pack('<i',0x4295ef-0x42819c-5))
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
slots=[];draws=0
def hook(u,a,size,data):
 global draws
 if a==0x45ba70:draws+=1
 if a==0x42819c:
  slot=u.reg_read(UC_X86_REG_EBP)//256;slots.append(slot)
  # Controlled normal actor body spends RNG state and activates the next slot.
  put(0x820454,(read(0x820454)+slot+1)&0xffffffff)
  if slot<151:u.mem_write(0x577f29+(slot+1)*256,b'\x01')
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for case in range(300):
 actors=[dict(holeByte=rng.choice([0,0,255,255,1]) if case%3 else 255,countdown=rng.choice([0,0,1,255]),x=-500,z=700) for _ in range(152)]
 q=dict(actors=actors,seed=rng.randrange(2**32),clubhouseX=rng.randrange(-32768,32768),clubhouseZ=rng.randrange(-32768,32768))
 put(0x820454,q['seed']);u.mem_write(0x58a70a,struct.pack('<hh',q['clubhouseX'],q['clubhouseZ']))
 for slot,actor in enumerate(actors):
  base=0x577f00+slot*256;u.mem_write(base+0x29,bytes([actor['holeByte']]));u.mem_write(base+0x8c,bytes([actor['countdown']]));put(base+8,actor['x']);put(base+12,actor['z'])
 slots=[];draws=0;u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x428100,0x42960a,count=100000)
 actual=[]
 for slot in range(152):
  base=0x577f00+slot*256
  actual.append(dict(holeByte=u.mem_read(base+0x29,1)[0],countdown=u.mem_read(base+0x8c,1)[0],x=signed(base+8),z=signed(base+12)))
 rows.append(dict(q=q,expected=dict(state={**q,'actors':actual,'seed':read(0x820454)},updatedSlots=slots,entryRandomDraws=draws)))
module=(root/'simgolf-reborn/scene/src/simulation/original-golfer-loop-boundary.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalGolferLoopBoundary}=await import(MODULE);
for(const row of JSON.parse(readFileSync(0,'utf8'))){const actual=originalGolferLoopBoundary(row.q,(slot,s)=>{s.seed=(s.seed+slot+1)>>>0;if(slot<151)s.actors[slot+1].holeByte=1;return s;});if(!isDeepStrictEqual(actual,row.expected))throw Error(JSON.stringify({row,actual}));}
console.log('300 complete native 152-slot dispatch cases match, including FF entry RNG and later-slot activation.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
