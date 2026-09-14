"""Compare native airborne drag, terrain-height offset and obstacle deflections.
Height sampler returns the supplied sample; audio/stat callbacks are no-ops.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x42f110,0x40c1f0,0x4672d0]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
current=None;draws=0;sound=None
def hook(u,a,size,data):
 global draws,sound
 if a==0x42f110:u.reg_write(UC_X86_REG_EAX,current['terrainHeight']&0xffffffff)
 if a==0x45ba70:draws+=1
 if a==0x40c1f0:sound=read(u.reg_read(UC_X86_REG_ESP)+4)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3000):
 b=dict(x=20992+rng.randrange(-450,451),z=20992+rng.randrange(-450,451),height=rng.randrange(2,400),speed=rng.randrange(65536),verticalSpeed=-64,heading=rng.randrange(2**32),angularOffset=rng.randrange(-100000000,100000000),seed=0)
 q=dict(ball=b,previousTerrainHeight=rng.randrange(-200,201),terrainHeight=rng.randrange(-200,201),cellX=20,cellZ=20,terrainCode=rng.choice([1,13,14,15,16,21,22]),terrainFlags=rng.randrange(65536),variant=rng.randrange(5),stateFlags=2 if i%5==0 else 0,skillEnabled=bool(i%2),skillMask=512 if i%3 else 0,luck=rng.randrange(256),seed=rng.randrange(2**32))
 current=q;draws=0;sound=None;sp=0x102000
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,b['x']);u.reg_write(UC_X86_REG_ECX,b['z']);u.reg_write(UC_X86_REG_EDI,20)
 for key,addr in [('x',0x577fdc),('z',0x577fe0),('height',0x577fe4),('speed',0x577fec),('heading',0x577fe8),('angularOffset',0x577ff4)]:write(addr,b[key])
 for a,v in [(sp+0x7c,q['previousTerrainHeight']),(sp+0x20,20),(sp+0x14,q['terrainCode']),(0x577f18,q['stateFlags']),(0x820454,q['seed'])]:write(a,v)
 u.mem_write(0x53ba00+1020*2,struct.pack('<H',q['terrainFlags']));u.mem_write(0x5a1f30,bytes([q['variant']]));u.mem_write(0x577f20,bytes([q['skillEnabled']]));u.mem_write(0x577f1e,struct.pack('<H',q['skillMask']));u.mem_write(0x578001,bytes([q['luck']]))
 u.emu_start(0x42bf91,0x42c527,count=20000)
 ball={**b,'height':signed(0x577fe4),'speed':signed(0x577fec),'heading':read(0x577fe8),'seed':read(0x820454)}
 e=dict(ball=ball,stateFlags=read(0x577f18),hit=sound is not None,sound=sound,rngState=read(0x820454),draws=draws)
 rows.append([q,e])
module=(root/'simgolf-reborn/scene/src/simulation/original-air-phase.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAirPhase}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,e] of rows){const a=originalAirPhase(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} airborne phases match original instructions and RNG draw counts.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
