"""Continuous conditional completion remark through reset, actual remark/audio/popup; controlled terrain/playback/text boundaries."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x426e6b,0xc5),(0x40c1f0,0x1e7),(0x42f270,0x485),(0x4c1f94,36),(0x4672d0,0xe90),(0x469080,0xdd),(0x4a0000,1),(0x466a20,0x19),(0x466a00,0x20),(0x406b20,0x1c9),(0x466fb0,0x320),(0x40c7f0,0xf7),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x46806a,0x102b),(0x469160,0xe9),(0x469330,0x3008),(0x46c104,58),(0x45b090,0xbd),(0x46c140,0x2c),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
for a in [0x42eb90,0x40bcd0,0x4acb95,0x447a30,0x4074d0,0x4a5c60]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,1024)).split(b'\0')[0].decode()
events=[];phraseEvents=[];phase='explanation'
def hook(u,a,size,data):
 global phase,enteredExplanation,explanationSeed,soundReturn,audioDraws
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==soundReturn:soundReturn=None
 if a==0x40c1f0:soundReturn=get(sp)
 if a==0x45bab0 and soundReturn is not None:audioDraws+=1
 if a==0x42eb90:put(get(sp+12),0);put(get(sp+16),q['terrain']['object']);return
 if a==0x40bcd0:u.reg_write(UC_X86_REG_EAX,q['terrain']['corners'][str(get(sp+12))]);return
 if a==0x447a30:soundEvents.append(dict(address=a,args=list(struct.unpack('<iiiii',u.mem_read(sp+4,20)))));return
 if a==0x46806a:
  enteredExplanation=True;explanationSeed=get(0x820454);phase='explanation';return
 if a==0x467502:
  q['reactionContext']=dict(difficulty=q['difficulty'],reactionMode=0,selectedActorId=-1,terrainCode=2,state=dict(seed=get(0x820454),worldDirty=0,holeTotal=0,remarkCount=0,remarkValue=0,tileFlags=0,tileGrowth=0,positive=0,negative=0));return
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x4acb95:
  value,buffer,base=struct.unpack("<iii",u.mem_read(sp+4,12));assert base==10;text(buffer,str(value));u.reg_write(UC_X86_REG_EAX,buffer);return
 if a==0x469330:
  events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))));phase='phrase';return
 if a==0x4681a1:phase='explanation';return
 if a==0x4a5c60:
  pointer,needle=struct.unpack('<II',u.mem_read(sp+4,8));idx=read(pointer).find(read(needle));u.reg_write(UC_X86_REG_EAX,0 if idx<0 else pointer+idx);return
 if a not in [0x46c140,0x466fb0,0x4074d0,0x40c7f0]:return
 n=1 if a==0x46c140 else 2 if a==0x466fb0 else 3;fmt='<Iii' if a==0x40c7f0 else '<'+'i'*n;args=list(struct.unpack(fmt,u.mem_read(sp+4,n*4)));(phraseEvents if phase=='phrase' else events).append(dict(address=a,args=args))
 if a==0x4074d0:text(0x518f78,read(0x518f78)+('Name'+str(args[0]) if a==0x466fb0 else 'Place'+str(args[0])+','+str(args[1])));put(0x589be8,91)

u.hook_add(UC_HOOK_CODE,hook);rows=[]
for kind in [19]:
 for i in range(192):
  actor=bytearray(256);struct.pack_into('<ii',actor,8,300,250);actor[0x21]=1;actor[0x22]=i%10;partner=bytearray(256);partner[0xb6]=1;profile=bytearray(560);profile[0x21]=128 if i%2 else 0;value=[-1,0,1,2][i%4];phrase='MYNAME by DATA with PARTNER'
  q=dict(kind=kind,value=value,actorId=0,selectedDelta=[-3,-1,0,1][i%4],difficulty=i%3,popupResult=i%2,requestCodes=[kind,255],profilePhrases=[[phrase]],profileRecords={'0':list(profile)},terms={str(value):dict(name='Ground',alternate='Tree',type=13 if i%3 else 0)},objectNames={str(value):'Object'},labels={str(value):'Label'},state=dict(actors={'0':list(actor),'1':list(partner)},sourceText='Previous',remarkStyle=5,redirected=True,originalClock=500 if i%7==0 else 1000,lastExplanationClock=0,explanationMaskLow=0,explanationMaskHigh=0,interfaceFlags=0 if i%5==0 else 4))
  q['names']={'profileNames':['Gary','Bob']};q['state'].update(popupActive=1 if i%3==0 else 0,popupPending=1 if i%11==0 else 0,popupMode=3 if i%13==0 else 0,popupStyle=0,popupActor=-1,popupLifetime=9,popupDuration=23,popupX=7,popupY=11,seed=123+i,popupText='Previous popup')
  for key,a in [('popupPending',0x53ce64),('popupMode',0x566a0c),('popupStyle',0x5a1f38),('popupActor',0x4c1df8),('popupLifetime',0x5a5b8c),('popupDuration',0x568154),('popupX',0x56bbf8),('popupY',0x56bbfc),('seed',0x820454)]:put(a,q['state'][key])
  u.mem_write(0x568148,bytes([q['state']['popupActive']]));text(0x5a5788,'Previous popup')
  q['camera']=dict(cameraX=20 if i%7==0 else 1,cameraZ=20 if i%7==0 else 3,scale=[1,2,4,8][i%4],width=800,height=600,rotation=[0,2,4,6][i%4],heightScale=16,magnify=bool(i%3))
  q['zoom']=bool(i%2);q['terrain']=dict(flags=[0,2,4,8][i%4],object=4,stored=5,corners={'1':3,'3':5,'5':4,'7':6})
  q['state'].update(queued=i%2,sequenceIndex=i%36)
  c=q['camera']
  for address,audioValue in [(0x4c1b98,c['cameraX']),(0x4c1b9c,c['cameraZ']),(0x4c183c,c['scale']),(0x820348,800),(0x82034c,600),(0x5672a4,c['rotation']),(0x4c1df0,16),(0x5a8708,c['magnify']),(0x5a8704,q['zoom']),(0x5a8720,q['state']['queued']),(0x5a8724,q['state']['sequenceIndex']),(0x576dcc+2*48,q['terrain']['flags'])]:put(address,audioValue)
  u.mem_write(0x541f28+53,bytes([5]))
  q['profileHistory']={'0':[0]*44};u.mem_write(0x583433,bytes(44))
  q['globalFlags']=0;q['holeRecords']={'1':[0]*520};q['state'].update(priority=0,displayText='Previous display',requestValues=[0]*66)
  q['state']['actors']['0'][:8]=list(struct.pack('<ii',1024,3072));actor[:8]=struct.pack('<ii',1024,3072)
  u.mem_write(0x5744f8+520,bytes(520));put(0x59d208,0);put(0x542c14,0);put(0x542c04,0);put(0x5a4440,-1)
  for a,v in [(0x570d38+53,2),(0x577254+53,0),(0x5a4dc0+53,0),(0x56b234+53,0),(0x5a8718,0)]:u.mem_write(a,bytes([v]))
  u.mem_write(0x53ba00+106,bytes(2));text(0x568258,'Previous display')
  for j in range(66):put(0x836460+j*4,0)
  u.mem_write(0x577f08,bytes(actor));u.mem_write(0x578008,bytes(partner));u.mem_write(0x4d5040,bytes(profile));u.mem_write(0x4c1d00,bytes(q['requestCodes']));text(0x542c20,phrase);text(0x576da0+48*value,'Ground');text(0x576db0+48*value,'Tree');u.mem_write(0x576dc6+48*value,bytes([q['terms'][str(value)]['type']]));text(0x55c648+37*value,'Object');text(0x4c0990+18*value,'Label');text(0x518f78,'Previous');put(0x589be8,5);put(0x53f8b8,1)
  text(0x4d5050,'Gary');text(0x4d5050+560,'Bob')
  for a,v in [(0x831828,q['state']['originalClock']),(0x55d4bc,0),(0x59aadc,0),(0x570788,0),(0x820344,q['difficulty'])]:put(a,v)
  u.mem_write(0x5a4448,bytes([q['state']['interfaceFlags']]));sp=0x104000;put(sp+0x124,0);put(sp+0x128,kind);put(sp+0x12c,value);put(sp+0x18,q['selectedDelta']);put(sp+0x1c,kind-1);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);events=[];phraseEvents=[];phase='entry';enteredExplanation=False;explanationSeed=None;soundReturn=None;audioDraws=0;soundEvents=[]
  actor[0x84]=1 if i%4==0 else 0;struct.pack_into('<h',actor,0xa4,value);actor[0x24]=actor[0x22];struct.pack_into('<i',actor,0xc0,i-80)
  q['state']['actors']['0']=list(actor);u.mem_write(0x577f08,bytes(actor))
  q['holeRecords']['2']=[0]*520
  if i%3==0:
   struct.pack_into('<i',h:=bytearray(q['holeRecords']['1']),0x28,10);h[8]=3;q['holeRecords']['1']=list(h);q['holeRecords']['2'][0]=4
  actualKind=23 if i%3==0 and actor[0x22]>4 else 19
  q['requestCodes']=[actualKind,255];u.mem_write(0x4c1d00,bytes(q['requestCodes']))
  for hid,h in q['holeRecords'].items():u.mem_write(0x5744f8+int(hid)*520,bytes(h))
  q['clock']=q['state']['originalClock'];q['state'].update(holeRecords=q['holeRecords'],completionProfiles={'0':[0]*44},completionMarkers=[0]*(64*76),worldDirty=0,difficulty=q['difficulty'],reactionMode=0,selectedActorId=-1,globalFlags=0,terrain=[2]*64,tileFlags=[0]*64,tileGrowth=[0]*64,positive=[0]*64,negative=[0]*64)
  u.mem_write(0x583432,bytes(44));u.mem_write(0x5842b2,bytes(64*76))
  u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,0);u.reg_write(UC_X86_REG_EBP,0)
  try:u.emu_start(0x426e6b,0x426f30,count=50000)
  except Exception:
   print(kind,i,hex(u.reg_read(UC_X86_REG_EIP)),flush=True);raise
  assert u.reg_read(UC_X86_REG_EIP)==0x426f30
  s=json.loads(json.dumps(q['state']));s.update(sourceText=read(0x518f78),remarkStyle=get(0x589be8),redirected=bool(get(0x53f8b8)),lastExplanationClock=get(0x55d4bc),explanationMaskLow=get(0x59aadc),explanationMaskHigh=get(0x570788))
  for key,a in [('popupPending',0x53ce64),('popupMode',0x566a0c),('popupStyle',0x5a1f38),('popupLifetime',0x5a5b8c),('popupX',0x56bbf8),('popupY',0x56bbfc),('seed',0x820454)]:s[key]=get(a)
  s['popupActor']=struct.unpack('<i',u.mem_read(0x4c1df8,4))[0];s['popupDuration']=struct.unpack('<i',u.mem_read(0x568154,4))[0];s['popupActive']=u.mem_read(0x568148,1)[0];s['popupText']=read(0x5a5788)
  s['actors']={j:list(u.mem_read(0x577f08+int(j)*256,256)) for j in q['state']['actors']};s['priority']=u.mem_read(0x5a8718,1)[0];s['displayText']=read(0x568258);s['requestValues']=[struct.unpack('<i',u.mem_read(0x836460+j*4,4))[0] for j in range(66)]
  s['queued']=get(0x5a8720);s['sequenceIndex']=get(0x5a8724)
  s['holeRecords']={hid:list(u.mem_read(0x5744f8+int(hid)*520,520)) for hid in q['holeRecords']}
  s['completionProfiles']={'0':list(u.mem_read(0x583432,44))};s['completionMarkers']=list(u.mem_read(0x5842b2,64*76))
  s['worldDirty']=struct.unpack('<i',u.mem_read(0x542c14,4))[0]
  for key,address,size in [('tileFlags',0x53ba00+106,2),('tileGrowth',0x577254+53,1),('positive',0x5a4dc0+53,1),('negative',0x56b234+53,1)]:s[key][53]=int.from_bytes(u.mem_read(address,size),'little')
  rows.append([q,dict(state=s)])
module=(root/'simgolf-reborn/scene/src/simulation/original-audible-after-fee-completion.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalAudibleAfterFeeCompletion} from MODULE;import {originalActorName} from NAMES;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const s of [q.state,expected.state]){for(const field of ['actors','holeRecords','completionProfiles'])for(const id in s[field])s[field][id]=Uint8Array.from(s[field][id]);for(const field of ['completionMarkers','terrain','tileGrowth','positive','negative'])s[field]=Uint8Array.from(s[field]);s.tileFlags=Uint16Array.from(s.tileFlags);}for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);const result=originalAudibleAfterFeeCompletion(q,{resolvePhrase:(e,s)=>{if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}return {...s,remarkStyle:91,sourceText:s.sourceText.split('\\0',1)[0]+'Place'+e.args[0]+','+e.args[1]};},audioContext:()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),playback:(e,s)=>s});const got={state:result.state};if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native audible completion cases matched`);""".replace('MODULE',json.dumps(module)).replace('NAMES',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-name.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-audible-after-fee-completion.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
