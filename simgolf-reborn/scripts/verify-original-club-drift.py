"""Verify original non-putter actor, club and shot-shape drift modifiers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x4243ad;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x195])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 for off,key in [(0x20,'actorClass'),(0x3e,'attitude'),(0x24,'club'),(0x2a,'shotCounter'),(0xfa,'driverValue'),(0xfb,'ironValue'),(0xfd,'drawValue'),(0xfe,'fadeValue')]:write(0x577f00+off,q[key],1)
 write(0x577ff4,q['angularOffset']);write(0x102018,-3);write(0x102b20,154);write(0x5a4440,154 if q['activeActor'] else 0);write(0x102b30,q['curve']);write(0x58dd80,q['mode'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBX,q['level']);u.reg_write(UC_X86_REG_EDI,0xfffffffd)
 u.emu_start(0x4243ad,0x424542,count=1000)
 return dict(angularOffset=struct.unpack('<i',u.mem_read(0x577ff4,4))[0],modifier=struct.unpack('<i',u.mem_read(0x102018,4))[0])
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(angularOffset=rng.randrange(-2147483648,2147483648),actorClass=rng.choice([0,1,32,33,64]),activeActor=bool(rng.randrange(2)),level=rng.randrange(4),attitude=rng.randrange(-128,128),club=rng.randrange(13),shotCounter=rng.randrange(3),driverValue=rng.randrange(256),ironValue=rng.randrange(256),drawValue=rng.randrange(256),fadeValue=rng.randrange(256),curve=rng.choice([-1,0,1,2]),mode=rng.randrange(4))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-club-drift.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalClubDrift}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalClubDrift(q);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} club drift and modifier results match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-club-drift.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
