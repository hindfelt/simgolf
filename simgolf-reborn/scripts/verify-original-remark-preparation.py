"""Native post-display preparation with actual voice lookup and controlled speech effects."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x8000)
for a,n in [(0x467408,0x16c),(0x46c140,0x2c)]:u.mem_write(a,p.get_data(a-0x400000,n))
u.mem_write(0x40c1f0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
events=[]
def hook(u,a,size,data):
 if a==0x469075:u.emu_stop();return
 if a not in [0x46c140,0x40c1f0]:return
 sp=u.reg_read(UC_X86_REG_ESP);n=1 if a==0x46c140 else 4;events.append(dict(address=a,args=list(struct.unpack('<'+'i'*n,u.mem_read(sp+4,4*n)))))
 if a==0x40c1f0 and q['mutate']:
  u.mem_write(0x577f08+q['actorId']*256+0x70,b'\x23');u.mem_write(0x577f08+q['actorId']*256+0x21,b'\x05')
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for i in range(2080):
 actorId=i%4;kind=i%65+1;a=bytearray((j+i)%256 for j in range(256));a[0xb6:0xb8]=struct.pack('<h',i%8);a[0x70]=35 if i%3==0 else 7;profile=bytearray(560);profile[0x21]=i%256;profile[0x23]=(i*7)%256
 q=dict(actorId=actorId,kind=kind,value=i*37,mutate=i%5==0,profileRecords={str(i%8):list(profile)},state=dict(actors={str(actorId):list(a)}))
 u.mem_write(0x577f08+actorId*256,bytes(a));u.mem_write(0x4d5040+i%8*560,bytes(profile));sp=0x104000;put(sp+0x124,actorId);put(sp+0x128,kind);put(sp+0x12c,q['value']);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,actorId*256);u.reg_write(UC_X86_REG_EBX,kind);u.reg_write(UC_X86_REG_EFLAGS,0x42 if kind==35 else 2);events=[]
 u.emu_start(0x467408,0x467502,count=3000);end=u.reg_read(UC_X86_REG_EIP);assert end in [0x467502,0x469075];advanced=end==0x467502
 rows.append([q,dict(state=dict(actors={str(actorId):list(u.mem_read(0x577f08+actorId*256,256))}),events=events,next='adjustment' if advanced else 'return',before=list(u.mem_read(sp+0x20,256)) if advanced else None,voiceOffset=u.reg_read(UC_X86_REG_ESI) if advanced else None)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-preparation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkPreparation} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const s of [q.state,expected.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);if(expected.before)expected.before=Uint8Array.from(expected.before);const got=originalRemarkPreparation(q,(e,s)=>{if(q.mutate){s.actors[q.actorId][0x70]=35;s.actors[q.actorId][0x21]=5;}return s;});if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native remark preparation cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-preparation.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
