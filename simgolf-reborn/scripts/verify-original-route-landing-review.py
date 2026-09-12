"""Verify contiguous original landing scoring and progress flag publication."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
for a,n in [(0x422c34,0x270),(0x40bc50,0x33),(0x40a9f0,0x81),(0x40c1a0,0x42),(0x4a57a0,0x27),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
remaining=0
def hook(u,a,s,d):
 global remaining
 if a==0x422e88:remaining=u.reg_read(UC_X86_REG_EAX)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 u.mem_write(0x102000,bytes(0x9000));u.mem_write(0x570d38,bytes([2])*2500)
 for x,z,code,cls,flags in q['cells']:
  write(0x570d38+x*50+z,code,1);write(0x576dc2+48*code,cls,1);write(0x53ba00+2*(x*50+z),flags,2)
 write(0x577182,q['excludedClass'],1);write(0x577f21,q['skillMask'],1)
 write(0x577f29,q['hole'],1);write(0x574518+q['hole']*520,q['cup']['x']);write(0x57451c+q['hole']*520,q['cup']['z'])
 write(0x5691dc,q['landing']['x']);write(0x5691e0,q['landing']['z'])
 write(0x10201c,q['score']);write(0x102028,q['goodLandings']);write(0x102068,q['distanceDivisor'])
 for off,v in [(0x40,q['heading']),(0x80,q['hole']*520),(0x10,int(q['cornerTarget'])),(0x18,q['target']['z']),(0x2c,q['target']['x']),(0x74,q['target']['z']<<10),(0x84,q['target']['x']<<10)]:write(0x102000+off,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x422c34,0x422ea4,count=1000)
 assert u.reg_read(UC_X86_REG_EIP)==0x422ea4
 return dict(score=read(0x10201c),goodLandings=read(0x102028),lie=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EDI)))[0],remaining=remaining,plannedRemaining=read(0x104a14),sampleFlags=read(0x10736c)&0xffffffff)
rng=random.Random(2002);rows=[]
for _ in range(1000):
 cells=[]
 for x in range(24,27):
  for z in range(24,27):cells.append([x,z,2+len(cells),rng.randrange(-1,4),rng.choice([0,0x82,0x83,0x482])])
 q=dict(landing=dict(x=25*1024+rng.randrange(1024),z=25*1024+rng.randrange(1024)),cup=dict(x=30,z=25),hole=2,skillMask=rng.randrange(8),excludedClass=32,distanceDivisor=rng.choice([2,4,6]),score=rng.randrange(-20,20),goodLandings=rng.randrange(10),cells=cells)
 q.update(target=dict(x=rng.randrange(20,31),z=rng.randrange(20,31)),cornerTarget=bool(rng.randrange(2)),heading=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-landing-review.js').as_uri()
script='''import {readFileSync} from 'node:fs';const {originalRouteLandingReview}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,e] of rows){const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags}]));
 const a=originalRouteLandingReview({...q,terrainAt:p=>cells.get(`${p.x},${p.z}`)});
 if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));
}console.log(`${rows.length} complete landing reviews match contiguous original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)

if '--write-fixture' in __import__('sys').argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-landing-review.json').write_text(json.dumps(rows[:40],separators=(',',':'))+'\n')
