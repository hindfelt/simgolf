"""Continuous original partner-walking checks with real distance/heading helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
rng=random.Random(429192);rows=[]
for i in range(1600):
 b=bytearray(512);h=bytearray(20*520);terrain=bytes([rng.choice([1,10,12,17])]*2500);metadata=[dict(shotClass=rng.choice([-1,0,1,2])) for _ in range(21)];id=i%2
 for j in range(2):
  off=j*256;b[off+0x29]=rng.choice([1,1,2]);struct.pack_into('<h',b,off+0xaa,j^1)
  for offset in [8,12,0xdc,0xe0]:struct.pack_into('<i',b,off+offset,rng.randrange(1,50000))
  if rng.randrange(8)==0:struct.pack_into('<i',b,off+0xdc,0)
  struct.pack_into('<I',b,off+0x18,rng.choice([0,0,0x40000,0x4000]))
 if i%4==0:
  for j in range(2):
   for offset in [8,12,0xdc,0xe0]:struct.pack_into('<i',b,j*256+offset,24000+rng.choice([-1536,-512,-511,0,511,512,1535,1536]))
 for j in range(20):struct.pack_into('<ii',h,j*520+0x18,rng.randrange(50),rng.randrange(50))
 q=dict(actorId=id,ballTerrain=rng.choice([1,10,12,17]),followPartner=rng.randrange(2),cupHeading=rng.getrandbits(32),metadata=metadata)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));u.mem_write(0x570d38,terrain)
 for j,m in enumerate(metadata):u.mem_write(0x576dc2+j*48,bytes([m['shotClass']&255]))
 put(0x102010,id);put(0x102014,q['ballTerrain']);put(0x102024,q['followPartner']);put(0x102078,q['cupHeading']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_FPCW,0x37f);u.emu_start(0x429192,0x4294d1,count=10000)
 rows.append([q,list(b),list(h),list(terrain),dict(cupHeading=get(0x102078),followPartner=get(0x102024))])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPartner}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let follow=0;for(const [q,b,h,t,e] of rows){const actors=[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))];const holes=Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520)));const r=originalWalkingPartner({...q,actors,holes,terrain:new Uint8Array(t)});const a={cupHeading:r.cupHeading,followPartner:r.followPartner};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));follow+=r.followPartner;}console.log(`${rows.length} native partner-walking cases match; ${follow} follow decisions.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-partner.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
