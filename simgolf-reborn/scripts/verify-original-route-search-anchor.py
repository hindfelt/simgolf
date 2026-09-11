"""Verify original route anchor projection and initial sampling weights."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x422688,0x111),(0x40c1a0,0x42),(0x40a9f0,0x81),(0x4a57a0,0x27),(0x466a00,0x50),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x839000,0x1000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
from unicorn.x86_const import UC_X86_REG_EBP

def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for a,v in [(sp+0x5c,q['distance']),(sp+0x58,q['z']>>10),(0x577fe8,q['heading']),(0x577fdc,q['x']),(0x577fe0,q['z']),(0x574518,q['cup']['x']),(0x57451c,q['cup']['z'])]:write(a,v)
 u.mem_write(0x577f29,b'\x00')
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,q['x']>>10);u.reg_write(UC_X86_REG_EDX,q['shotCounter']);u.reg_write(UC_X86_REG_EAX,(q['range']-25)&0xffffffff)
 u.emu_start(0x422688,0x422799,count=3000)
 assert u.reg_read(UC_X86_REG_EIP)==0x422799
 return dict(anchor=dict(x=read(sp+0x54),z=read(sp+0x8c)),distanceDivisor=read(sp+0x68),work=read(sp+0x44),samples=read(sp+0x38))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=rng.randrange(51200),z=rng.randrange(51200),heading=rng.randrange(2**32),range=rng.randrange(1,331),distance=rng.randrange(501),shotCounter=rng.randrange(256),cup=dict(x=rng.randrange(50),z=rng.randrange(50)))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-search-anchor.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteSearchAnchor}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRouteSearchAnchor(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 original route anchors and initial sampling weights match.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-search-anchor.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
