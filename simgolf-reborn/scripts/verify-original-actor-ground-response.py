"""Native ordered ground resistance and green turn with mutable slope callbacks."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x40c140,b'\xc3');u.reg_write(UC_X86_REG_FPCW,0x37f)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
q=None;calls=[]
def hook(u,a,size,data):
 if a!=0x40c140:return
 sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(3)]));u.reg_write(UC_X86_REG_EAX,q['slopes'][len(calls)-1]&0xffffffff)
 if q['mutate']:
  put(0x577fe8,12345);put(0x577fec,4321);u.mem_write(0x576dc1+q['code']*48,bytes([len(calls)+2]))
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(313);rows=[]
for i in range(2000):
 q=dict(code=rng.choice([1,2,10]),origin=rng.choice([1,2]),rollCoefficient=rng.randrange(-2,10),direction=rng.randrange(8),boundaryFlags=rng.randrange(2),phaseCounter=rng.randrange(16),seed=rng.randrange(2**32),slopes=[rng.randrange(-5,6),rng.randrange(-5,6)],mutate=bool(i%2))
 b=bytearray(256)
 for o,v in [(0xdc,20992),(0xe0,20992),(0xcc,512),(0xd0,512),(0xec,rng.randrange(-100,10000)),(0xe8,rng.randrange(-2147483648,2147483648)),(0xf4,rng.randrange(-100000000,100000001))]:struct.pack_into('<i',b,o,v)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes([q['origin']]));u.mem_write(0x570d38+1020,bytes([q['code']]));u.mem_write(0x576dc1+q['code']*48,bytes([q['rollCoefficient']&255]));put(0x820454,q['seed']);put(0x831828,q['phaseCounter']);sp=0x102000
 for o,v in [(0x14,q['code']),(0x18,20),(0x20,20),(0x1c,q['boundaryFlags']),(0x50,q['direction'])]:put(sp+o,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,20992);u.reg_write(UC_X86_REG_ECX,20992);calls=[];u.emu_start(0x42c13a,0x42c27b,count=1000)
 rows.append([q,list(b),dict(actor=list(u.mem_read(0x577f00,256)),seed=read(0x820454)&0xffffffff,calls=calls)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorGroundResponse}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,e] of rows){const terrain=new Uint8Array(2500);terrain[0]=q.origin;terrain[1020]=q.code;let n=0;const r=originalActorGroundResponse({...q,actorId:0,actors:[new Uint8Array(b)],terrain,ballTile:{x:20,z:20}},(event,state)=>{const value=q.slopes[n++];if(q.mutate){const a=new DataView(state.actors[0].buffer);a.setUint32(0xe8,12345,true);a.setInt32(0xec,4321,true);state.rollCoefficient=n+2;}return {state,value};});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,calls:r.calls};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}console.log(`${rows.length} native rolling responses match full actor state, ordered slopes and RNG.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-ground-response.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
