"""Continuous native swing gate and 152-slot scan with original RNG/distance/heading."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
from collections import Counter
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
branch=None;draws=0;clear=None
# No native helper bodies are replaced in this verifier.
def hook(u,a,size,data):
 global branch,draws,clear
 if a in [0x42bdb5,0x42bb3b,0x4295ef]:branch={0x42bdb5:'motion',0x42bb3b:'progress',0x4295ef:'skip'}[a];u.emu_stop()
 if a==0x45ba70:draws+=1
 if a==0x42bac6:clear=bool(u.reg_read(UC_X86_REG_EBX))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1000):
 id=i%2;records=[]
 for slot in [0,1,2,3,4,151]:
  b=bytearray(256);b[0x29]=rng.choice([1,1,2]);b[0x28]=1;b[0x2a]=rng.choice([0,1,2,3,127,128,255]);b[0x25]=0;b[0x26]=9
  struct.pack_into('<ii',b,8,rng.randrange(512,50000),rng.randrange(512,50000));struct.pack_into('<ii',b,0xdc,rng.randrange(512,50000),rng.randrange(512,50000));struct.pack_into('<ii',b,0xd4,30,35);struct.pack_into('<I',b,0xe8,rng.randrange(2**32));struct.pack_into('<I',b,0x18,rng.choice([0,0x400,0x200,0x4200,0x20000]));struct.pack_into('<h',b,0xaa,slot^1 if slot<2 else 0);struct.pack_into('<h',b,0xc6,rng.choice([-32768,-1,0,1,32767]));struct.pack_into('<h',b,0xa6,rng.choice([-4,0,5]));struct.pack_into('<h',b,0x1c,15)
  if slot==id:b[0x29]=1;b[0x28]=rng.choice([0,1,1,1,2]);b[0x25]=rng.choice([0,0,16]);b[0x2a]=rng.choice([0,1,2])
  records.append([slot,list(b)])
 q=dict(actorId=id,records=records,seed=rng.randrange(2**32),ballTerrain=rng.choice([1,2]),swingOverride=rng.choice([0,0,1]),roundClock=rng.choice([0,10000,2147483647,-2147483648]),holeTees=[None,dict(x=2,z=2),dict(x=3,z=3)])
 if i%2==0:
  q['swingOverride']=1;q['roundClock']=0;q['holeTees'][1]=dict(x=2,z=10)
  for slot,raw in records:
   b=bytearray(raw);b[0x29]=2
   if slot in [id,151]:
    b[0x29]=1;b[0x28]=1;b[0x25]=0;b[0x2a]=1 if slot==id else 2
    struct.pack_into('<h',b,0xc6,0);struct.pack_into('<I',b,0x18,(0x200 if i%10==0 else 0) if slot==id else 0x400)
    struct.pack_into('<ii',b,8,10240 if slot==id else 16000,10752);struct.pack_into('<ii',b,0xdc,10240 if slot==id else 16000,10752);struct.pack_into('<ii',b,0xd4,30,10)
    if slot==151:
     case=(i//2)%5
     if case==0:struct.pack_into('<ii',b,8,3000,10752)
     if case==1:struct.pack_into('<ii',b,0xdc,31232,10752)
     if case==2:struct.pack_into('<ii',b,8,31232,10752)
     if case==4:struct.pack_into('<ii',b,8,16000,25000)
   raw[:]=b
 u.mem_write(0x577f00,bytes(152*256))
 for slot,b in records:u.mem_write(0x577f00+slot*256,bytes(b))
 for j,t in enumerate(q['holeTees']):
  if t:put(0x574508+j*520,t['x']);put(0x57450c+j*520,t['z'])
 put(0x820454,q['seed']);put(0x599a9c,q['swingOverride']);put(0x568f6c,q['roundClock']);put(0x102010,id);put(0x102014,q['ballTerrain'])
 branch=None;draws=0;clear=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x42b825,0x400fff,count=30000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(0x577f00+id*256,256)),seed=read(0x820454),randomDraws=draws,corridorClear=clear,next=branch)))
print('Native clearance scan results:',dict(Counter(str(r['expected']['corridorClear']) for r in rows)),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-swing-clearance.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalSwingClearance}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q;q.actors=Array.from({length:152},()=>new Uint8Array(256));for(const [slot,b] of q.records)q.actors[slot]=Uint8Array.from(b);const a=originalSwingClearance(q);const actual={actor:Array.from(a.state.actors[q.actorId]),seed:a.state.seed,randomDraws:a.randomDraws,corridorClear:a.corridorClear,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1000 continuous native swing clearance cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
