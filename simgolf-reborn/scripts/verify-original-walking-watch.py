"""Native watch-shot decision, including actual heading, distance and RNG."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
end=None
def hook(u,a,size,data):
 global end
 if a in [0x4295ef,0x42960b]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(4294);rows=[]
for i in range(2000):
 b=bytearray(512);id=i%2
 for j in range(2):
  off=j*256;b[off+0x29]=rng.choice([0,1,1,2]);b[off+0x25]=rng.choice([0,10,11,12,13,14,16,255]);b[off+0x22]=4;struct.pack_into('<h',b,off+0xaa,j^1);struct.pack_into('<h',b,off+0xa6,77);struct.pack_into('<h',b,off+0x1c,33)
  for offset in [8,12,0xdc,0xe0]:struct.pack_into('<i',b,off+offset,24000+rng.randrange(-1200,1200))
  struct.pack_into('<I',b,off+0x18,rng.choice([0,0x40000]));struct.pack_into('<i',b,off+0xe4,rng.choice([0,1,1000]));struct.pack_into('<I',b,off+0xe8,rng.getrandbits(32))
 q=dict(actorId=id,ballTerrain=rng.choice([1,10,10,12]),seed=rng.getrandbits(32));u.mem_write(0x577f00,bytes(b));put(0x102014,q['ballTerrain']);put(0x820454,q['seed']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;u.emu_start(0x4294d1,0x400fff,count=10000);assert end
 rows.append([q,list(b),dict(actors=list(u.mem_read(0x577f00,512)),seed=get(0x820454),next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingWatch}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let watched=0;for(const [q,b,e] of rows){const r=originalWalkingWatch({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))]});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),seed:r.state.seed,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));watched+=r.randomDraws;}console.log(`${rows.length} native watch-shot cases match; ${watched} watching reactions.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-watch.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
