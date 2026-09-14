"""Compare the full packed actor history update against original instructions."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x467448;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x7f])
rng=random.Random(2002);rows=[]
for i in range(1000):
 record=bytes(rng.randrange(256) for _ in range(256));kind=[-1,0,1,3,4,19,23,35,65,255][i%10];value=rng.randrange(-2**31,2**31)
 sp=0x102000;offset=(i%4)*256
 u.mem_write(0x577f08+offset,record);u.mem_write(sp+0x12c,struct.pack('<i',value))
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,offset);u.reg_write(UC_X86_REG_EBX,kind&0xffffffff)
 u.emu_start(a,0x4674c7,count=500);assert u.reg_read(UC_X86_REG_EIP)==0x4674c7
 rows.append([dict(record=list(record),kind=kind,value=value),dict(before=list(u.mem_read(sp+0x20,256)),actor=list(u.mem_read(0x577f08+offset,256)))])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-history.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkHistory} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const result=originalRemarkHistory(Uint8Array.from(q.record),q.kind,q.value);const got={before:[...result.before],actor:[...result.actor]};if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native packed-history cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-history.json').write_text(json.dumps(rows[:20],separators=(',',':'))+'\n')
