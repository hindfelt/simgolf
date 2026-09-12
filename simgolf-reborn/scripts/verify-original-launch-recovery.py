"""Verify original accuracy and recovery stage before final lie dispatch."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EDI,UC_X86_REG_EBP,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x425589,0x218),(0x466a00,0x50),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 u.reg_write(UC_X86_REG_FPCW,0x37f)
 for off,key in [(0xe8,'heading'),(0xf4,'angularOffset'),(0x18,'actorFlags')]:write(0x577f00+off,q[key])
 write(0x577fec,q['baseSpeed']);write(0x577f20,q['actorClass'],1);write(0x577f21,q['skillMask'],1);write(0x577f2a,q['shotCounter'],1);write(0x578000,q['recoveryValue'],1)
 write(0x820344,q['level']);write(0x5a870c,q['mode']);write(0x820454,q['seed']);write(0x102014,q['lie']);write(0x102b24,q['targetArgument'])
 for i,c in enumerate(q['classes']):write(0x576dc2+(i-1)*48,c,1)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,q['baseSpeed']);u.reg_write(UC_X86_REG_EAX,q['strength']);u.reg_write(UC_X86_REG_EBX,q['actorId'])
 u.emu_start(0x425589,0x4256bf,count=10000)
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 assert u.reg_read(UC_X86_REG_EDI)==(read(0x102014)&0xffffffff)
 return dict(heading=read(0x577fe8)&0xffffffff,angularOffset=read(0x577ff4),actorFlags=read(0x577f18)&0xffffffff,lie=read(0x102014),speed=read(0x577fec),seed=read(0x820454)&0xffffffff)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(heading=rng.randrange(2**32),angularOffset=rng.randrange(-2147483648,2147483648),actorFlags=rng.randrange(256),lie=rng.randrange(23),strength=rng.randrange(331),level=rng.randrange(4),actorId=rng.choice([0,1,2,154]),targetArgument=rng.randrange(2),skillMask=rng.randrange(8),actorClass=rng.choice([0,1,32]),recoveryValue=rng.randrange(40),mode=rng.randrange(4),shotCounter=rng.randrange(256),baseSpeed=rng.randrange(100001),seed=rng.randrange(2**32),classes=[rng.randrange(-1,4) for _ in range(24)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-recovery.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLaunchRecovery}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const {draws,...a}=originalLaunchRecovery(q,lie=>q.classes[lie+1]);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} accuracy/recovery outputs and seeds match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-recovery.json').write_text(json.dumps(rows[:100],separators=(',',':'))+'\n')
