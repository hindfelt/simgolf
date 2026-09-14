"""Verify original candidate score sentinel, geometry and fresh-score initialization."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
for a,n in [(0x4227db,0x146),(0x466ba0,0x10e),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
result={}
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def hook(u,a,n,d):
 global result
 if a==0x42323d:result=dict(skip=True);u.emu_stop()
 if a in [0x422921,0x422af8]:
  sp=0x102000
  scores=list(struct.unpack('<6i',u.mem_read(sp+0xbc+currentIndex*24,24)))
  result=dict(skip=False,candidate=dict(x=read(sp+0x2c),z=read(sp+0x18)),x=read(sp+0x84),z=read(sp+0x74),distance=read(sp+0x7c),heading=read(sp+0x40)&0xffffffff,needsAdmission=a==0x422921,scores=scores);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global result,currentIndex
 result={};sp=0x102000;currentIndex=(q['offset']['x']+10)*21+q['offset']['z']+10
 for a,v in [(sp+0xb0,(q['offset']['x']+10)*21),(sp+0x20,q['offset']['x']),(sp+0x24,q['offset']['z']),(sp+0x54,q['anchor']['x']),(sp+0x8c,q['anchor']['z']),(sp+0x30,0),(0x577fdc,q['origin']['x']),(0x577fe0,q['origin']['z'])]:write(a,v)
 for i,v in enumerate(q['scores']):write(sp+0xbc+currentIndex*24+i*4,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x4227db,0x42323e,count=3000)
 return result
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(anchor=dict(x=rng.randrange(10,40),z=rng.randrange(10,40)),offset=dict(x=rng.randrange(-10,11),z=rng.randrange(-10,11)),origin=dict(x=rng.randrange(51200),z=rng.randrange(51200)),scores=[rng.randrange(-100,100001) for _ in range(6)])
 q['scores'][1]=rng.choice([0,100000,99999,rng.randrange(1,500)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-trial.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteTrial}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRouteTrial(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 route trial geometry and cache branches match original executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-trial.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
