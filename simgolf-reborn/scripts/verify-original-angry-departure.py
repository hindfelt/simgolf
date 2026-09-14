"""Native complaint/clubhouse routing branch with callback changes."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4672d0,b'\xc3');u.reg_write(UC_X86_REG_FPCW,0x37f)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
q=None;calls=[];end=None
def hook(u,a,size,data):
 global end
 if a in [0x429024,0x429f27,0x4295ef]:end='skip' if a==0x4295ef else hex(a);u.emu_stop();return
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(3)]))
  if q['mutate']:u.mem_write(0x577f00+q['actorId']*256+0xac,struct.pack('<h',-10));put(0x820454,19)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(864);rows=[]
for i in range(1500):
 id=rng.randrange(152);phase=rng.choice([rng.randrange(2**32),(10000-id*35)&0xffffffff]);q=dict(actorId=id,phaseCounter=phase,seed=rng.randrange(2**32),clubhouseTile=dict(x=rng.randrange(50),z=rng.randrange(50)),mutate=bool(i%2));b=bytearray(256);b[0x29]=3;struct.pack_into('<I',b,0x18,rng.choice([0,0x20000000,0x20020000]));struct.pack_into('<h',b,0xac,rng.choice([-32768,-11,-10,0,100]));base=0x577f00+id*256;u.mem_write(base,bytes(b))
 for a,v in [(0x831828,phase),(0x820454,q['seed']),(0x576ba0,q['clubhouseTile']['x']),(0x576ba4,q['clubhouseTile']['z']),(0x102010,id)]:put(a,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);calls=[];end=None;u.emu_start(0x428f64,0x400fff,count=1000);assert end
 e=dict(actor=list(u.mem_read(base,256)),seed=read(0x820454),calls=calls,next=end)
 if end=='0x429f27':e['destination']=dict(x=u.reg_read(UC_X86_REG_EBX),z=u.reg_read(UC_X86_REG_ESI))
 rows.append([q,list(b),e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAngryDeparture}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let reactions=0;for(const [q,b,e] of rows){const actors=[];actors[q.actorId]=new Uint8Array(b);const r=originalAngryDeparture({...q,actors},(_,state)=>{if(q.mutate){new DataView(state.actors[q.actorId].buffer).setInt16(0xac,-10,true);state.seed=19;}return {state};});const a={actor:Array.from(r.state.actors[q.actorId]),seed:r.state.seed,calls:r.calls,next:r.next,...(r.destination?{destination:r.destination}:{})};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));reactions+=r.calls.length;}console.log(`${rows.length} native departure cases match; ${reactions} timed complaints.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-angry-departure.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
