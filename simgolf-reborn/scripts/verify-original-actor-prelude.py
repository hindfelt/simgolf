"""Native visual-slot/countdown prelude; callback body is a controlled mutation."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x466ea0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];base=0;slot=0;change=0
def hook(u,a,size,data):
 if a==0x466ea0:
  calls.append(dict(address=a,args=[slot]));u.mem_write(base+0x8c,bytes([change]))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2000):
 slot=i%152;base=0x577f00+slot*256
 q=dict(slot=slot,seed=rng.randrange(2**32),phaseCounter=rng.choice([0,8,16,1,7]),stateFlags=rng.choice([0,0x40000,0x100000]),difficulty=rng.choice([-1,0,2,5,0x7fffffff]),screenX=rng.choice([-1,0,100]),focusActor=-1,countdown=rng.choice([0,2,7,255]),remarkByte=rng.choice([0,50]),actorWord=rng.choice([0,4]),visualOwners=[rng.choice([-1,slot,151]) for _ in range(16)])
 change=rng.choice([0,6,255])
 for a,v in [(0x820454,q['seed']),(0x831828,q['phaseCounter']),(0x820344,q['difficulty']),(0x4c1dfc,q['focusActor']),(base+0x18,q['stateFlags']),(base+0x10,q['screenX']),(0x102010,slot),(0x102028,999)]:put(a,v)
 u.mem_write(base+0x8c,bytes([q['countdown'],q['remarkByte']]));u.mem_write(base+0xba,struct.pack('<h',q['actorWord']))
 for j,v in enumerate(q['visualOwners']):u.mem_write(0x59e6b0+j*0x388,struct.pack('<h',v))
 calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,slot*256);u.emu_start(0x42819c,0x428272,count=10000)
 state={**q,'seed':read(0x820454),'countdown':u.mem_read(base+0x8c,1)[0],'focusActor':signed(0x4c1dfc),'visualOwners':[struct.unpack('<h',u.mem_read(0x59e6b0+j*0x388,2))[0] for j in range(16)]}
 rows.append(dict(q=q,change=change,expected=dict(state=state,visualSlot=signed(0x102030),centreFlag=read(0x102028),randomDraws=int(q['countdown']==2 and q['phaseCounter']&7==0),calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-prelude.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorPrelude}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const a=originalActorPrelude(r.q,(_,s)=>({...s,countdown:r.change}));if(!isDeepStrictEqual(a,r.expected))throw Error(JSON.stringify({r,a}));}console.log('2000 native normal-actor prelude cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
