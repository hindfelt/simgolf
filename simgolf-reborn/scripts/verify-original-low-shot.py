"""Verify original low-shot velocity override and both cache queries."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x4247ae,0xcf),(0x466a00,0x1d),(0x421870,0x167)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def run(q):
 sp=0x102000
 write(sp+0x30,200);write(sp+0x10,q['strength']);write(0x577fec,q['speed'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EDI,q['firstWaterIndex'])
 u.emu_start(0x4247ae,0x42487d,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 return dict(speed=struct.unpack('<i',u.mem_read(0x577fec,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x577ff0,4))[0],curve=struct.unpack('<i',u.mem_read(sp+0xb30,4))[0],shotType=struct.unpack('<H',u.mem_read(0x577fb4,2))[0],cache=dict(next=struct.unpack('<I',u.mem_read(0x5a8728,4))[0],entries=entries))
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(speed=rng.randrange(12000),strength=rng.randrange(331),firstWaterIndex=rng.randrange(20))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-low-shot.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLowShot}=await import(MODULE);
const {originalStrengthCache}=await import(CACHE);let cache=originalStrengthCache();
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalLowShot(q,cache);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));cache=a.cache;}
console.log(`${rows.length} low-shot velocity results and caches match original x86.`);
""".replace('MODULE',json.dumps(module)).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-low-shot.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
