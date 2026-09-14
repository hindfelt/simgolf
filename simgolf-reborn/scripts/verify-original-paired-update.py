"""Native paired actor gates and writes, retaining original distance helper."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x406dd0,0x465c40]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];probe=0
def hook(u,a,size,data):
 if a in [0x406dd0,0x465c40]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(3 if a==0x406dd0 else 2)]))
  if a==0x406dd0:u.reg_write(UC_X86_REG_EAX,probe)
  else:put(0x577f18,8)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[];triggered=0
for i in range(2000):
 q=dict(actorId=0,phaseCounter=192,lastPairClock=0,modeByte=0,detailLevel=4)
 actors=[bytearray(256),bytearray(256)]
 for j,a in enumerate(actors):
  struct.pack_into('<iiiiI',a,8,20000+j*100,20000,200,200,0x100000)
  a[0x25]=7;a[0x29]=1;struct.pack_into('<h',a,0xaa,1-j);struct.pack_into('<h',a,0xba,4)
 if i%2:
  kind=i%15
  if kind==0:struct.pack_into('<I',actors[0],0x18,0)
  if kind==1:q['phaseCounter']=193
  if kind==2:actors[1][0x29]=2
  if kind==3:actors[0][0x25]=255
  if kind==4:actors[1][0x25]=16
  if kind==5:q['lastPairClock']=42
  if kind==6:q['modeByte']=1
  if kind==7:q['detailLevel']=3
  if kind==8:struct.pack_into('<i',actors[0],0x10,50)
  if kind==9:struct.pack_into('<i',actors[0],0x14,450)
  if kind==10:struct.pack_into('<i',actors[1],8,45000)
  if kind==11:struct.pack_into('<I',actors[0],0x18,0x300000)
  if kind==12:actors[0][0x29]=actors[1][0x29]=19;struct.pack_into('<h',actors[0],0xba,0)
  if kind==13:q['lastPairClock']=0xffffff00
  if kind==14:struct.pack_into('<h',actors[0],0xba,-7)
 q['actors']=[list(a) for a in actors];probe=i%3
 for j,a in enumerate(actors):u.mem_write(0x577f00+j*256,bytes(a))
 for a,v in [(0x831828,q['phaseCounter']),(0x599a98,q['lastPairClock']),(0x4c183c,q['detailLevel'])]:put(a,v)
 u.mem_write(0x568148,bytes([q['modeByte']]));calls=[]
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,0);u.emu_start(0x428272,0x42841a,count=10000)
 did=any(c['address']==0x465c40 for c in calls);triggered+=did
 expected=dict(state={**q,'actors':[list(u.mem_read(0x577f00+j*256,256)) for j in range(2)]},calls=calls,triggered=did)
 rows.append(dict(q=q,probe=probe,expected=expected))
assert triggered>500
module=(root/'simgolf-reborn/scene/src/simulation/original-paired-update.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalPairedUpdate}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(a=>Uint8Array.from(a));const a=originalPairedUpdate(r.q,(e,s)=>{if(e.address===0x465c40)new DataView(s.actors[0].buffer).setUint32(0x18,8,true);return {state:s,result:e.address===0x406dd0?r.probe:0};});a.state.actors=a.state.actors.map(a=>Array.from(a));if(!isDeepStrictEqual(a,r.expected))throw Error(JSON.stringify({r,a}));}console.log('2000 native paired-update cases match, including actual distance and callback flag rereads.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
