"""Compare the complete per-kind reaction switch and its ordered call boundaries."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x467502,0x870),(0x469080,0xdd),(0x46c140,0x2c)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v))
def get(a,fmt='<i'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
for a in (0x40c1f0,0x4a0000):u.mem_write(a,b'\xc3')
q=None;events=[]
def hook(u,a,size,data):
 if a not in (0x46c140,0x40c1f0,0x4a0000):return
 sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4+i*4) for i in range(4 if a==0x40c1f0 else 1)]
 events.append(dict(address=a,args=args))
 if q['mutate']:
  if a==0x40c1f0:put(0x577fbe,1,'<h');put(0x577f25,99,'<B')
  if a==0x4a0000:put(0x577f26,88,'<B')
 if a!=0x46c140:u.reg_write(UC_X86_REG_EAX,0)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1320):
 kind=i%66;a=bytearray(rng.randrange(256) for _ in range(256))
 struct.pack_into('<ii',a,0,1024,3072);a[0x21]=1;struct.pack_into('<h',a,0xb6,0)
 for offset in (0xa6,0xa8,0xaa):struct.pack_into('<h',a,offset,rng.choice([-1,7,8,59,60,61]))
 flags=rng.choice([0,0x20000]);struct.pack_into('<I',a,0x10,flags)
 q=dict(kind=kind,value=0 if i%3 else 1,difficulty=(i//66)%4,actorId=0,voiceBase=rng.randrange(16),terrainCode=17 if i%2 else 2,voice=i%2,mutate=i%3==0,state=dict(actor=list(a),profiles={'0':rng.randrange(8),'1':rng.randrange(8)},holeBytes={'0:1':i%2}))
 q['state']['profileVoiceBytes']={'0':rng.randrange(256),'1':rng.randrange(256)}
 sp=0x102000;u.mem_write(0x577f08,bytes(a))
 for address,value in [(sp+0x124,0),(sp+0x128,kind),(sp+0x12c,q['value']),(0x820344,q['difficulty'])]:put(address,value)
 put(0x570d38+53,q['terrainCode'],'<B');put(0x583434,q['state']['holeBytes']['0:1'],'<B')
 for k,v in q['state']['profiles'].items():put(0x4d5060+int(k)*560,v,'<B')
 for k,v in q['state']['profileVoiceBytes'].items():put(0x4d5061+int(k)*560,v,'<B')
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,999);u.reg_write(UC_X86_REG_ESI,q['voiceBase'])
 events=[];u.emu_start(0x467502,0x467d72,count=1000);assert u.reg_read(UC_X86_REG_EIP)==0x467d72
 delta=u.reg_read(UC_X86_REG_EBX);delta=delta if delta<2**31 else delta-2**32
 state={**q['state'],'actor':list(u.mem_read(0x577f08,256))}
 rows.append([q,dict(state=state,delta=delta,events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-selection.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkSelection} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actor=Uint8Array.from(q.state.actor);const got=originalRemarkSelection(q,(event,state)=>{const v=new DataView(state.actor.buffer);if(q.mutate){if(event.address===0x40c1f0){v.setInt16(0xb6,1,true);state.actor[0x1d]=99;}if(event.address===0x4a0000)state.actor[0x1e]=88;}return {state,result:event.address===0x46c140?q.voice:0};});got.state.actor=[...got.state.actor];if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native per-kind selection cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-selection.json').write_text(json.dumps(rows[:264],separators=(',',':'))+'\n')
