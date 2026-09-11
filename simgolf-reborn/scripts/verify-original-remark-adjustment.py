"""Execute contiguous selection and reaction stages, with an explicit controlled sound boundary."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_MEM_INVALID,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x467502,0xb68),(0x469080,0xdd),(0x46c140,0x2c),(0x466a20,0x19),(0x466a00,0x20),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v))
def get(a,fmt='<I'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def invalid(u,access,address,size,value,data):
 print('invalid',hex(address),'at',hex(u.reg_read(UC_X86_REG_EIP)),flush=True);return False
u.hook_add(UC_HOOK_MEM_INVALID,invalid)
events=[];effectMutation=False
for address in (0x447a30,0x40c1f0,0x4a0000):u.mem_write(address,b'\xc3')
def hook(u,a,size,data):
 if a in (0x46c140,0x40c1f0,0x4a0000):
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[get(sp+4+j*4,'<i') for j in range(4 if a==0x40c1f0 else 1)]))
  if effectMutation and a==0x40c1f0:put(0x577fbe,1,'<h');put(0x577f25,99,'<B')
  if effectMutation and a==0x4a0000:put(0x577f26,88,'<B')
  if a!=0x46c140:u.reg_write(UC_X86_REG_EAX,0)
 if a==0x469075:u.emu_stop()
 if a==0x447a30:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[get(sp+4+j*4) for j in range(5)]))
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
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['delta']&0xffffffff)
 u.reg_write(UC_X86_REG_ESI,q['voiceBase'])
 events=[];effectMutation=q['effectMutation']
 u.emu_start(0x467502,0x46806a,count=2500);end=u.reg_read(UC_X86_REG_EIP);assert end in (0x46806a,0x469075)
 delta=u.reg_read(UC_X86_REG_EBX);delta=delta if delta<2**31 else delta-2**32
 result=dict(state=dict(actor=list(u.mem_read(0x577f08,256)),seed=get(0x820454),holeTotal=get(0x574658+h,'<h'),remarkCount=get(0x5745d8+h+kind*2,'<H'),remarkValue=get(0x57466c+h+kind*2,'<H'),tileFlags=get(0x53ba00+idx*2,'<H'),tileGrowth=get(0x577254+idx,'<B'),worldDirty=get(0x542c14,'<i'),positive=get(0x5a4dc0+idx,'<B'),negative=get(0x56b234+idx,'<B')),delta=delta,randomDraws=0 if end==0x469075 else 1,next='return' if end==0x469075 else 'continue',events=events)
 result['state']['profileVoiceBytes']=s['profileVoiceBytes'];result['state']['profiles']=s['profiles'];result['state']['holeBytes']=s['holeBytes']
 result['selectedDelta']=get(sp+0x18,'<i') if end!=0x469075 else 0
 rows.append([q,result])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-adjustment.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkAdjustment} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actor=Uint8Array.from(q.state.actor);q.before=Uint8Array.from(q.before);const got=originalRemarkAdjustment(q,(event,state)=>{const v=new DataView(state.actor.buffer);if(q.effectMutation){if(event.address===0x447a30){state.actor[0x18]=0x40;state.seed=777;}if(event.address===0x40c1f0){v.setInt16(0xb6,1,true);state.actor[0x1d]=99;}if(event.address===0x4a0000)state.actor[0x1e]=88;}return {state,result:event.address===0x46c140?q.voice:0};});got.state.actor=[...got.state.actor];if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native contiguous adjustment cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-adjustment.json').write_text(json.dumps(rows[:132],separators=(',',':'))+'\n')
