"""Verify original route diagnostics and winner publication/state cleanup."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
from unicorn.x86_const import UC_X86_REG_EDX
for a,n in [(0x423496,0x45),(0x423516,0xa1)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for off,v in [(0x10,q['maxDistance']),(0x14,q['minDistance']),(0x2c,q['maxHeading']),(0x18,q['minHeading'])]:write(sp+off,v)
 write(0x5a5b88,q['diagnostics']);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EDX,q['samples']);u.emu_start(0x423496,0x4234db,count=1000)
 diagnostic=read(0x5a5b88)
 for off,v in [(0x68,q['winner']['target']['x']),(0x94,q['winner']['target']['z']),(0x20,0),(0x9c,q['winner']['landingFlag']),(0x5c,q['winner']['curve']),(0x70,0)]:write(sp+off,v)
 for a,v in [(0x574518,q['cup']['x']),(0x57451c,q['cup']['z']),(0x59d208,q['worldFlags']),(0x5a870c,q['mode']),(0x5a8730,q['cornerTarget'])]:write(a,v)
 u.emu_start(0x423516,0x423582,count=1000)
 return diagnostic,dict(target=dict(x=read(0x577fd4),z=read(0x577fd8)),curve=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0],cornerTarget=read(0x5a8730),diagnostics=read(0x5a5b88),worldFlags=read(0x59d208)&0xffffffff,mode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(samples=rng.choice([2,4,8]),diagnostics=rng.randrange(8),maxDistance=rng.randrange(1000),minDistance=rng.randrange(1000),maxHeading=rng.randrange(-2147483648,2147483648),minHeading=rng.randrange(-2147483648,2147483648),winner=dict(target=dict(x=rng.choice([-1,rng.randrange(50)]),z=rng.randrange(50)),curve=rng.randrange(-1,2),landingFlag=rng.randrange(2)),cup=dict(x=rng.randrange(50),z=rng.randrange(50)),worldFlags=rng.randrange(2**32),mode=rng.randrange(4),cornerTarget=rng.randrange(2))
 d,e=run(q);rows.append([q,d,e])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-finish.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteDiagnostics,originalRouteFinish}=await import(MODULE);
for(const [q,d,e] of JSON.parse(readFileSync(0,'utf8'))){const diagnostics=originalRouteDiagnostics(q);const a=originalRouteFinish({...q,diagnostics});if(diagnostics!==d||!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,d,diagnostics,a,e}));}
console.log('5000 route diagnostics and completion states match original executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-finish.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
