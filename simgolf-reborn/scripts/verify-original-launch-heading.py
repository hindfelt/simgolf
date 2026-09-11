"""Compare original non-putter long-shot adjustment and heading, with raw actor/map inputs."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_ECX,UC_X86_REG_EAX,UC_X86_REG_EDI,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x424337,0x360),(0x466a00,0x50),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 write(0x577fe8,q['heading']);write(0x577ff4,q['angularOffset']);write(0x577fec,q['speed']);write(0x577f18,q['actorFlags']);write(0x577f20,q['actorClass'],1);write(0x577f24,4,1)
 write(0x59d208,q['globalFlags']);write(0x5a870c,q['mode']);write(0x5a4440,154 if q['activeActor'] else 0);write(0x102b20,154);write(0x102b30,q['curve']);write(0x102010,q['distance']);write(0x102018,q['modifier']);write(0x820454,q['seed'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EDI,q['modifier']&0xffffffff)
 u.emu_start(0x424542,0x424697,count=1000)
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(heading=read(0x577fe8)&0xffffffff,referenceHeading=u.reg_read(UC_X86_REG_EBX),angularOffset=read(0x577ff4),modifier=read(0x102018),actorFlags=read(0x577f18)&0xffffffff,seed=read(0x820454)&0xffffffff)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(heading=rng.randrange(2**32),angularOffset=rng.randrange(-2147483648,2147483648),modifier=rng.randrange(-3,30),actorFlags=rng.choice([0,1,128]),globalFlags=rng.choice([0,0x800000]),distance=rng.randrange(331),speed=rng.randrange(10000),activeActor=bool(rng.randrange(2)),curve=rng.choice([-1,0,1,2]),mode=rng.randrange(4),actorClass=rng.choice([0,1,32,33,64]),seed=rng.randrange(2**32))
 if i%2==0:q['angularOffset']=rng.randrange(-1000000,1000000)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-heading.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLaunchHeading}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const {draws,miss,...a}=originalLaunchHeading(q);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} long-shot heading results and seeds match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-heading.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
