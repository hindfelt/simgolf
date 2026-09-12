"""Compare native record-dispatch writes with explicit external helper effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EDI,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x830000,0x10000)
a=0x46737d;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x8b])
for addr in [0x469330,0x406b20]:u.mem_write(addr,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
q=None;events=[]
def hook(u,a,size,data):
 if a not in [0x469330,0x406b20]:return
 sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[get(sp+4+i*4) for i in range(4 if a==0x469330 else 2)]))
 if q['mutate']:
  base=0x577f08+q['actorId']*256;u.mem_write(base+0x21,bytes([250 if a==0x469330 else 7,128 if a==0x469330 else 3]));put(0x53f8b8,int(a==0x406b20))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1200):
 actors=[bytearray(rng.randrange(256) for _ in range(256)) for _ in range(4)]
 for j,record in enumerate(actors):struct.pack_into('<h',record,0xa2,(j+i)%4)
 q=dict(actorId=i%4,kind=i%65,value=rng.randrange(-2**31,2**31),mutate=i%3==0,state=dict(actors=[list(r) for r in actors],redirected=bool(i%2),requestValues=[rng.randrange(-2**31,2**31) for _ in range(65)]))
 sp=0x102000
 for j,r in enumerate(actors):u.mem_write(0x577f08+j*256,bytes(r))
 for j,v in enumerate(q['state']['requestValues']):put(0x836460+j*4,v)
 put(sp+0x12c,q['value']);put(0x53f8b8,q['state']['redirected']);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,q['actorId']*256);u.reg_write(UC_X86_REG_EDI,q['actorId']);u.reg_write(UC_X86_REG_EBX,q['kind']);u.reg_write(UC_X86_REG_EDX,actors[q['actorId']][0x22]);events=[]
 u.emu_start(a,0x467408,count=500);assert u.reg_read(UC_X86_REG_EIP)==0x467408
 records=[list(u.mem_read(0x577f08+j*256,256)) for j in range(4)];redirected=bool(get(0x53f8b8));receiver=struct.unpack_from('<h',bytes(records[q['actorId']]),0xa2)[0] if redirected else q['actorId']
 rows.append([q,dict(state=dict(actors=records,redirected=redirected,requestValues=[get(0x836460+j*4) for j in range(65)]),events=events,receiver=receiver)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-dispatch.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkDispatch} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actors=q.state.actors.map(a=>Uint8Array.from(a));const got=originalRemarkDispatch(q,(e,s)=>{if(q.mutate){s.actors[q.actorId][0x21]=e.address===0x469330?250:7;s.actors[q.actorId][0x22]=e.address===0x469330?128:3;s.redirected=e.address===0x406b20;}return s;});got.state.actors=got.state.actors.map(a=>[...a]);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native remark-dispatch cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-dispatch.json').write_text(json.dumps(rows[:65],separators=(',',':'))+'\n')
