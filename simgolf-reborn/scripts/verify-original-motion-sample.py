"""Native live motion edge flags, post-movement subcells and direction rounding."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
u.mem_write(0x42beb0,p.get_data(0x42beb0-0x400000,0xd2))
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
rows=[]
for subX in range(16):
 for subZ in range(16):
  for mask in range(16):
   # Post-movement coordinate may already be in a different cell.
   q=dict(x=(21*1024+subX*64),z=(19*1024+subZ*64),cellX=20,cellZ=20,terrainCode=1,
    heading=((mask<<28)+(1 if subX%2 else 0))&0xffffffff)
   neighbors=[(19,20,8),(20,19,1),(21,20,2),(20,21,4)]
   values=[1 if not mask&bit else -1 for x,z,bit in neighbors]
   for (x,z,bit),value in zip(neighbors,values):u.mem_write(0x570d38+x*50+z,bytes([value&255]))
   sp=0x102000;u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0)
   for a,v in [(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577fe8,q['heading']),(sp+0x18,20),(sp+0x20,20),(sp+0x14,1)]:write(a,v)
   u.emu_start(0x42beb0,0x42bf82,count=1000)
   rows.append([q,values,dict(subX=read(sp+0x74),subZ=u.reg_read(UC_X86_REG_EBX),boundaryFlags=read(sp+0x1c),direction=read(sp+0x50))])
module=(root/'simgolf-reborn/scene/src/simulation/original-motion-sample.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalMotionSample}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,v,e] of rows){const keys=['19,20','20,19','21,20','20,21'];
const a=originalMotionSample(q,(x,z)=>{const i=keys.indexOf(`${x},${z}`);if(i<0)throw Error('Wrong cell');return v[i];});
if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} live edge samples match original instructions.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
