"""Compare positional sound dispatch using controlled projection and playback boundaries."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x40c1f0,0x1e7),(0x466a00,0x20),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x4c1f94,36)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
for a in (0x42f270,0x447a30):u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a,signed=False):return struct.unpack('<i' if signed else '<I',u.mem_read(a,4))[0]
q=None;events=[];draws=0
def hook(u,a,size,data):
 global draws
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x42f270:
  put(get(sp+12),q['projected']['x']);put(get(sp+16),q['projected']['y']);u.reg_write(UC_X86_REG_EAX,int(q['projected']['visible']))
 if a==0x45bab0:draws+=1
 if a==0x447a30:
  events.append(dict(address=a,args=[get(sp+4+i*4,True) for i in range(5)]))
  if q['mutate']:put(0x820454,777);put(0x5a8720,99);put(0x5a8724,123)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1800):
 q=dict(soundId=i%200,duration=rng.choice([-1,0,500,1000]),projected=dict(x=rng.choice([-1,0,199,200,400,599,799,800,1000]),y=rng.choice([-1,0,200,400,500,501,599,800]),visible=bool(i%3)),zoom=bool(i%2),audioLevel=i%6,mutate=i%7==0,state=dict(seed=rng.randrange(2**32),queued=(i//2)%2,sequenceIndex=i%72))
 sp=0x102000
 for a,v in [(sp,0x401000),(sp+4,q['soundId']),(sp+8,1024),(sp+12,3072),(sp+16,q['duration']),(0x5a8704,q['zoom']),(0x4c183c,q['audioLevel']),(0x820454,q['state']['seed']),(0x5a8720,q['state']['queued']),(0x5a8724,q['state']['sequenceIndex'])]:put(a,v)
 u.reg_write(UC_X86_REG_ESP,sp);events=[];draws=0;u.emu_start(0x40c1f0,0x401000,count=1000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,dict(state=dict(seed=get(0x820454),queued=get(0x5a8720),sequenceIndex=get(0x5a8724,True)),events=events,randomDraws=draws)])
module=(root/'simgolf-reborn/scene/src/simulation/original-positional-sound.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalPositionalSound} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalPositionalSound(q,(event,state)=>{if(q.mutate){state.seed=777;state.queued=99;state.sequenceIndex=123;}return state;});if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native positional-sound cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-positional-sound.json').write_text(json.dumps(rows[:144],separators=(',',':'))+'\n')
