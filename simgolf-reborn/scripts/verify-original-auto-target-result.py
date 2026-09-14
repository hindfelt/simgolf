"""Verify original route-result target scoring, flags, heading and distance."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x423863,0x16c),(0x466ba0,0x10e),(0x4a57a0,0x27),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577f18,q['actorFlags']),(sp+0x1c,q['score'])]:write(a,v)
 u.mem_write(0x577f21,bytes([q['skillMask']]));u.mem_write(sp+0x158,bytes(v&255 for v in q['scores']))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EAX,int(q['cornerTarget']))
 u.emu_start(0x423863,0x4239cf,count=3000)
 return dict(dx=read(sp+0x38),dz=read(sp+0x28),actorFlags=read(0x577f18)&0xffffffff,score=read(sp+0x1c),heading=read(0x577fe8)&0xffffffff,distance=read(sp+0x10))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=rng.randrange(51200),z=rng.randrange(51200),target=dict(x=rng.randrange(1,49),z=rng.randrange(1,49)),cornerTarget=bool(rng.randrange(2)),actorFlags=rng.randrange(2**32),skillMask=rng.randrange(8),score=rng.randrange(-128,128),scores=[rng.randrange(-128,128) for _ in range(2500)])
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-target-result.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAutoTargetResult}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalAutoTargetResult(q,(x,z)=>q.scores[x*50+z]);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q:{x:q.x,z:q.z,target:q.target},a,e}));}
console.log('5000 original route-result aim and score calculations match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-target-result.json').write_text(json.dumps(rows[:30],separators=(',',':'))+'\n')
