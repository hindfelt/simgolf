"""Verify original final draw/fade shape setup and strength clamping."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42536b,0x217),(0x466a00,0x1d)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 for off,key in [(0xe8,'heading'),(0xf4,'angularOffset'),(0xec,'speed'),(0x18,'actorFlags')]:write(0x577f00+off,q[key])
 write(0x577fb4,q['shotType'],2);write(0x102010,q['strength']);write(0x10202c,q['referenceSpeed']);write(0x102b20,154);write(0x5a4440,154 if q['activeActor'] else 0);write(0x102b30,q['curve'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000)
 u.emu_start(0x42536b,0x425582,count=1000)
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(heading=read(0x577fe8)&0xffffffff,angularOffset=read(0x577ff4),speed=u.reg_read(UC_X86_REG_EBP),actorFlags=read(0x577f18)&0xffffffff,shotType=struct.unpack('<h',u.mem_read(0x577fb4,2))[0],curveOffset=read(0x10201c))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(heading=rng.randrange(2**32),angularOffset=rng.randrange(-2147483648,2147483648),speed=rng.randrange(100001),referenceSpeed=rng.randrange(100001),strength=rng.randrange(331),curve=rng.choice([-1,0,1,2]),actorFlags=rng.randrange(256),activeActor=bool(rng.randrange(2)),shotType=rng.choice([0,3,4]))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-shape.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalShotShape}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalShotShape(q);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} final shot-shape results match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-shot-shape.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
