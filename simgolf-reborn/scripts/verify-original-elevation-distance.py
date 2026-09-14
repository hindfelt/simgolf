"""Verify original pre-club elevation correction with explicit raw height reads."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x423ee1;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x67])
current={};reads=[]
def hook(u,a,n,d):
 if a==0x40be60:
  sp=u.reg_read(UC_X86_REG_ESP);ret,r,c=struct.unpack('<3I',u.mem_read(sp,12));reads.append([r,c]);v=current['targetHeight'] if (r,c)==(10,11) else current['originHeight']
  u.reg_write(UC_X86_REG_EAX,v&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def run(q):
 global current,reads
 current=q;reads=[]
 write(0x577fd4,10);write(0x577fd8,11);write(0x102034,20);write(0x102040,21);u.mem_write(0x577f21,bytes([q['skillMask']]))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBX,q['distance']&0xffffffff)
 u.emu_start(0x423ee1,0x423f48,count=1000)
 return [struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0],reads]
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(distance=rng.randrange(-2147483648,2147483648),skillMask=rng.randrange(8),origin=dict(x=20,z=21),target=dict(x=10,z=11),originHeight=rng.randrange(-128,256),targetHeight=rng.randrange(-128,256))
 if i%5==0:q.update(originHeight=rng.randrange(-2147483648,2147483648),targetHeight=rng.randrange(-2147483648,2147483648))
 rows.append([q,*run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-elevation-distance.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalElevationDistance}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e,expectedReads] of rows){const reads=[];const a=originalElevationDistance(q,(r,c)=>{reads.push([r,c]);return r===10?q.targetHeight:q.originHeight;});if(a!==e||JSON.stringify(reads)!==JSON.stringify(expectedReads))throw Error(JSON.stringify({q,a,e,reads,expectedReads}));}
console.log(`${rows.length} elevation corrections and read sequences match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-elevation-distance.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
