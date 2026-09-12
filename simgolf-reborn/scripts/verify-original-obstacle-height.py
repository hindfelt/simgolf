"""Execute complete original obstacle-height decision and RNG."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x406e80,0x1d0),(0x466a00,0x1d),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
u.mem_map(0x820000,0x1000)
def run(q):
 write(0x5a1f30,q['variant'],1);write(0x53ba00+2*(25*50+25),q['terrainFlags'],2);write(0x820454,q['seed'])
 u.mem_write(0x102000,struct.pack('<5I',0x400fff,q['terrainCode']&0xffffffff,q['height']&0xffffffff,25,25))
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x406e80,0x400fff,count=500)
 return dict(obstructed=bool(u.reg_read(UC_X86_REG_EAX)),seed=struct.unpack('<I',u.mem_read(0x820454,4))[0])
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(terrainCode=rng.randrange(25),height=rng.randrange(-10,450),variant=rng.randrange(-1,5),terrainFlags=rng.randrange(256),seed=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-obstacle-height.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalObstacleHeight}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalObstacleHeight(q);
if(a.obstructed!==e.obstructed||a.seed!==e.seed)throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} obstacle-height decisions and RNG states match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
