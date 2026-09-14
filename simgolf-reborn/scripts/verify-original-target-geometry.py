"""Verify original cup/exact target selection, distance and heading."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42365d,0x113),(0x466ba0,0x10e),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
from unicorn.x86_const import UC_X86_REG_EDI,UC_X86_REG_EBP
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for a,v in [(0x577fd4,q['target']['x']),(0x577fd8,q['target']['z']),(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577f18,q['actorFlags']),(0x574518,q['cup']['x']),(0x57451c,q['cup']['z']),(0x58dd80,q['mode']),(sp+0xb24,int(q['explicitTarget'])),(sp+0xb28,q['plannerArgument']),(sp+0xb2c,q['targetZ']),(sp+0xb30,q['curve'])]:write(a,v)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EAX,int(q['explicitTarget']));u.reg_write(UC_X86_REG_EDI,0)
 u.emu_start(0x42365d,0x423770,count=3000)
 return dict(target=dict(x=read(0x577fd4),z=read(0x577fd8)),curve=read(sp+0xb30),distance=read(sp+0x10),heading=read(0x577fe8)&0xffffffff,actorFlags=read(0x577f18)&0xffffffff)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=rng.randrange(51200),z=rng.randrange(51200),target=dict(x=rng.randrange(50),z=rng.randrange(50)),cup=dict(x=rng.randrange(50),z=rng.randrange(50)),mode=rng.randrange(-1,5),curve=rng.randrange(-1,2),explicitTarget=bool(rng.randrange(2)),plannerArgument=rng.choice([-1,rng.randrange(51200)]),targetZ=rng.randrange(51200),actorFlags=rng.randrange(2**32))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-target-geometry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalTargetGeometry}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalTargetGeometry(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 original target geometry cases match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-target-geometry.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
