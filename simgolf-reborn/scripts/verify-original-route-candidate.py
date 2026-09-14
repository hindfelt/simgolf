"""Verify original candidate admission, executing x86 filter and distance helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EDI,UC_X86_REG_ESI,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
for address,size in [(0x42290e,0x1ea),(0x40bc50,0x33),(0x40a9f0,0x81),(0x4a57a0,0x27),(0x4c1870,64)]:
 offset=p.get_offset_from_rva(address-0x400000);u.mem_write(address,p.__data__[offset:offset+size])
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def stop(u,a,s,d):
 if a in [0x422af8,0x42323d]:u.emu_stop()
u.hook_add(UC_HOOK_CODE,stop)
def run(q):
 u.mem_write(0x570d38,bytes(2500));u.mem_write(0x102000,bytes(4096))
 for offset,key in [(0xa0,'x'),(0xa8,'z')]:write(0x102000+offset,q['previousTarget'][key])
 for offset,key in [(0x90,'x'),(0x58,'z')]:write(0x102000+offset,q['start'][key])
 for offset,key in [(0x4c,'range'),(0x7c,'shotDistance'),(0x5c,'cupDistance')]:write(0x102000+offset,q[key])
 write(0x102018,q['candidate']['z']);write(0x577f18,q['actorFlags']);write(0x577f29,0,1)
 write(0x574518,q['cup']['x']);write(0x57451c,q['cup']['z']);write(0x102010,1)
 for i,offset in enumerate([0x48,0x28,0x34,0x14,0x1c,0x70]):write(0x102000+offset,0x104000+i*4)
 x=q['candidate']['x'];z=q['candidate']['z']
 if 0<=x<50 and 0<=z<50:
  write(0x570d38+x*50+z,q['code'],1);write(0x576dc2+48*q['code'],q['shotClass'],1)
  for i,(dx,dz) in enumerate([(0,-1),(1,0),(0,1),(-1,0)]):
   write(0x570d38+(x+dx)*50+z+dz,3+i,1);write(0x576dc2+48*(3+i),q['neighbors'][i],1)
 u.reg_write(UC_X86_REG_EBP,0x104100);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EDI,0);u.reg_write(UC_X86_REG_ESI,x&0xffffffff);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x42290e,0x42323d,count=700)
 end=u.reg_read(UC_X86_REG_EIP);assert end in [0x422af8,0x42323d],hex(end)
 return end==0x422af8
rng=random.Random(2002);rows=[]
for _ in range(5000):
 q=dict(candidate=dict(x=rng.randint(1,48),z=rng.randint(1,48)),start=dict(x=10,z=25),cup=dict(x=40,z=25),previousTarget=dict(x=30,z=25),actorFlags=rng.randrange(2),range=rng.randint(80,330),shotDistance=rng.randint(0,350),cupDistance=750,code=rng.choice([0,1,2,20]),shotClass=rng.randrange(-1,4),neighbors=[rng.randrange(-1,4) for _ in range(4)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-candidate.js').as_uri()
script='''import {readFileSync} from 'node:fs';const {originalRouteCandidate}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));let accepted=0;
for(const [q,expected] of rows){
 const offsets=['0,-1','1,0','0,1','-1,0'];
 const actual=originalRouteCandidate({...q,terrainAt:p=>p.x===q.candidate.x&&p.z===q.candidate.z?
 {code:q.code,shotClass:q.shotClass}:{code:3,shotClass:q.neighbors[offsets.indexOf(`${p.x-q.candidate.x},${p.z-q.candidate.z}`)]}}).eligible;
 if(actual!==expected)throw Error(JSON.stringify({q,expected,actual}));if(actual)accepted++;
}console.log(`${rows.length} candidate decisions match original x86 (${accepted} admitted).`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
