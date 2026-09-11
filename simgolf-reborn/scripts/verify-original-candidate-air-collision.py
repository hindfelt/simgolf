"""Execute original airborne collision response with supplied obstruction result."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x421e53,0xf5),(0x40a9f0,0x81),(0x466a00,0x1d),(0x45ba70,0x60),(0x4a57a0,0x27),(0x4b9800,8)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
u.mem_map(0x820000,0x1000)
def run(q):
 write(0x577fdc,q['position']['x']);write(0x577fe0,q['position']['z'])
 write(0x577fec,q['speed']);write(0x577fe8,q['heading']);write(0x577f18,q['flags'])
 write(0x577f20,int(q['professional']),1);write(0x577f1e,q['abilityFlags'],2);write(0x578001,q['luck'],1);write(0x820454,q['seed'])
 u.reg_write(UC_X86_REG_ESP,0x102000-24);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['oldTile']['x']);u.reg_write(UC_X86_REG_ESI,q['oldTile']['z'])
 u.reg_write(UC_X86_REG_EAX,int(q['obstructed']));u.reg_write(UC_X86_REG_ECX,q['mode']);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x421e53,0x4220f4,count=1000)
 return dict(speed=struct.unpack('<i',u.mem_read(0x577fec,4))[0],heading=struct.unpack('<I',u.mem_read(0x577fe8,4))[0],flags=struct.unpack('<I',u.mem_read(0x577f18,4))[0],seed=struct.unpack('<I',u.mem_read(0x820454,4))[0])
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(position=dict(x=26112+rng.randrange(-600,601),z=26112+rng.randrange(-600,601)),oldTile=dict(x=25,z=25),speed=rng.randrange(100000),heading=rng.randrange(2**32),flags=0,mode=rng.randrange(3),obstructed=bool(rng.randrange(2)),professional=bool(rng.randrange(2)),abilityFlags=rng.choice([0,512]),luck=rng.randrange(16),seed=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-candidate-air-collision.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalCandidateAirCollision}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalCandidateAirCollision(q);
for(const key of Object.keys(e))if(a[key]!==e[key])throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} original airborne collision responses and RNG states match x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
