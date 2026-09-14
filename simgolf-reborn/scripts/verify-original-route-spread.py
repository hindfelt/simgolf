"""Verify original survivor distance and relative-heading spread updates."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
from unicorn.x86_const import UC_X86_REG_EBP,UC_X86_REG_EDI
for a,n in [(0x42338e,0x74),(0x40c1a0,0x42),(0x40a9f0,0x81),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000
 for off,v in [(0x2a14,q['storedDistance']),(0x14,q['spread']['minDistance']),(0x10,q['spread']['maxDistance']),(0x18,q['spread']['minHeading']),(0x2c,q['spread']['maxHeading']),(0x8c,q['target']['z']+10),(0x54,q['target']['x']),(0x28,0),(0x536c,q['sampleFlags']),(0x64,q['cupHeading'])]:write(sp+off,v)
 write(0x577fdc,q['origin']['x']);write(0x577fe0,q['origin']['z'])
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,0)
 u.emu_start(0x42338e,0x423402,count=1000)
 return dict(minDistance=read(sp+0x14),maxDistance=read(sp+0x10),minHeading=read(sp+0x18),maxHeading=read(sp+0x2c))
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(origin=dict(x=rng.randrange(51200),z=rng.randrange(51200)),target=dict(x=rng.randrange(50),z=rng.randrange(50)),storedDistance=rng.choice([0,rng.randrange(1000)]),sampleFlags=rng.randrange(2**32),cupHeading=rng.randrange(2**32),spread=dict(minDistance=65535,maxDistance=-1000,minHeading=0x0fffffff,maxHeading=-536870912))
 if i%2:q['spread']=dict(minDistance=10,maxDistance=500,minHeading=-10000,maxHeading=10000)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-spread.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteSpread}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRouteSpread(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 original surviving-option spread updates match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-spread.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
