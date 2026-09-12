"""Verify original cup/exact target selection, distance and heading."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x42376c,0xae),(0x4a57a0,0x27),(0x466a00,0x50),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x839000,0x1000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_EBP,UC_X86_REG_EDI
result={};radius=0;clamped=0
from unicorn import UC_HOOK_CODE
def hook(u,a,n,d):
 global result,radius,clamped
 if a in [0x423b66,0x4239f7]:result=dict(path='assessment' if a==0x423b66 else 'approach');u.emu_stop()
 if a==0x4237bf:clamped=u.reg_read(UC_X86_REG_EAX)
 if a==0x4237e0:radius=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EDX)))[0]
 if a==0x42381a:
  sp=u.reg_read(UC_X86_REG_ESP);x,z=struct.unpack('<2i',u.mem_read(sp+8,8))
  # Capture clamp return separately from projection outputs.
  result=dict(path='search',rangeDistance=clamped,radius=radius,target=dict(x=x,z=z));u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def run(q):
 global current,result
 current=q;result={};sp=0x102000
 for a,v in [(sp+0xb28,q['plannerArgument']),(sp+0x14,q['terrainCode']),(sp+0x30,q['range']),(0x577fe8,q['heading']),(0x577fdc,q['x']),(0x577fe0,q['z'])]:write(a,v)
 u.mem_write(0x577f21,bytes([q['skillMask']]))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EDX,int(q['explicitTarget']));u.reg_write(UC_X86_REG_EDI,q['actorFlags']);u.reg_write(UC_X86_REG_EBP,q['distance'])
 u.emu_start(0x42376c,0x423b67,count=3000)
 return result
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=26112,z=26112,heading=rng.randrange(2**32),range=rng.randrange(1,331),distance=rng.randrange(501),actorFlags=rng.randrange(4),skillMask=rng.randrange(8),terrainCode=rng.choice([0,1,2,17]),explicitTarget=i%5==0,plannerArgument=1 if i%7==0 else -1)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-target-request.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAutoTargetRequest}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalAutoTargetRequest(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 automatic target requests match original branches and projection.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-target-request.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
