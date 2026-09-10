"""Compare reconstructed range with original x86, stubbing only map surface lookup."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x430000);u.mem_map(0x100000,0x4000)
for address,size in [(0x4219e0,0x168),(0x466a00,0x1d)]:
 offset=p.get_offset_from_rva(address-0x400000);u.mem_write(address,p.__data__[offset:offset+size])
def write(address,value,size):u.mem_write(address,(value&((1<<(size*8))-1)).to_bytes(size,'little'))
def run(q):
 base=0x577f00+q['actorId']*256
 u.mem_write(base,bytes(256))
 for offset,key in [(0x21,'skillMask'),(0xc2,'level'),(0x2a,'shot'),(0x20,'professional'),(0xf8,'power'),(0xf9,'longDrive'),(0x3e,'boost')]:write(base+offset,int(q[key]),1)
 write(base+0x1e,q['abilityFlags'],2)
 write(0x820344,q['difficulty'],4);write(0x542bd8,q['lengthBonus'],4)
 lie=(2 if q['shot'] else 0) if q['actorId']>=152 else q['surface']
 write(0x576dc2+48*lie,q['shotClass'],1)
 # Deterministic return of supplied surface; all arithmetic runs original code.
 write(0x400100,q['surface'],4)
 u.mem_write(0x40bc90,b'\xa1'+struct.pack('<I',0x400100)+b'\xc3')
 u.mem_write(0x102000,struct.pack('<II',0x400fff,q['actorId']))
 u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x4219e0,0x400fff,count=300)
 return struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0]
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(actorId=rng.choice([0,151,152,154]),skillMask=rng.randrange(8),difficulty=rng.randrange(4),level=rng.randrange(-5,9),surface=rng.randrange(10),shot=rng.randrange(6),professional=bool(rng.randrange(2)),abilityFlags=rng.randrange(4),power=rng.randrange(16),longDrive=rng.randrange(16),boost=rng.randrange(-2,6),lengthBonus=rng.randrange(5),shotClass=rng.randrange(-2,6))
 rows.append([q,run(q)])
if '--write-fixture' in __import__('sys').argv:
 fixture=root/'simgolf-reborn/scene/tests/fixtures/original-shot-range.json'
 fixture.write_text(json.dumps(rows[:40],indent=2)+'\n')
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-range.js').as_uri()
script='''import {readFileSync} from 'node:fs';
const {originalShotRange}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,expected] of rows) {
 const actual=originalShotRange(q);
 if(actual!==expected)throw Error(JSON.stringify({q,expected,actual}));
}
console.log(`${rows.length} shot ranges match original x86 (surface lookup supplied).`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
