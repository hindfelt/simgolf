"""Verify original individual route-option gate and score writes."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_EDX
for a,n in [(0x422b65,0x50),(0x422abc,0x3c)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
result={}
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def hook(u,a,n,d):
 global result
 if a in [0x422bb5,0x423215]:result=dict(eligible=a==0x422bb5,score=read(0x103000));u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global result
 result={};sp=0x102000
 write(sp+0x3c,q['curveMask']);write(sp+0x7c,q['distance']);write(0x103000,q['score'])
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EAX,0x103000);u.reg_write(UC_X86_REG_EDX,q['score']&0xffffffff);u.reg_write(UC_X86_REG_ECX,q['curve']&0xffffffff)
 u.emu_start(0x422b65,0x423216,count=1000)
 return result
# Verify the six-slot reset reached by a newly admitted candidate.
for off,slot in [(0x48,2),(0x28,1),(0x34,0),(0x14,5),(0x1c,4),(0x70,3)]:write(0x102000+off,0x103000+slot*4)
for slot in range(6):write(0x103000+slot*4,100000)
u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x422abc,0x422af8,count=100)
assert list(struct.unpack('<6i',u.mem_read(0x103000,24)))==[0]*6
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(score=rng.choice([0,99998,99999,100000,rng.randrange(-10000,99999)]),curve=rng.choice([-1,0,1]),curveMask=rng.randrange(4),distance=rng.randrange(500))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-option.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteOption}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRouteOption(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 original route-option eligibility and score writes match.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-option.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
