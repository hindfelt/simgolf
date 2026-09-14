"""Verify complete original pruning retries and final survivor spread."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
from unicorn.x86_const import UC_X86_REG_EBP
for a,n in [(0x423279,0x21d),(0x466ba0,0x10e),(0x40c1a0,0x42),(0x40a9f0,0x81),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x483330,b'\xc3');u.reg_write(UC_X86_REG_FPCW,0x37f)
passes=[]
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def hook(u,a,n,d):
 if a==0x423452:passes.append(dict(margin=read(0x102040),count=read(0x102034)))
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global passes
 passes=[];sp=0x102000;u.mem_write(sp,bytes(0x8000))
 for off,v in [(0x60,q['bestScore']),(0x38,q['samples']),(0x44,q['work']),(0x54,q['anchor']['x']),(0x8c,q['anchor']['z'])]:write(sp+off,v)
 for a,v in [(0x577fdc,q['origin']['x']),(0x577fe0,q['origin']['z']),(0x574518,q['cup']['x']),(0x57451c,q['cup']['z'])]:write(a,v)
 for key,base in [('scores',0xbc),('distances',0x2a14),('flags',0x536c)]:
  for i,row in enumerate(q[key]):
   for j,v in enumerate(row):write(sp+base+(i*6+j)*4,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x423279,0x423496,count=1000000)
 assert u.reg_read(UC_X86_REG_EIP)==0x423496
 scores=[list(struct.unpack('<6i',u.mem_read(sp+0xbc+i*24,24))) for i in range(441)]
 survivors=[dict(candidate=i,option=j) for i,row in enumerate(scores) if row[1]<=99999 for j,v in enumerate(row) if v<99999]
 return dict(scores=scores,survivors=survivors,passes=passes,margin=read(sp+0x40),nextSamples=q['samples']*2,continueSearch=len(survivors)>1,spread=dict(minDistance=read(sp+0x14),maxDistance=read(sp+0x10),minHeading=read(sp+0x18),maxHeading=read(sp+0x2c)))
rng=random.Random(2002);rows=[]
for _ in range(200):
 best=rng.randrange(-100,501)
 q=dict(scores=[[rng.choice([best+rng.randrange(200),99999,100000]) for _ in range(6)] if rng.random()<.1 else [100000]*6 for _ in range(441)],distances=[[rng.choice([0,rng.randrange(1000)]) for _ in range(6)] for _ in range(441)],flags=[[rng.randrange(2**32) for _ in range(6)] for _ in range(441)],bestScore=best,samples=rng.choice([2,4]),work=rng.randrange(300),origin=dict(x=rng.randrange(51200),z=rng.randrange(51200)),cup=dict(x=30,z=25),anchor=dict(x=25,z=25))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-spread.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRoutePrunedState}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRoutePrunedState(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({spread:a.spread,expected:e.spread,passes:a.passes,expectedPasses:e.passes}));}
console.log('200 complete pruning retry loops and spread states match original executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-pruned-state.json').write_text(json.dumps(rows[:3],separators=(',',':'))+'\n')
