"""Compare original primary reaction selection, RNG and counter effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE,UC_HOOK_MEM_INVALID
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_ECX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x424cb6,0x34b),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x466ea0,0x22)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
u.mem_write(0x4672d0,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
current=None;events=[];draws=0
def hook(u,a,size,data):
 global draws
 if a==0x45bab0:draws+=1
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);actor=read(sp+4)
  events.append(dict(actorId=actor,kind=read(sp+8),value=read(sp+12)))
  if current['effectCounter'] is not None:u.mem_write(0x577f23+actor*256,bytes([current['effectCounter']]))
  if current['effectSeed'] is not None:write(0x820454,current['effectSeed'])
u.hook_add(UC_HOOK_CODE,hook)
def invalid(u,access,address,size,value,data):
 print('Invalid access',hex(address),'at',hex(u.reg_read(UC_X86_REG_EIP)),current,flush=True);return False
u.hook_add(UC_HOOK_MEM_INVALID,invalid)
def run(q):
 global current,events,draws
 current=q;events=[];draws=0;sp=0x102000;s=q['actorId']*256;actor=q['state']['actor']
 for a,v in [(0x577f18+s,actor['actorFlags']),(0x577fd4+s,q['target']['x']),(0x577fd8+s,q['target']['z']),
  (0x5a872c,q['followupFlag']),(0x5a5b88,q['state']['diagnostics']),(0x820454,q['state']['seed']),
  (0x820344,q['conditionLevel']),(0x5746fc+actor['hole']*520,q['holeRecord']),
  (sp+0xb20,q['actorId']),(sp+0xb24,q['mode']),(sp+0x14,q['terrainCode']),(sp+0x10,q['distance']),
  (sp+0x38,q['scannedTile']),(sp+0x1c,q['namedReference']),(sp+0x48,q['sceneryTile']),
  (sp+0x50,1250),(sp+0x4c,q['pathHeading']),(sp+0x24,q['aimHeading']),(sp+0x3c,q['cueValue'])]:write(a,v)
 for a,v in [(0x577f29+s,actor['hole']),(0x577f2a+s,actor['shotCounter']),(0x577f23+s,actor['elevationCounter'])]:u.mem_write(a,bytes([v]))
 u.mem_write(0x577f90+s,struct.pack('<H',actor['conditionFlags']))
 u.mem_write(0x577fb4+s,struct.pack('<H',actor['stateCode']));u.mem_write(0x53ba00+1250*2,struct.pack('<H',q['originFlags']))
 u.mem_write(0x570d38+q['target']['x']*50+q['target']['z'],b'\x03')
 u.mem_write(0x576dc2+q['terrainCode']*48,bytes([q['originClass']&255]));u.mem_write(0x576dc2+3*48,bytes([q['targetClass']&255]))
 u.reg_write(UC_X86_REG_ESI,s);u.reg_write(UC_X86_REG_ESP,sp)
 u.reg_write(UC_X86_REG_ECX,actor['elevationCounter']);u.emu_start(0x424cb6,0x425001,count=5000);assert u.reg_read(UC_X86_REG_EIP)==0x425001
 result=dict(conditionFlags=struct.unpack('<H',u.mem_read(0x577f90+s,2))[0],actorFlags=read(0x577f18+s)&0xffffffff,hole=actor['hole'],shotCounter=actor['shotCounter'],stateCode=actor['stateCode'],elevationCounter=u.mem_read(0x577f23+s,1)[0])
 return dict(actor=result,seed=read(0x820454)&0xffffffff,diagnostics=read(0x5a5b88)&0xffffffff,events=events,randomDraws=draws)
rng=random.Random(2002);rows=[]
for i in range(3000):
 family=i%8
 actor=dict(conditionFlags=rng.randrange(65536),actorFlags=rng.randrange(2),hole=rng.randrange(1,19),shotCounter=rng.randrange(4),stateCode=4 if i%7==0 else 0,elevationCounter=rng.randrange(256) if i%3 else rng.randrange(32))
 q=dict(actorId=i%6,target=dict(x=30,z=25),terrainCode=2,followupFlag=int(family==0),originClass=rng.randrange(-1,3),targetClass=rng.randrange(-1,3),mode=int(i%11==0),scannedTile=123 if family==1 else 0,namedReference=2 if family==2 else 0,sceneryTile=321 if i%17==0 else 0,originFlags=0x800|(0x4000 if i%13==0 else 0) if family==3 else 0,distance=[40,41,75,100,101,200][i%6],conditionLevel=rng.randrange(4),holeRecord=rng.randrange(9),pathHeading=rng.randrange(8),aimHeading=rng.randrange(8),cueValue=1234,effectCounter=[None,0,30][i%3],effectSeed=777 if i%5==0 else None,state=dict(actor=actor,seed=rng.randrange(2**32),diagnostics=rng.randrange(1,8) if family==4 else 0))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-primary-reaction.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAutoPrimaryReaction}=await import(MODULE);const {originalPlannerWorldRecords}=await import(READER);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const holes=Array.from({length:20},()=>{const b=new Uint8Array(520);new DataView(b.buffer).setInt32(0x1fc,q.holeRecord,true);return b;});const records=originalPlannerWorldRecords({holes});const a=originalAutoPrimaryReaction(q,{
 terrainAt:()=>3,shotClassAt:code=>code===q.terrainCode?q.originClass:q.targetClass,holeRecordAt:records.holeRecordAt,
 emit:(event,state)=>{if(q.effectCounter!==null)state.actor.elevationCounter=q.effectCounter;if(q.effectSeed!==null)state.seed=q.effectSeed;return state;}
 });if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('3000 original primary reaction stages match priority, state and shared RNG.');
""".replace('MODULE',json.dumps(module)).replace('READER',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-world-records.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)