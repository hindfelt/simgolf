"""Execute original surface slowdown and crossed-edge reflection blocks."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42c27b,0xd9),(0x42c480,0xa3)]:u.mem_write(a,p.get_data(a-0x400000,n))
u.mem_write(0x40c1f0,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
reflected={}
def hook(u,a,size,data):
 if a==0x42c4ad:reflected['reflectedX']=True
 if a==0x42c4fc:reflected['reflectedZ']=True
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(speed=rng.randrange(4000),terrainCode=rng.choice([1,10,10,17]),boundaryFlags=rng.randrange(16),subX=rng.randrange(16),subZ=rng.randrange(16),cellX=20,cellZ=20,centreFlag=i%2)
 v=[rng.choice([1,10]) for j in range(4)]
 for (x,z),code in zip([(19,20),(20,19),(21,20),(20,21)],v):u.mem_write(0x570d38+x*50+z,bytes([code]))
 sp=0x102000;u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,1000);u.reg_write(UC_X86_REG_EDI,20);u.reg_write(UC_X86_REG_EBX,q['subZ'])
 for a,val in [(sp+0x14,q['terrainCode']),(sp+0x1c,q['boundaryFlags']),(sp+0x74,q['subX']),(sp+0x28,q['centreFlag']),(0x577fec,q['speed'])]:write(a,val)
 u.emu_start(0x42c27b,0x42c354,count=1000)
 e=dict(speed=read(0x577fec),centreFlag=read(sp+0x28))
 r=dict(x=20992+rng.choice([-1024,0,1024]),z=20992+rng.choice([-1024,0,1024]),cellX=20,cellZ=20,heading=rng.randrange(2**32),edgeFlags=rng.randrange(256),stepX=rng.choice([-64,0,64]),stepCosine=rng.choice([-64,0,64]))
 for a,val in [(0x577fdc,r['x']),(0x577fe0,r['z']),(0x577fe8,r['heading']),(sp+0x70,r['stepX']),(sp+0x6c,r['stepCosine'])]:write(a,val)
 u.mem_write(0x5608b0+1020,bytes([r['edgeFlags']]))
 u.reg_write(UC_X86_REG_ESI,1000);u.reg_write(UC_X86_REG_EDI,20);u.reg_write(UC_X86_REG_EBX,20)
 reflected={'reflectedX':False,'reflectedZ':False}
 u.emu_start(0x42c480,0x42c523,count=1000)
 rows.append([q,v,e,r,dict(heading=read(0x577fe8),**reflected)])
module=(root/'simgolf-reborn/scene/src/simulation/original-ground-contact.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalGroundContact,originalGroundReflection}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,v,e,r,re] of rows){const keys=['19,20','20,19','21,20','20,21'];
const a=originalGroundContact(q,(x,z)=>v[keys.indexOf(`${x},${z}`)]),b=originalGroundReflection(r);
if(!isDeepStrictEqual(a,e)||!isDeepStrictEqual(b,re))throw Error(JSON.stringify({q,a,e,r,b,re}));}
console.log(`${rows.length} contact and reflection states match original blocks.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
