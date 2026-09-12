"""Original automatic putt recalibration and elevation-byte update, with cache."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x424c46,0x7d),(0x421870,0x167)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x40be60,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
current=None
def hook(u,a,size,data):
 if a==0x40be60:
  sp=u.reg_read(UC_X86_REG_ESP);x=read(sp+4);z=read(sp+8)
  if dict(x=x,z=z)==current['target']:value=current['targetHeight']
  else:
   assert dict(x=x,z=z)==current['origin']
   value=current['originHeight']
  u.reg_write(UC_X86_REG_EAX,value&0xffffffff)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current
 current=q;sp=0x102000
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),
  (0x577fec,q['speed']),(sp+0x10,q['distance']),(sp+0x34,q['origin']['x']),(sp+0x40,q['origin']['z'])]:write(a,v)
 u.mem_write(0x577f23,bytes([q['elevationCounter']]))
 u.mem_write(0x570d38+q['target']['x']*50+q['target']['z'],bytes([q['targetTerrainCode']]))
 u.mem_write(0x576df1,bytes([q['rollCoefficient']]))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 u.emu_start(0x424c46 if q['club']==13 else 0x424c7c,0x424cc3,count=100000)
 assert u.reg_read(UC_X86_REG_EIP)==0x424cc3
 entries=[dict(distance=read(0x5a3200+j*4),verticalSpeed=read(0x567278+j*4),speed=read(0x53ec30+j*4)) for j in range(10)]
 return dict(speed=read(0x577fec),cache=dict(next=read(0x5a8728),entries=entries),elevationCounter=u.mem_read(0x577f23,1)[0])
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(target=dict(x=30,z=25),origin=dict(x=25,z=25),club=13 if i%3 else 4,
  targetTerrainCode=1 if i%4 else 2,distance=rng.randrange(76),speed=rng.randrange(4000),
  elevationCounter=rng.randrange(256),originHeight=rng.randrange(-128,128),targetHeight=rng.randrange(-128,128),rollCoefficient=rng.randrange(2,5))
 if i%5==1:q['distance']=rows[-1][0]['distance']
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-launch-ground.js').as_uri()
strength=(root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutoLaunchGround}=await import(MODULE);const {originalStrengthCache}=await import(STRENGTH);
let cache=originalStrengthCache();
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){
 const a=originalAutoLaunchGround(q,cache,{terrainAt:()=>q.targetTerrainCode,
  heightAt:(x,z)=>x===q.target.x&&z===q.target.z?q.targetHeight:q.originHeight});
 if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));cache=a.cache;
}console.log('1000 automatic launch ground states and shared strength caches match executable.');
""".replace('MODULE',json.dumps(module)).replace('STRENGTH',json.dumps(strength))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-launch-ground.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
