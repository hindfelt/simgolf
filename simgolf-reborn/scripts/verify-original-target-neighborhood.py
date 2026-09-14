"""Verify target-neighborhood assessment against original instructions and bounds helper."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x423dd7,0x10a),(0x40bc50,0x33),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def array(a):return list(struct.unpack('<32i',u.mem_read(a,128)))
def run(q):
 u.mem_write(0x570d38,bytes(q['terrain']))
 for i,v in enumerate(q['classes']):u.mem_write(0x576dc2+48*i,bytes([v&255]))
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(0x577fdc,q['origin']['x']),(0x577fe0,q['origin']['z'])]:write(a,v)
 for a,key in [(0x10,'distance'),(0x20,'obstacles'),(0x2c,'span'),(0x3c,'dominantCode'),(0x4c,'dominantDirection')]:write(0x102000+a,q[key])
 for a,key in [(0x58,'totals'),(0xd8,'directions')]:
  for i,v in enumerate(q[key]):write(0x102000+a+i*4,v)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBX,q['accumulated']&0xffffffff)
 u.emu_start(0x423dd7,0x423ee1,count=3000)
 return dict(totals=array(0x102058),directions=array(0x1020d8),dominantCode=struct.unpack('<i',u.mem_read(0x10203c,4))[0],dominantDirection=struct.unpack('<i',u.mem_read(0x10204c,4))[0],rating=u.mem_read(0x577f23,1)[0])
rng=random.Random(2002);rows=[]
for i in range(1000):
 q=dict(distance=rng.randrange(331),span=rng.randrange(14),obstacles=rng.randrange(5),accumulated=rng.randrange(-500,2000),target=dict(x=rng.choice([0,49,rng.randrange(50)]),z=rng.choice([0,49,rng.randrange(50)])),origin=dict(x=25*1024,z=25*1024),totals=[rng.randrange(-100,300) for _ in range(32)],directions=[rng.randrange(8) for _ in range(32)],dominantCode=9,dominantDirection=7,terrain=[rng.randrange(23) for _ in range(2500)],classes=[rng.randrange(-128,128) for _ in range(32)])
 if i%10==0:q['totals']=[-10000]*32
 if i%3==0:q['terrain'][25*50+25]=1
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-target-neighborhood.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalTargetNeighborhood}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalTargetNeighborhood(q,(x,z)=>q.terrain[x*50+z],c=>q.classes[c]);if(JSON.stringify(a)!==JSON.stringify(e))throw Error(JSON.stringify({q,a,e}));}
console.log('1000 target neighborhood assessments match original x86, including original bounds helper.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-target-neighborhood.json').write_text(json.dumps(rows[:30],separators=(',',':'))+'\n')
