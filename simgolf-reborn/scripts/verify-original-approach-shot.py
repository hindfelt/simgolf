"""Verify original alternate approach-shot gate, velocity and cache."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x424882,0x106),(0x466a00,0x1d),(0x421870,0x167)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def run(q):
 sp=0x102000
 write(sp+0x10,q['strength']);write(sp+0x14,q['terrainCode']);write(sp+0x18,q['modifier']);write(sp+0xb24,int(q['explicitTarget']));write(sp+0xb30,q['curve'])
 for off,key in [(0xec,'speed'),(0xf0,'verticalSpeed'),(0xf4,'angularOffset'),(0x18,'actorFlags')]:write(0x577f00+off,q[key])
 u.mem_write(0x577f21,bytes([q['skillMask']]));u.mem_write(0x577f24,bytes([q['club']]));u.mem_write(0x577fff,bytes([q['backspinValue']]));u.mem_write(0x577fb4,bytes(2))
 u.mem_write(0x576dc2+48*q['terrainCode'],bytes([q['shotClass']&255]));write(0x58dd80,q['mode']);write(0x577fd4,10);write(0x577fd8,10);u.mem_write(0x570d38+510,bytes([q['targetTerrainCode']]))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 u.emu_start(0x424882,0x424988,count=100000)
 entries=[dict(distance=struct.unpack('<i',u.mem_read(0x5a3200+j*4,4))[0],verticalSpeed=struct.unpack('<i',u.mem_read(0x567278+j*4,4))[0],speed=struct.unpack('<i',u.mem_read(0x53ec30+j*4,4))[0]) for j in range(10)]
 def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
 return dict(speed=read(0x577fec),verticalSpeed=read(0x577ff0),angularOffset=read(0x577ff4),actorFlags=read(0x577f18)&0xffffffff,modifier=read(sp+0x18),shotType=struct.unpack('<H',u.mem_read(0x577fb4,2))[0],cache=dict(next=read(0x5a8728),entries=entries))

rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(speed=rng.randrange(12000),strength=rng.randrange(331),verticalSpeed=rng.randrange(2000),angularOffset=rng.randrange(-2147483648,2147483648),actorFlags=rng.randrange(256),modifier=rng.randrange(-3,20),skillMask=rng.choice([0,4,7]),curve=rng.choice([0,0,0,1,-1]),terrainCode=rng.choice([1,2,3]),shotClass=rng.choice([0,0,0,1,-1]),club=rng.randrange(13),explicitTarget=bool(rng.randrange(2)),mode=rng.randrange(5),targetTerrainCode=rng.choice([1,1,2]),backspinValue=rng.randrange(256))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-approach-shot.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalApproachShot}=await import(MODULE);
const {originalStrengthCache}=await import(CACHE);let cache=originalStrengthCache();
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,e] of rows){const a=originalApproachShot(q,cache);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));cache=a.cache;}
console.log(`${rows.length} approach-shot results and caches match original x86.`);
""".replace('MODULE',json.dumps(module)).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-approach-shot.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
