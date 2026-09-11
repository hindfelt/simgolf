"""Execute contiguous selection and reaction stages, including real positional speech/projection and controlled terrain/playback."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_MEM_INVALID,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x40c1f0,0x1e7),(0x42f270,0x485),(0x4c1f94,36),(0x467502,0xb68),(0x469080,0xdd),(0x46c140,0x2c),(0x4a0000,1),(0x466a20,0x19),(0x466a00,0x20),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v))
def get(a,fmt='<I'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def invalid(u,access,address,size,value,data):
 print('invalid',hex(address),'at',hex(u.reg_read(UC_X86_REG_EIP)),flush=True);return False
u.hook_add(UC_HOOK_MEM_INVALID,invalid)
events=[];soundEvents=[];soundReturn=None;draws=0;effectMutation=False
for address in (0x447a30,0x42eb90,0x40bcd0):u.mem_write(address,b'\xc3')
def hook(u,a,size,data):
 global soundReturn,draws
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==soundReturn:soundReturn=None
 if a==0x45bab0:draws+=1
 if a==0x42eb90:put(get(sp+12),0);put(get(sp+16),q['terrain']['object']&0xffffffff)
 if a==0x40bcd0:u.reg_write(UC_X86_REG_EAX,q['terrain']['corners'][str(get(sp+12))]&0xffffffff)
 if a in (0x46c140,0x40c1f0,0x4a0000):
  events.append(dict(address=a,args=[get(sp+4+j*4,'<i') for j in range(4 if a==0x40c1f0 else 1)]))
  if a==0x40c1f0:soundReturn=get(sp)
 if a==0x469075:u.emu_stop()
 if a==0x447a30:
  event=dict(address=a,args=[get(sp+4+j*4,'<i') for j in range(5)])
  soundEvents.append(event)
  if soundReturn is None:events.append(event)
  if effectMutation:put(0x577f20,0x40,'<B');put(0x820454,777)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1320):
 a=bytearray(rng.randrange(256) for _ in range(256));a[0x18]=rng.choice([0,0,0x20,0x40,0x60]);a[0x21]=1
 struct.pack_into('<ii',a,0,1024,3072)
 flags=rng.choice([0,0x20000000,0x40000,0x20040000]);struct.pack_into('<I',a,0x10,flags)
 kind=i%66
 if i%3==0:a[0x71]=kind
 q=dict(kind=kind,value=rng.randrange(-100000,100000),delta=rng.choice([-3,-2,-1,-1,0,1,2]),reactionMode=rng.randrange(3),difficulty=rng.randrange(4),globalFlags=0x4000000 if i%7==0 else 0,terrainCode=17 if i%11==0 else 2,state=dict(actor=list(a),seed=rng.randrange(2**32),holeTotal=rng.randrange(-32768,32768),remarkCount=rng.randrange(65536),remarkValue=rng.randrange(65536),tileFlags=rng.choice([0,0,0,0x400,0x800,0x1000]),tileGrowth=rng.randrange(256),worldDirty=0,positive=rng.randrange(256),negative=rng.randrange(256)))
 struct.pack_into('<h',a,0xb6,0);q['state']['actor']=list(a)
 q['voice']=i%2;q['voiceBase']=rng.randrange(16)
 q['state']['profiles']={'0':rng.randrange(8),'1':rng.randrange(8)};q['state']['holeBytes']={'0:1':i%2}
 q['state']['profileVoiceBytes']={'0':rng.randrange(256),'1':rng.randrange(256)}
 q['actorId']=0;q['selectedActorId']=i%2;q['effectMutation']=i%3==0
 before=bytearray(a);before[0x18]=rng.choice([0,1,0x40]);q['before']=list(before)
 q['camera']=dict(cameraX=rng.choice([1,20]),cameraZ=rng.choice([3,20]),scale=rng.choice([1,2,4,8]),width=800,height=600,rotation=[0,2,4,6][i%4],heightScale=16,magnify=bool(i%3))
 q['zoom']=bool(i%2);q['terrain']=dict(flags=[0,2,4,8][i%4],object=4,stored=5,corners={'1':3,'3':5,'5':4,'7':6})
 q['state']['queued']=i%2;q['state']['sequenceIndex']=i%72
 s=q['state']
 if kind==64:s['holeTotal']=s['remarkCount'] if s['remarkCount']<32768 else s['remarkCount']-65536
 sp=0x102000;idx=53;h=520
 u.mem_write(sp+0x20,bytes(before));put(sp+0x124,0);put(0x5a4440,q['selectedActorId'])
 u.mem_write(0x577f08,bytes(a))
 put(0x583434,i%2,'<B')
 for k,v in s['profiles'].items():put(0x4d5060+int(k)*560,v,'<B')
 for k,v in q['state']['profileVoiceBytes'].items():put(0x4d5061+int(k)*560,v,'<B')
 for address,value in [(sp+0x128,kind),(sp+0x12c,q['value']&0xffffffff),(sp+0x18,q['delta']&0xffffffff),(0x542c04,q['reactionMode']),(0x820344,q['difficulty']),(0x59d208,q['globalFlags']),(0x820454,s['seed']),(0x542c14,s['worldDirty'])]:put(address,value)
 for address,value in [(0x574658+h,s['holeTotal']&65535),(0x5745d8+h+kind*2,s['remarkCount']),(0x57466c+h+kind*2,s['remarkValue']),(0x53ba00+idx*2,s['tileFlags'])]:put(address,value,'<H')
 for address,value in [(0x570d38+idx,q['terrainCode']),(0x577254+idx,s['tileGrowth']),(0x5a4dc0+idx,s['positive']),(0x56b234+idx,s['negative'])]:put(address,value,'<B')
 c=q['camera']
 for address,value in [(0x4c1b98,c['cameraX']),(0x4c1b9c,c['cameraZ']),(0x4c183c,c['scale']),(0x820348,c['width']),(0x82034c,c['height']),(0x5672a4,c['rotation']),(0x4c1df0,c['heightScale']),(0x5a8708,c['magnify']),(0x5a8704,q['zoom']),(0x5a8720,s['queued']),(0x5a8724,s['sequenceIndex']),(0x576dcc+q['terrainCode']*48,q['terrain']['flags'])]:put(address,value)
 put(0x541f28+idx,q['terrain']['stored'],'<B')
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['delta']&0xffffffff)
 u.reg_write(UC_X86_REG_ESI,q['voiceBase'])
 events=[];soundEvents=[];soundReturn=None;draws=0;effectMutation=q['effectMutation']
 u.emu_start(0x467502,0x46806a,count=6000);end=u.reg_read(UC_X86_REG_EIP);assert end in (0x46806a,0x469075)
 delta=u.reg_read(UC_X86_REG_EBX);delta=delta if delta<2**31 else delta-2**32
 result=dict(state=dict(actor=list(u.mem_read(0x577f08,256)),seed=get(0x820454),holeTotal=get(0x574658+h,'<h'),remarkCount=get(0x5745d8+h+kind*2,'<H'),remarkValue=get(0x57466c+h+kind*2,'<H'),tileFlags=get(0x53ba00+idx*2,'<H'),tileGrowth=get(0x577254+idx,'<B'),worldDirty=get(0x542c14,'<i'),positive=get(0x5a4dc0+idx,'<B'),negative=get(0x56b234+idx,'<B')),delta=delta,randomDraws=draws,next='return' if end==0x469075 else 'continue',events=events)
 result['soundEvents']=soundEvents;result['state']['queued']=get(0x5a8720);result['state']['sequenceIndex']=get(0x5a8724,'<i')
 result['state']['profileVoiceBytes']=s['profileVoiceBytes'];result['state']['profiles']=s['profiles'];result['state']['holeBytes']=s['holeBytes']
 result['selectedDelta']=get(sp+0x18,'<i') if end!=0x469075 else 0
 rows.append([q,result])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-adjustment.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalAudibleRemarkAdjustment} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actor=Uint8Array.from(q.state.actor);q.before=Uint8Array.from(q.before);const got=originalAudibleRemarkAdjustment(q,()=>({camera:q.camera,zoom:q.zoom,map:{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:()=>q.terrain.object,cornerHeight:(c,r,d)=>q.terrain.corners[d]}}),(event,state)=>{if(q.effectMutation){state.actor[0x18]=0x40;state.seed=777;}return state;});got.state.actor=[...got.state.actor];if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native audible adjustment cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-audible-remark.json').write_text(json.dumps(rows[:132],separators=(',',':'))+'\n')
