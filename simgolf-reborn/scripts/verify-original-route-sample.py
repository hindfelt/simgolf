"""Verify original sample dispatch calls and work accounting; simulation supplied."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
for a,n in [(0x422bcf,0x65)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
calls=[]
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def hook(u,a,n,d):
 if a==0x421b50:
  sp=u.reg_read(UC_X86_REG_ESP);ret,actor,x,z,curve=struct.unpack('<5i',u.mem_read(sp,20));calls.append(dict(actorId=actor,x=x,z=z,curve=curve))
  u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global calls
 calls=[];sp=0x102000
 for off,v in [(0x10,q['cornerTarget']),(0x74,q['target']['z']<<10),(0x84,q['target']['x']<<10),(0x18,q['target']['z']),(0x2c,q['target']['x']),(0x14,q['curve']),(0x7cc8,q['actorId']),(0x44,q['work'])]:write(sp+off,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x422bcf,0x422c34,count=1000)
 return calls,read(sp+0x44)
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(target=dict(x=rng.randrange(50),z=rng.randrange(50)),actorId=rng.randrange(256),cornerTarget=bool(rng.randrange(2)),curve=rng.randrange(-1,2),work=rng.randrange(10000))
 calls,work=run(q);rows.append([q,calls,work])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-sample.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteSample}=await import(MODULE);
for(const [q,e,work] of JSON.parse(readFileSync(0,'utf8'))){const calls=[];const a=originalRouteSample(q,c=>{calls.push(c);return 123;});if(!isDeepStrictEqual(calls,e)||a.work!==work||a.result!==123)throw Error(JSON.stringify({q,calls,e,a,work}));}
console.log('5000 original sample dispatch calls and work counters match.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-sample.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
