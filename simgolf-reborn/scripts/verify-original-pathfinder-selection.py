"""Native wavefront selection, bridge centering and no-route fallback."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def hook(u,a,size,data):
 if a==0x400fff:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42327);rows=[]
for n in range(1800):
 x=rng.choice([0,49,rng.randrange(50)]);z=rng.choice([0,49,rng.randrange(50)]);index=x*50+z
 visited=bytearray(2500);terrain=bytearray(2500);flags=[0]*2500
 for xx in range(max(0,x-1),min(50,x+2)):
  for zz in range(max(0,z-1),min(50,z+2)):
   i=xx*50+zz;visited[i]=rng.choice([0,1,2,3,4,255]);terrain[i]=rng.choice([0,1,17,20])
 terrain[index]=rng.choice([1,17]);flags[index]=rng.choice([0,32]);wf=rng.choice([0,256,0x80000])
 pos=dict(x=(x<<10)+rng.randrange(1024),z=(z<<10)+rng.randrange(1024))
 q=dict(origin=dict(x=x,z=z),destination=dict(x=rng.randrange(50),z=rng.randrange(50)),actorPosition=pos,fallbackDelta=dict(x=rng.randint(-50000,50000),z=rng.randint(-50000,50000)),preferredMask=rng.randrange(256),worldFlags=wf)
 if n%11==0:q['destination']=q['origin'].copy()
 u.mem_write(0x58bdc0,bytes(visited));u.mem_write(0x570d38,bytes(terrain));u.mem_write(0x53ba00,struct.pack('<2500H',*flags));put(0x59d208,wf);put(0x577f08,pos['x']);put(0x577f0c,pos['z'])
 for offset,v in [(0x50,x),(0x54,z),(0x48,q['destination']['x']),(0x4c,q['destination']['z']),(0x58,0),(0x38,q['preferredMask']),(0x3c,q['fallbackDelta']['x']),(0x40,q['fallbackDelta']['z']),(0x44,0x400fff)]:put(0x102000+offset,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x42e327,0x400fff,count=10000)
 value=get(0x59d208);direction=u.reg_read(UC_X86_REG_EAX);direction=direction if direction<0x80000000 else direction-0x100000000
 rows.append([q,list(visited),list(terrain),flags,dict(value=direction,worldFlags=value)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalPathfinderSelection}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let corrections=0,missing=0;for(const [q,v,t,f,e] of rows){const r=originalPathfinderSelection({...q,visited:new Uint8Array(v),terrain:new Uint8Array(t),tileFlags:new Uint16Array(f)});const a={value:r.value,worldFlags:r.state.worldFlags};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));if(r.state.worldFlags!==q.worldFlags)corrections++;if(r.value===-1)missing++;}console.log(`${rows.length} native pathfinder selection cases match; ${corrections} bridge corrections, ${missing} no-direction results.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-pathfinder-selection.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
