"""Verify shot reaction gates/flags and pair effects with controlled call boundaries."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x425001;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x245])
u.mem_write(0x4672d0,b'\xc3');u.mem_write(0x46c140,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
fields={'marker':0x577f82,'reaction':0x577f8c,'actorClass':0x577f20,'hole':0x577f29,'shotCounter':0x577f2a,'skillMask':0x577f21}
current=None;events=[]
def hook(u,a,size,data):
 if a in [0x425239,0x425243]:u.emu_stop();return
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x46c140:u.reg_write(UC_X86_REG_EAX,current['ownScore'] if read(sp+4)==current['actorId'] else current['otherScore'])
 if a==0x4672d0:
  actor=read(sp+4);events.append(dict(actorId=actor,kind=read(sp+8),value=read(sp+12)))
  if current['effect']=='marker':
   address=fields['marker']+actor*256;u.mem_write(address,bytes([(u.mem_read(address,1)[0]+1)&255]))
  if current['effect']=='reaction':u.mem_write(fields['reaction']+actor*256,b'\x01')
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,events
 current=q;events=[];sp=0x102000;s=q['actorId']*256;t=(q['actorId']^1)*256;actor=q['state']['actor'];partner=q['state']['partner']
 for name,a in fields.items():u.mem_write(a+s,bytes([actor[name]]))
 for name in ['reaction','actorClass']:u.mem_write(fields[name]+t,bytes([partner[name]]))
 u.mem_write(fields['marker']+t,b'\x00')
 for a,v in [(0x577f18+s,actor['actorFlags']),(0x577ff4+s,actor['angularOffset']),
  (sp+0x48,q['sceneryTile']),(sp+0x14,q['terrainCode']),(sp+0xb30,q['curveArgument']),(sp+0x10,q['distance']),(sp+0x30,q['previousMarker'])]:write(a,v)
 for a,v in [(0x577fb4+s,actor['stateCode']),(0x577fbe+s,actor['courseIndex']),(0x577faa+s,q['actorId']^1)]:u.mem_write(a,struct.pack('<h',v))
 u.mem_write(0x583446+actor['courseIndex']*44+actor['hole'],bytes([q['courseMark']]))
 u.mem_write(0x576dc2+q['terrainCode']*48,bytes([q['shotClass']&255]))
 u.reg_write(UC_X86_REG_ESI,s);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,q['previousMarker']);u.reg_write(UC_X86_REG_EBX,q['actorId'])
 u.emu_start(0x425001,0x425243,count=5000)
 assert u.reg_read(UC_X86_REG_EIP) in [0x425239,0x425243]
 result={name:u.mem_read(a+s,1)[0] for name,a in fields.items()}
 result.update(actorFlags=read(0x577f18+s)&0xffffffff,angularOffset=read(0x577ff4+s),stateCode=actor['stateCode'],courseIndex=actor['courseIndex'])
 return dict(state=dict(actor=result,partner={name:u.mem_read(fields[name]+t,1)[0] for name in ['reaction','actorClass']}),events=events)
rng=random.Random(2002);rows=[]
for i in range(2000):
 marker=rng.randrange(256);actorId=i%6
 actor=dict(marker=marker,reaction=int(i%11==0),actorClass=int(i%7==0),hole=rng.randrange(1,19),shotCounter=rng.randrange(4),skillMask=rng.randrange(8),actorFlags=rng.randrange(2**32),angularOffset=rng.choice([-1966081,-1966080,-983041,-983040,0,983040,983041,1966080,1966081]),stateCode=4 if i%3 else 0,courseIndex=rng.randrange(4))
 partner=dict(reaction=int(i%13==0),actorClass=int(i%17==0))
 q=dict(actorId=actorId,previousMarker=marker if i%9 else (marker+1)%256,terrainCode=2,shotClass=rng.randrange(-2,4),sceneryTile=30 if i%8==0 else 0,curveArgument=[-1,0,1][i%3],distance=[75,76,100,101][i%4],courseMark=i%2,ownScore=i%3,otherScore=i%2,effect=['none','marker','reaction'][i%3],state=dict(actor=actor,partner=partner))
 if i%10==1:
  actor.update(reaction=0,actorClass=0,shotCounter=3,hole=2+(actorId&1));partner.update(reaction=0,actorClass=0)
  q.update(ownScore=2,otherScore=2,effect='none',previousMarker=marker)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-shot-reactions.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutoShotReactions}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalAutoShotReactions(q,{
 shotClassAt:()=>q.shotClass,courseMarkAt:()=>q.courseMark,scoreFor:id=>id===q.actorId?q.ownScore:q.otherScore,
 emit:(event,state)=>{const actor=event.actorId===q.actorId?state.actor:state.partner;
  if(q.effect==='marker'&&event.actorId===q.actorId)actor.marker=(actor.marker+1)&255;
  if(q.effect==='reaction')actor.reaction=1;return state;}
 });if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('2000 original shot reaction stages match state, flags and ordered requests.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-shot-reactions.json').write_text(json.dumps(rows[:120],separators=(',',':'))+'\n')
