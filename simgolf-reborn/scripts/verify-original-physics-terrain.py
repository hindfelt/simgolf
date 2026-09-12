"""Run original height/slope arithmetic with supplied corner and vertex heights."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42f110,0x156),(0x40bfe0,0x1be),(0x42eb90,0x80),(0x466a00,0x1d),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
current={}
def hook(u,a,s,d):
 if a in [0x40bcd0,0x40be60]:
  sp=u.reg_read(UC_X86_REG_ESP);ret,x,z,direction=struct.unpack('<4I',u.mem_read(sp,16))
  if a==0x40bcd0:value=current['corners'][[5,7,1,3].index(direction)]
  else:value=current['vertices'][[(10,10),(11,10),(11,9),(10,9)].index((x,z))]
  u.reg_write(UC_X86_REG_EAX,value&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q,address):
 global current
 current=q
 u.mem_write(0x570d38+10*50+10,bytes([q['terrainCode']]))
 u.mem_write(0x576dcc+48*q['terrainCode'],struct.pack('<I',q['metadataFlags']));u.mem_write(0x59d208,struct.pack('<I',q['globalFlags']))
 u.mem_write(0x102000,struct.pack('<4I',0x400fff,q['x'],q['z'],q['direction']));u.reg_write(UC_X86_REG_ESP,0x102000)
 u.emu_start(address,0x400fff,count=1000)
 return struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0]
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(x=10240+rng.randrange(1024),z=10240+rng.randrange(1024),direction=rng.randrange(8),terrainCode=rng.choice([2,7,9]),metadataFlags=rng.choice([0,0,0,2,4,8,6]),globalFlags=rng.randrange(2),corners=[rng.randrange(-128,128) for _ in range(4)],vertices=[rng.randrange(-128,128) for _ in range(4)])
 rows.append([q,run(q,0x42f110),run(q,0x40c140)])
module=(root/'simgolf-reborn/scene/src/simulation/original-physics-terrain.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalPhysicsHeight,originalPhysicsSlope}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,h,s] of rows){const input={...q,cornerHeight:(r,c,d)=>q.corners[[5,7,1,3].indexOf(d)],vertexHeight:(r,c)=>q.vertices[['10,10','11,10','11,9','10,9'].indexOf(`${r},${c}`)]};
const a=originalPhysicsHeight(input),b=originalPhysicsSlope(input,q.direction);if(a!==h||b!==s)throw Error(JSON.stringify({q,a,h,b,s}));}
console.log(`${rows.length} height/slope pairs match original x86.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-physics-terrain.json').write_text(json.dumps(rows[:40],separators=(',',':'))+'\n')
