"""Continuous original explanation flow with personal phrases and controlled name/location/popup boundaries."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x46806a,0x102b),(0x469160,0xe9),(0x469330,0x3008),(0x46c104,58),(0x45b090,0xbd),(0x46c140,0x2c),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
for a in [0x466fb0,0x4074d0,0x40c7f0,0x4a5c60]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,1024)).split(b'\0')[0].decode()
events=[];phraseEvents=[];phase='explanation'
def hook(u,a,size,data):
 global phase
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x469330:
  events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))));phase='phrase';return
 if a==0x4681a1:phase='explanation';return
 if a==0x4a5c60:
  pointer,needle=struct.unpack('<II',u.mem_read(sp+4,8));idx=read(pointer).find(read(needle));u.reg_write(UC_X86_REG_EAX,0 if idx<0 else pointer+idx);return
 if a not in [0x46c140,0x466fb0,0x4074d0,0x40c7f0]:return
 n=1 if a==0x46c140 else 2 if a==0x466fb0 else 3;fmt='<Iii' if a==0x40c7f0 else '<'+'i'*n;args=list(struct.unpack(fmt,u.mem_read(sp+4,n*4)));(phraseEvents if phase=='phrase' else events).append(dict(address=a,args=args))
 if a in [0x466fb0,0x4074d0]:text(0x518f78,read(0x518f78)+('Name'+str(args[0]) if a==0x466fb0 else 'Place'+str(args[0])+','+str(args[1])));put(0x589be8,91)
 if a==0x40c7f0:u.reg_write(UC_X86_REG_EAX,q['popupResult'])
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for kind in range(1,66):
 for i in range(24):
  actor=bytearray(256);struct.pack_into('<ii',actor,8,300,250);actor[0x21]=1;actor[0x22]=i%10;partner=bytearray(256);partner[0xb6]=1;profile=bytearray(560);profile[0x21]=128 if i%2 else 0;value=[-1,0,1,2][i%4];phrase='MYNAME by DATA with PARTNER'
  q=dict(kind=kind,value=value,actorId=0,selectedDelta=[-3,-1,0,1][i%4],difficulty=i%3,popupResult=i%2,requestCodes=[kind,255],profilePhrases=[[phrase]],profileRecords={'0':list(profile)},terms={str(value):dict(name='Ground',alternate='Tree',type=13 if i%3 else 0)},objectNames={str(value):'Object'},labels={str(value):'Label'},state=dict(actors={'0':list(actor),'1':list(partner)},sourceText='Previous',remarkStyle=5,redirected=True,originalClock=500 if i%7==0 else 1000,lastExplanationClock=0,explanationMaskLow=0,explanationMaskHigh=0,interfaceFlags=0 if i%5==0 else 4))
  u.mem_write(0x577f08,bytes(actor));u.mem_write(0x578008,bytes(partner));u.mem_write(0x4d5040,bytes(profile));u.mem_write(0x4c1d00,bytes(q['requestCodes']));text(0x542c20,phrase);text(0x576da0+48*value,'Ground');text(0x576db0+48*value,'Tree');u.mem_write(0x576dc6+48*value,bytes([q['terms'][str(value)]['type']]));text(0x55c648+37*value,'Object');text(0x4c0990+18*value,'Label');text(0x518f78,'Previous');put(0x589be8,5);put(0x53f8b8,1)
  for a,v in [(0x831828,q['state']['originalClock']),(0x55d4bc,0),(0x59aadc,0),(0x570788,0),(0x820344,q['difficulty'])]:put(a,v)
  u.mem_write(0x5a4448,bytes([q['state']['interfaceFlags']]));sp=0x104000;put(sp+0x124,0);put(sp+0x128,kind);put(sp+0x12c,value);put(sp+0x18,q['selectedDelta']);put(sp+0x1c,kind-1);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);events=[];phraseEvents=[];phase='explanation'
  u.emu_start(0x46806a,0x469075,count=20000);assert u.reg_read(UC_X86_REG_EIP)==0x469075
  s=json.loads(json.dumps(q['state']));s.update(sourceText=read(0x518f78),remarkStyle=get(0x589be8),redirected=bool(get(0x53f8b8)),lastExplanationClock=get(0x55d4bc),explanationMaskLow=get(0x59aadc),explanationMaskHigh=get(0x570788))
  rows.append([q,dict(state=s,events=events,phraseEvents=phraseEvents,pronoun=None if kind==50 else read(sp+0x10))])
module=(root/'simgolf-reborn/scene/src/simulation/original-complete-explanation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalCompleteExplanation} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const s of [q.state,expected.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);const got=originalCompleteExplanation(q,(e,s)=>({...s,remarkStyle:91,sourceText:s.sourceText.split('\\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[0]+','+e.args[1])}),undefined,(e,s)=>({state:s,result:q.popupResult}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native complete-explanation cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-complete-explanation.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
