"""Native visual collision and movement tail; actual helper bodies and RNG."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def hook(u,address,size,data):
 if address==0x40383c:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9122026);rows=[]
for i in range(512):
 slot=i%64;records=[];x=rng.randrange(1024,49000);z=rng.randrange(1024,49000)
 for n in range(slot+1):
  b=bytearray(76);struct.pack_into('<ii',b,0,x+rng.randrange(-600,601),z+rng.randrange(-600,601));b[0x12]=rng.choice([0,1,8,16,24]);b[0x16]=rng.randrange(8)
  if n==slot:
   struct.pack_into('<ii',b,0,x,z);b[0x13]=rng.choice([1,250,255]);struct.pack_into('<h',b,0x18,rng.choice([1,2,16,32767,-32768]));struct.pack_into('<h',b,0x1e,rng.choice([0,7,9,10,11,32767]));struct.pack_into('<h',b,0x1a,rng.choice([0,0,4]))
  records.append(list(b));u.mem_write(0x5842a0+76*n,bytes(b))
 cost=rng.choice([-128,-2,0,1,3,6,127]);flags=rng.choice([0,32]);seed=rng.randrange(2**32);index=(x>>10)*50+(z>>10)
 u.mem_write(0x570d38+index,b'\0');u.mem_write(0x576dc5,struct.pack('<b',cost));u.mem_write(0x53ba00+2*index,struct.pack('<H',flags));u.mem_write(0x820454,struct.pack('<I',seed));u.mem_write(0x10201c,struct.pack('<i',slot));u.reg_write(UC_X86_REG_ESI,slot*76);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x403634,0x400fff,count=20000)
 rows.append(dict(records=records,slot=slot,cost=cost,flags=flags,index=index,seed=seed,expected=dict(record=list(u.mem_read(0x5842a0+76*slot,76)),seed=struct.unpack('<I',u.mem_read(0x820454,4))[0])))
module=(root/'simgolf-reborn/scene/src/simulation/original-visual-step.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalVisualStep}=await import(MODULE);let i=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){const tileFlags=new Uint16Array(2500);tileFlags[r.index]=r.flags;const out=originalVisualStep({visualRecords:r.records.map(b=>Uint8Array.from(b)),terrain:new Uint8Array(2500),tileFlags,metadata:[{walkingCost:r.cost}],seed:r.seed},r.slot);const actual={record:Array.from(out.state.visualRecords[r.slot]),seed:out.state.seed};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({case:i,expected:r.expected,actual}));i++;}console.log('512 native visual movement cases match records and RNG.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
