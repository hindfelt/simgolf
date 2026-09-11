"""Compare original launch variation budget and RNG, with raw actor/map inputs."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_ECX,UC_X86_REG_EAX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x424083,0xae),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,n=4):u.mem_write(a,(v&((1<<(n*8))-1)).to_bytes(n,'little'))
def run(q):
 write(0x577f21,q['skillMask'],1);write(0x542bc8,q['difficulty']);write(0x577f20,q['actorClass'],1)
 write(0x577f1e,q['abilityFlags'],1);write(0x577ffc,q['abilityValue'],1);write(0x577f3e,q['attitude'],1)
 write(0x577f29,0,1);write(0x574518,10);write(0x57451c,10);write(0x5682dc+510,q['targetFlags'],1);write(0x820454,q['seed'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_ECX,q['globalFlags']&1)
 u.emu_start(0x424083,0x424131,count=1000)
 bound=u.reg_read(UC_X86_REG_EDI);draw=u.reg_read(UC_X86_REG_EAX)&0xffff
 return dict(bound=bound,variation=draw+bound+4,seed=struct.unpack('<I',u.mem_read(0x820454,4))[0])
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(globalFlags=rng.randrange(2),skillMask=rng.choice([3,7]),difficulty=rng.randrange(4),actorClass=rng.randrange(256),abilityFlags=rng.choice([0,16]),abilityValue=rng.randrange(256),targetFlags=rng.choice([0,128]),attitude=rng.randrange(-128,128),seed=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-launch-variation.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalLaunchVariation}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const {budget,draws,...a}=originalLaunchVariation(q);if(draws!==1||JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} launch variation bounds, draws and seeds match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-launch-variation.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
