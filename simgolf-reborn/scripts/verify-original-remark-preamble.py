"""Compare original pre-outcome actor updates and external-effect arguments."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x467d72,0xdd),(0x466a20,0x19)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
event=None
def hook(u,a,size,data):
 global event
 if a==0x447a30:
  sp=u.reg_read(UC_X86_REG_ESP);event=dict(address=a,args=[get(sp+4+i*4) for i in range(5)]);u.emu_stop()
 if a in (0x469075,0x467e4f):u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1400):
 actor=bytearray(rng.randrange(256) for _ in range(256));before=bytearray(rng.randrange(256) for _ in range(256))
 for record in (actor,before):record[0x18]=rng.choice([0,1,0x40]);struct.pack_into('<I',record,0x10,rng.choice([0,0x40000]))
 q=dict(actor=list(actor),before=list(before),kind=rng.choice([2,3,12,13,40,48,49,65]),delta=rng.choice([-3,-2,-1,0,1,2,3]),actorId=0,selectedActorId=i%2)
 sp=0x102000;u.mem_write(0x577f08,bytes(actor));u.mem_write(sp+0x20,bytes(before))
 for a,v in [(sp+0x124,0),(sp+0x128,q['kind']),(0x5a4440,q['selectedActorId'])]:u.mem_write(a,struct.pack('<I',v))
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['delta']&0xffffffff)
 event=None;u.emu_start(0x467d72,0,count=300);end=u.reg_read(UC_X86_REG_EIP);assert end in (0x469075,0x467e4f,0x447a30)
 rows.append([q,dict(actor=list(u.mem_read(0x577f08,256)),next='effect' if event else 'return' if end==0x469075 else 'outcome',event=event)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-preamble.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkPreamble} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.actor=Uint8Array.from(q.actor);q.before=Uint8Array.from(q.before);const got=originalRemarkPreamble(q);got.actor=[...got.actor];if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native remark-preamble cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-preamble.json').write_text(json.dumps(rows[:48],separators=(',',':'))+'\n')
