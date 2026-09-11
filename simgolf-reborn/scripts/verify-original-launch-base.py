"""Verify combined original club selection and initial velocity/cache construction."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x423f48,0x13b),(0x466a00,0x1d),(0x421870,0x167)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def run(q):
 sp=0x102000
 write(sp+0x30,q['range']);write(sp+0x14,q['terrainCode']);write(sp+0xb24,int(q['explicitTarget']))
 write(0x58dd80,q['mode']);write(0x577f18,q['actorFlags'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,q['distance']&0xffffffff)
 u.emu_start(0x423f48,0x424083,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 return dict(club=u.mem_read(0x577f24,1)[0],speed=struct.unpack('<i',u.mem_read(0x577fec,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x577ff0,4))[0],cache=dict(next=struct.unpack('<I',u.mem_read(0x5a8728,4))[0],entries=entries))
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(-100,501),range=rng.randrange(1,331),terrainCode=rng.randrange(0,21),explicitTarget=bool(rng.randrange(2)),mode=rng.randrange(4),actorFlags=rng.randrange(2))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-base.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLaunchBase}=await import(MODULE);
const {originalStrengthCache}=await import(CACHE);let cache=originalStrengthCache();
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const {strength,...a}=originalLaunchBase(q,cache);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));cache=a.cache;}
console.log(`${rows.length} combined club/velocity results and caches match original x86.`);
""".replace('MODULE',json.dumps(module)).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-base.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
