"""Compare the complete original remark display helper with controlled name expansion."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x406b20,0x1c9),(0x4e8994,1),(0x4c3924,3),(0x4c3920,4)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
for a in [0x466fb0,0x4acb95]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def string(a,s):u.mem_write(a,s.encode('ascii')+b'\0')
def read(a):return bytes(u.mem_read(a,512)).split(b'\0')[0].decode('ascii')
q=None;events=[]
def hook(u,a,size,data):
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x466fb0:
  events.append(dict(address=a,args=[get(sp+4),get(sp+8)]));string(0x518f78,q['name'])
  if q['mutate']:u.mem_write(0x577f08+q['actorId']*256+0x21,b'\xfe');u.mem_write(0x5a8718,b'\xf1')
 if a==0x4acb95:
  assert get(sp+12)==10
  pointer=get(sp+8);string(pointer,str(get(sp+4)));u.reg_write(UC_X86_REG_EAX,pointer)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1000):
 actors=[bytearray(rng.randrange(256) for _ in range(256)) for _ in range(4)]
 q=dict(actorId=[-1,0,1,2,3][i%5],priority=rng.choice([-200,-128,-1,0,1,127,128,255]),name='Golfer '+str(i),mutate=i%3==0,state=dict(priority=rng.randrange(256),sourceText='Original message '+str(i),displayText='Previous display',actors=[list(r) for r in actors]))
 for j,r in enumerate(actors):u.mem_write(0x577f08+j*256,bytes(r))
 string(0x518f78,q['state']['sourceText']);string(0x568258,q['state']['displayText']);u.mem_write(0x5a8718,bytes([q['state']['priority']]))
 sp=0x102000;put(sp,0x401000);put(sp+4,q['actorId']);put(sp+8,q['priority']);u.reg_write(UC_X86_REG_ESP,sp);events=[];u.emu_start(0x406b20,0x401000,count=3000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,dict(state=dict(priority=u.mem_read(0x5a8718,1)[0],sourceText=read(0x518f78),displayText=read(0x568258),actors=[list(u.mem_read(0x577f08+j*256,256)) for j in range(4)]),events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-display.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkDisplay} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actors=q.state.actors.map(a=>Uint8Array.from(a));const got=originalRemarkDisplay(q,(e,s)=>{s.sourceText=q.name;if(q.mutate){s.actors[q.actorId][0x21]=254;s.priority=241;}return s;});got.state.actors=got.state.actors.map(a=>[...a]);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native remark-display cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-display.json').write_text(json.dumps(rows[:80],separators=(',',':'))+'\n')
