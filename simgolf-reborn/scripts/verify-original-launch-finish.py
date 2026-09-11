"""Verify original final lie dispatch, random draws and launch normalization."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EDI,UC_X86_REG_EBP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x4256bf,0x454),(0x466a00,0x50),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 u.reg_write(UC_X86_REG_FPCW,0x37f)
 for off,key in [(0xec,'speed'),(0xf0,'verticalSpeed'),(0xe8,'heading'),(0xf4,'angularOffset'),(0x18,'actorFlags')]:write(0x577f00+off,q[key])
 write(0x577f24,q['club'],1);write(0x577f21,q['skillMask'],1);write(0x5a1f30,q['variant'],1);write(0x5a3228,q['stateFlags']);write(0x5a870c,q['mode']);write(0x820454,q['seed'])
 write(0x102014,q['lie']);write(0x102018,q['modifier']);write(0x10201c,q['curveOffset']);write(0x102050,510);write(0x53ba00+1020,q['tileFlags'],2);write(0x576dc2+q['lie']*48,q['shotClass'],1)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EDI,q['lie']&0xffffffff);u.reg_write(UC_X86_REG_EBP,q['baseSpeed'])
 u.emu_start(0x4256bf,0x425ab9,count=10000)
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(speed=read(0x577fec),verticalSpeed=read(0x577ff0),heading=read(0x577fe8)&0xffffffff,angularOffset=read(0x577ff4),actorFlags=read(0x577f18)&0xffffffff,seed=read(0x820454)&0xffffffff)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(speed=rng.randrange(100001),verticalSpeed=rng.randrange(2000),heading=rng.randrange(2**32),angularOffset=rng.randrange(-2147483648,2147483648),actorFlags=rng.randrange(256),lie=rng.randrange(-1,24),curveOffset=rng.choice([0,-0x239a955,0x239a955]),baseSpeed=rng.randrange(100001),modifier=rng.randrange(-20,30),club=rng.choice([4,13]),variant=rng.randrange(4),stateFlags=rng.randrange(4),tileFlags=rng.choice([0,0x800]),skillMask=rng.randrange(8),shotClass=rng.randrange(-1,4),mode=rng.randrange(4),seed=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-finish.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLaunchFinish}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const {draws,...a}=originalLaunchFinish(q);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} final lie/launch outputs and seeds match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-finish.json').write_text(json.dumps(rows[:100],separators=(',',':'))+'\n')
