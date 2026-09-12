"""Verify contiguous target geometry, branching, and short approach against golf.exe."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42365d,0x509),(0x466ba0,0x10e),(0x4a57a0,0x27),(0x466a00,0x50),(0x4c1870,64),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
u.mem_map(0x839000,0x1000);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
from unicorn.x86_const import UC_X86_REG_EDI,UC_X86_REG_EBP,UC_X86_REG_EDX
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
request={}
clamped=radius=0
def hook(u,a,n,d):
 global request,clamped,radius
 if a==0x4239f7:request={'path':'approach'}
 if a==0x423b66:
  if not request:request={'path':'assessment'}
  u.emu_stop()
 if a==0x4237bf:clamped=u.reg_read(UC_X86_REG_EAX)
 if a==0x4237e0:radius=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EDX)))[0]
 if a==0x42381a:
  sp=u.reg_read(UC_X86_REG_ESP);x,z=struct.unpack('<2i',u.mem_read(sp+8,8))
  request=dict(path='search',rangeDistance=clamped,radius=radius,target=dict(x=x,z=z));u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global request
 request={}
 sp=0x102000
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577f18,q['actorFlags']),(0x574518,q['cup']['x']),(0x57451c,q['cup']['z']),(0x58dd80,q['mode']),(sp+0xb24,int(q['explicitTarget'])),(sp+0xb28,q['plannerArgument']),(sp+0xb2c,q['targetZ']),(sp+0xb30,q['curve'])]:write(a,v)
 for a,v in [(sp+0x14,q['terrainCode']),(sp+0x30,q['range']),(0x5a5b88,q['diagnostics']),(0x5a7270,q['landing']['x']),(0x5a7278,q['landing']['z'])]:write(a,v)
 u.mem_write(0x577f21,bytes([q['skillMask']]))
 u.mem_write(0x570d38,bytes(2500))
 for x,z,code in q['cells']:u.mem_write(0x570d38+x*50+z,bytes([code]))
 for code,value in enumerate(q['classes']):u.mem_write(0x576dc2+code*48,bytes([value&255]))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EAX,int(q['explicitTarget']));u.reg_write(UC_X86_REG_EDI,0)
 u.emu_start(0x42365d,0x423b67,count=5000)
 return dict(target=dict(x=read(0x577fd4),z=read(0x577fd8)),curve=read(sp+0xb30),distance=read(sp+0x10),heading=read(0x577fe8)&0xffffffff,actorFlags=read(0x577f18)&0xffffffff,request=request,landing=dict(x=read(0x5a7270),z=read(0x5a7278)),diagnostics=read(0x5a5b88))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=rng.randrange(51200),z=rng.randrange(51200),target=dict(x=rng.randrange(50),z=rng.randrange(50)),cup=dict(x=rng.randrange(50),z=rng.randrange(50)),mode=rng.randrange(-1,5),curve=rng.randrange(-1,2),explicitTarget=bool(rng.randrange(2)),plannerArgument=rng.choice([-1,rng.randrange(51200)]),targetZ=rng.randrange(51200),actorFlags=rng.randrange(2**32))
 # Interior cup and nearby origins deliberately exercise both approach adjustments.
 x=rng.randrange(5,45);z=rng.randrange(5,45)
 q.update(cup=dict(x=x,z=z),x=(x+rng.randrange(-3,4))*1024+512,z=(z+rng.randrange(-3,4))*1024+512,
  skillMask=i%8,terrainCode=i%21,range=[30,60,100,200][i%4],landing=dict(x=123,z=456),diagnostics=77,
  cells=[[x+dx,z+dz,rng.randrange(21)] for dx,dz in [(0,-1),(1,0),(0,1),(-1,0)]],classes=[rng.randrange(-8,33) for _ in range(21)])
 if i%3:q.update(explicitTarget=False,plannerArgument=-1)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-target-selection.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalTargetSelection}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalTargetSelection(q,{terrainAt:(x,z)=>q.cells.find(c=>c[0]===x&&c[1]===z)?.[2]??0,shotClassAt:code=>q.classes[code]});if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 contiguous original target-selection cases match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-target-selection.json').write_text(json.dumps(rows[:240],separators=(',',':'))+'\n')
