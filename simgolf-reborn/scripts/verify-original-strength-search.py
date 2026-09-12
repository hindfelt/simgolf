"""Compare stateful original strength search, including cross-mode cache hits."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x421870;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x167])
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(331),verticalSpeed=rng.randrange(256,1500),mode=i%2,rollCoefficient=rng.randrange(2,5))
 if i==0:q.update(distance=0,verticalSpeed=0)
 elif i%3==0:q.update(distance=rows[-1][0]['distance'],verticalSpeed=rows[-1][0]['verticalSpeed'])
 u.mem_write(0x576df1,bytes([q['rollCoefficient']]))
 u.mem_write(0x102000,struct.pack('<4I',0x400fff,q['distance'],q['verticalSpeed'],q['mode']));u.reg_write(UC_X86_REG_ESP,0x102000)
 u.emu_start(0x4218e0,0x400fff,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 rows.append([q,u.reg_read(UC_X86_REG_EAX),dict(next=struct.unpack('<I',u.mem_read(0x5a8728,4))[0],entries=entries)])
module=(root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalStrengthCache,originalStrengthSearch}=await import(MODULE);
let cache=originalStrengthCache();const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,s,e] of rows){const a=originalStrengthSearch(q,cache);if(a.speed!==s||JSON.stringify(a.cache)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,s,e}));cache=a.cache;}
console.log(`${rows.length} stateful strength searches and complete caches match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-strength-search.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
