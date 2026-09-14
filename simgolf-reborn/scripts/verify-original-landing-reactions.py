"""Native wear/reaction branch, with native map/distance and controlled remark mutations."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EDI,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4672d0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];branch=None;mutate=False;code=1

def hook(u,a,size,data):
 global branch
 if a in [0x42ceb2,0x42d110]:branch=hex(a);u.emu_stop()
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(3)]))
  if mutate:u.mem_write(0x577f78,b'\x63');u.mem_write(0x570d38+510,b'\x0a');u.mem_write(0x576dc2+code*48,b'\x02');put(0x820454,read(0x820454)+1)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2000):
 b=bytearray(256);b[0x29]=1;b[0x23]=rng.choice([0,5,8,9,12,255]);b[0x22]=rng.randrange(8);b[0x25]=rng.choice([0,13]);b[0x78]=rng.randrange(256);struct.pack_into('<I',b,0x18,rng.choice([0,2]));struct.pack_into('<ii',b,0xcc,10240,10240)
 code=rng.choice([1,10,12,20]);source=rng.choice([1,10,12]);wear=rng.choice([0,254,255]);flags=rng.choice([0,0x100]);difficulty=rng.choice([-1,0,4,10]);metadata={1:-1,10:1,12:2,20:0}
 q=dict(actor=list(b),code=code,source=source,wear=wear,flags=flags,difficulty=difficulty,metadata=metadata)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes([1])*2500);u.mem_write(0x570d38+1275,bytes([code]));u.mem_write(0x570d38+510,bytes([source]));u.mem_write(0x53d934+1275,bytes([wear]));u.mem_write(0x53ba00+1275*2,struct.pack('<H',flags))
 for c,v in metadata.items():u.mem_write(0x576dc2+c*48,bytes([v&255]))
 put(0x574518+520,45);put(0x57451c+520,45);put(0x820344,difficulty);put(0x820454,17);put(0x102010,0);put(0x102018,25);put(0x102020,25);put(0x102074,1275)
 calls=[];branch=None;mutate=i%2==0;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,25);u.reg_write(UC_X86_REG_EDI,code);u.reg_write(UC_X86_REG_ESI,1250);u.emu_start(0x42cc88,0x400fff,count=10000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),wear=u.mem_read(0x53d934+1275,1)[0],source=u.mem_read(0x570d38+510,1)[0],scatter=struct.unpack('<b',u.mem_read(0x576dc2+code*48,1))[0],seed=read(0x820454),calls=calls,priorMood=read(0x10204c),next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-landing-reactions.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalLandingReactions}=await import(MODULE);let reactions=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,metadata=[];for(const [c,v] of Object.entries(q.metadata))metadata[c]={scatterCoefficient:v};const terrain=new Uint8Array(2500).fill(1);terrain[1275]=q.code;terrain[510]=q.source;const tileWear=new Uint8Array(2500);tileWear[1275]=q.wear;const tileFlags=new Uint16Array(2500);tileFlags[1275]=q.flags;const a=originalLandingReactions({actorId:0,actors:[Uint8Array.from(q.actor)],landingTile:{x:25,z:25},landingTerrain:q.code,terrain,tileWear,tileFlags,metadata,difficulty:q.difficulty,holeTargets:[null,{x:45,z:45}],seed:17},(_,state)=>{if(r.mutate){state.actors[0][0x78]=99;state.terrain[510]=10;state.metadata[q.code].scatterCoefficient=2;state.seed++;}return {state};});const actual={actor:Array.from(a.state.actors[0]),wear:a.state.tileWear[1275],source:a.state.terrain[510],scatter:a.state.metadata[q.code].scatterCoefficient,seed:a.state.seed,calls:a.calls,priorMood:a.priorMood,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));reactions+=a.calls.length;}console.log(`2000 continuous native landing cases match; ${reactions} reactions.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
