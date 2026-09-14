"""Native congestion delay with original RNG and departure gate."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW,UC_X86_REG_EDI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
def hook(u,a,size,data):
 global end
 if a in [0x42adac,0x42af66]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42927);rows=[]
for i in range(1600):
 b=bytearray(256);struct.pack_into('<h',b,0xac,rng.choice([-32768,-1,0,1,32767]));b[0x20]=rng.choice([0,32,33,64]);struct.pack_into('<I',b,0x18,rng.getrandbits(32))
 q=dict(actorId=0,difficulty=rng.choice([0,1,2]),seed=rng.getrandbits(32),congestionEntry=rng.choice(['0x42ad32','0x42ad3b']))
 u.mem_write(0x577f00,bytes(b));put(0x820344,q['difficulty']);put(0x820454,q['seed']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,struct.unpack_from('<I',b,0x18)[0]);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;u.emu_start(int(q['congestionEntry'],16),0x400fff,count=10000);assert end
 rows.append([q,list(b),dict(actor=list(u.mem_read(0x577f00,256)),seed=get(0x820454)&0xffffffff,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingCongestion}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,e] of rows){const r=originalWalkingCongestion({...q,actors:[new Uint8Array(b)]});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));coverage[r.next]=(coverage[r.next]??0)+1;}console.log(`${rows.length} native congestion cases match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-congestion.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
