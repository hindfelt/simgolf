"""Native ball walking destination and water fallback, real heading/terrain helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
def hook(u,a,size,data):
 global end
 if a in [0x4297c7,0x429f27]:end=hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42960);rows=[]
for i in range(1800):
 b=bytearray(512);h=bytearray(20*520);id=i%2;t=bytes(rng.choices([1,10,17],k=2500))
 for j in range(2):
  off=j*256;b[off+0x29]=1;struct.pack_into('<h',b,off+0xaa,j^1)
  struct.pack_into('<i',b,off+0xdc,rng.choice([0,512,50000,rng.randrange(1000,50000)]));struct.pack_into('<i',b,off+0xe0,rng.randrange(51200))
 struct.pack_into('<ii',h,520+0x18,rng.randrange(50),rng.randrange(50))
 q=dict(actorId=id,ballTerrain=rng.choice([1,10]),followPartner=rng.randrange(2),walkingOverride=rng.choice([0,0,0,1]),cupHeading=rng.getrandbits(32))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));u.mem_write(0x570d38,t);put(0x102010,id);put(0x102014,q['ballTerrain']);put(0x102024,q['followPartner']);put(0x102034,q['walkingOverride']);put(0x102078,q['cupHeading']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);end=None;u.emu_start(0x42960b,0x400fff,count=10000);assert end
 e=dict(followPartner=get(0x102024),next=end)
 if end=='0x429f27':e.update(ballPosition=dict(x=get(0x102064),z=get(0x102068)),destination=dict(x=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0],z=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_ESI)))[0]))
 rows.append([q,list(b),list(h),list(t),e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingBallDestination}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let destinations=0;for(const [q,b,h,t,e] of rows){const r=originalWalkingBallDestination({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520))),terrain:new Uint8Array(t)});const {state,...a}=r;if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));destinations+=Boolean(r.destination);}console.log(`${rows.length} native ball destination cases match; ${destinations} destinations.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-ball-destination.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
