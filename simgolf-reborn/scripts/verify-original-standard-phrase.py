"""Native dispatch and supported cases, with explicit name/location helper boundaries."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBX,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x46c140,0x2c),(0x466e30,0x6c),(0x469330,0x2e10),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
events=[]
def hook(u,a,size,data):
 if a not in [0x46c140,0x466e30,0x466fb0,0x4074d0]:return
 if a in [0x466e30,0x46c140]:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4,4))[0]]));return
 sp=u.reg_read(UC_X86_REG_ESP);args=list(struct.unpack('<'+'i'*(2 if a==0x466fb0 else 3),u.mem_read(sp+4,8 if a==0x466fb0 else 12)));events.append(dict(address=a,args=args))
 text=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii')+('Name'+str(args[0]) if a==0x466fb0 else 'Place'+str(args[2]))
 u.mem_write(0x518f78,text.encode()+b'\0');put(0x589be8,12345)
for a in [0x466fb0,0x4074d0]:u.mem_write(a,b'\xc3')
u.hook_add(UC_HOOK_CODE,hook)
rows=[]
kinds=[39,51,52,53,2,4,26,31,34,40,42,44,6,8,9,12,14,15,16,17,18,20,21,24,25,27,29,32,33,43,45,46,48,55,56,57,36,41,47,63,64,65,0,-1,66,-2147483648]
for kind in kinds:
 for i in range(384):
  id=i%16;record=[0]*256;record[0x18]=(i*17)%256;record[0xb6]=i%256
  profile=[-32768,-17,-8,-1,0,1,2,3,4,5,6,7,8,32767][i%14];record[0xb6:0xb8]=list(struct.pack('<h',profile))
  if i<128:record[0xb6:0xb8]=[i,0]
  if kind==39:record[0xb6:0xb8]=[i%8,0]
  if kind in [2,4,26]:
   record[0xae:0xb0]=list(struct.pack('<h',[-32768,-3,-1,0,1,2,3,4,5,32767][i%10]));record[0xa2:0xa4]=list(struct.pack('<h',id^1))
  prefix=['','Near ','Start\0ignored'][i%3];mode=[-1,0,1,2,2147483647][i%5];value=[-1,0,1,2,256][i%5]
  if i<128:value=[-1,0,1,256][i%4]
  q=dict(kind=kind,actorId=id,value=value,originalMode=mode,state=dict(sourceText=prefix,remarkStyle=i,redirected=bool(i%2),actors={str(id):record}))
  if kind==39:
   profile=[0]*560;profile[0x21]=i%256;q['profileRecords']={str(i%8):profile};u.mem_write(0x4d5040+(i%8)*560,bytes(profile))
  if kind in [51,52,53]:
   q['originalClock']=[-2147483648,-17,-1,0,1,7,8,15,2147483647][i%9];q['facilityLevels']={name:[-1,0,1,2,3,4,2147483647][(i//9+j)%7] for j,name in enumerate(['drivingRange','proShop','puttingGreen'])}
   put(0x831828,q['originalClock'])
   for name,address in [('drivingRange',0x5a76a8),('proShop',0x5a76a0),('puttingGreen',0x5a7698)]:put(address,q['facilityLevels'][name])
  u.mem_write(0x577f08+id*256,bytes(record));u.mem_write(0x518f78,prefix.encode()+b'\0');put(0x589be8,i);put(0x820344,mode);put(0x53f8b8,int(q['state']['redirected']));before=bytes(u.mem_read(0x518f78,512));events=[]
  u.reg_write(UC_X86_REG_ESP,0x102000);put(0x102000+0x4e4,value);put(0x102000+0x4ec,id);u.reg_write(UC_X86_REG_EBX,id);u.reg_write(UC_X86_REG_EDX,kind&0xffffffff)
  u.emu_start(0x469380,0x46bc7e,count=10000);assert u.reg_read(UC_X86_REG_EIP)==0x46bc7e
  expected=json.loads(json.dumps(q['state']));expected['sourceText']=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii');expected['remarkStyle']=struct.unpack('<I',u.mem_read(0x589be8,4))[0]
  # With no appends, the JS buffer may retain data beyond C-string termination.
  if bytes(u.mem_read(0x518f78,512))==before:expected['sourceText']=prefix
  expected['redirected']=bool(struct.unpack('<I',u.mem_read(0x53f8b8,4))[0])
  rows.append([q,dict(state=expected,events=events,next='postprocess')])
module=(root/'simgolf-reborn/scene/src/simulation/original-standard-phrase.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalStandardPhrase} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){if(q.profileRecords)for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);for(const s of [q.state,expected.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);const got=originalStandardPhrase(q,(e,s)=>({...s,remarkStyle:12345,sourceText:s.sourceText.split('\\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[2])}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({kind:q.kind,value:q.value,expected:{...expected,state:{...expected.state,actors:null}},got:{...got,state:{...got.state,actors:null}}}));}console.log(`${rows.length} native standard-phrase cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
# Retain each combination that changes text/style within each dispatch case.
seen=set();fixture=[]
for row in rows:
 q,out=row;key=(q['kind'],out['state']['sourceText'],out['state']['remarkStyle'])
 if key not in seen:seen.add(key);fixture.append(row)
(root/'simgolf-reborn/scene/tests/fixtures/original-standard-phrase.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
