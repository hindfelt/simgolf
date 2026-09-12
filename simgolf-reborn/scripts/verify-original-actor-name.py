"""Compare complete original actor name expansion with supplied name tables."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x466fb0,0x320),(0x4c4244,3),(0x4e0b38,0x60)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def string(a,s):u.mem_write(a,s.encode('ascii')+b'\0')
rng=random.Random(2002);rows=[]
for i in range(1600):
 actor=bytearray(rng.randrange(256) for _ in range(256));actor[0x18]=i%256;actor[0xbb]=i%8;struct.pack_into('<h',actor,0xb6,(i//8)%8)
 q=dict(actorId=i%4,actor=list(actor),sourceText='Prefix',appendComma=bool((i//4)%2),clubName='Willow',clubSequence=rng.choice([-1,0,1,2,7,8,9,128,129]),secondaryName='Grove',profileNames=['Golfer '+str(j) for j in range(8)],staffNames=['Staff '+str(j) for j in range(8)])
 u.mem_write(0x577f08+q['actorId']*256,bytes(actor));string(0x518f78,q['sourceText']);string(0x103000,q['clubName']);string(0x103100,q['secondaryName']);put(0x4c1c08,0x103000);put(0x4c1c10,0x103100);put(0x539360,q['clubSequence'])
 for j,name in enumerate(q['profileNames']):string(0x4d5050+j*560,name)
 for j,name in enumerate(q['staffNames']):string(0x58c7a0+j*56,name)
 sp=0x102000;put(sp,0x401000);put(sp+4,q['actorId']);put(sp+8,q['appendComma']);u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x466fb0,0x401000,count=2000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii')])
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-name.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {originalActorName} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalActorName({...q,actor:Uint8Array.from(q.actor)});if(got!==expected)throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native actor-name cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-actor-name.json').write_text(json.dumps(rows[:256],separators=(',',':'))+'\n')
