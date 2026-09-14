"""Native swing progress, retaining clamp/table instructions, controlled effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
from collections import Counter
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
addresses={0x4672d0:3,0x40c1f0:4,0x409820:1,0x409780:1}
for a in addresses:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
branch=None;calls=[];mutate=False
# Mutating effect records establish that native subsequent reads are refreshed.
def hook(u,a,size,data):
 global branch
 if a in [0x42bdb5,0x4295ef]:branch='motion' if a==0x42bdb5 else 'skip';u.emu_stop()
 if a in addresses:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(addresses[a])]))
  if mutate:put(0x577f18,read(0x577f18)|0x80);u.mem_write(0x577f24,b'\x0c');put(0x577f08,23000)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3000):
 b=bytearray(256);b[0x28]=rng.choice([2,3,6,7,8,31,119,120,126,127,128,254,255]);b[0x22]=rng.randrange(8);b[0x24]=rng.choice([0,9,10,13,255]);b[0x21]=rng.randrange(256);b[0x26]=9
 struct.pack_into('<I',b,0x18,rng.choice([0,0x4000,0x40000,0x400000,0x404000,0x440000]));struct.pack_into('<ii',b,8,20000,25000);struct.pack_into('<ii',b,0xcc,21000,26000);struct.pack_into('<i',b,0x10,rng.choice([-1,0]));terrain=rng.choice([1,2,3]);selected=rng.choice([0,1]);mutate=i%2==0
 q=dict(actorId=0,actors=[list(b)],ballTerrain=terrain,selectedActor=selected,seed=123)
 u.mem_write(0x577f00,bytes(b));put(0x5a4440,selected);put(0x102010,0);put(0x102014,terrain);put(0x820454,123)
 calls=[];branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,b[0x28]);u.emu_start(0x42bb3b,0x400fff,count=10000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),calls=calls,next=branch,seed=read(0x820454))))
print('Native swing coverage:',dict(Counter(r['expected']['next'] for r in rows)),'effect calls:',sum(len(r['expected']['calls']) for r in rows),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-swing-progress.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalSwingProgress}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));const a=originalSwingProgress(r.q,(_,state)=>{if(r.mutate){const v=new DataView(state.actors[0].buffer);v.setUint32(0x18,v.getUint32(0x18,true)|0x80,true);state.actors[0][0x24]=12;v.setInt32(8,23000,true);}return {state};});const actual={actor:Array.from(a.state.actors[0]),calls:a.calls,next:a.next,seed:a.state.seed};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('3000 continuous native swing progress cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
