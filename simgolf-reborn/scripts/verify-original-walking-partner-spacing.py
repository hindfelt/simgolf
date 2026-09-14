"""Native partner spacing including cumulative offsets and signed hole ordering."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
rng=random.Random(429e24);rows=[]
for i in range(1600):
 b=bytearray(512);holes=bytearray(20*520);id=i%2
 for j in range(2):
  off=j*256;b[off+0x29]=rng.choice([0,1,2,19]);b[off+0x25]=rng.choice([0,12,13]);struct.pack_into('<h',b,off+0xaa,j^1);struct.pack_into('<I',b,off+0x18,rng.choice([0,0x400,0x800]))
 for j in range(20):holes[j*520+1]=rng.randrange(256)
 q=dict(actorId=id,destination=dict(x=23000,z=24000),movementReady=1,walkingOverride=rng.randrange(2))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(holes));put(0x102010,id);put(0x102034,q['walkingOverride']);put(0x102044,1);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EBX,23000);u.reg_write(UC_X86_REG_ESI,24000);u.emu_start(0x429e24,0x429f27,count=10000)
 rows.append([q,list(b),list(holes),dict(actors=list(u.mem_read(0x577f00,512)),destination=dict(x=u.reg_read(UC_X86_REG_EBX),z=u.reg_read(UC_X86_REG_ESI)),movementReady=get(0x102044))])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPartnerSpacing}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let adjusted=0;for(const [q,b,h,e] of rows){const r=originalWalkingPartnerSpacing({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520)))});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),destination:r.destination,movementReady:r.movementReady};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));adjusted+=r.movementReady===0;}console.log(`${rows.length} native spacing cases match; ${adjusted} adjusted destinations.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-partner-spacing.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
