"""Native finished departure with real visitor-assignment cleanup."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
end=None;calls=[]
def hook(u,a,size,data):
 global end
 if a in [0x4290ca,0x4295ef]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a==0x425b10:calls.append(dict(address=a,args=[0]))
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9024);rows=[]
for i in range(1500):
 b=bytearray(256);p=bytearray(256);b[0x29]=rng.choice([1,19,19]);b[0x2a]=6;b[0x25]=13;b[0x8c]=5;p[0x29]=rng.choice([0,1,19]);struct.pack_into('<h',b,0xaa,1);struct.pack_into('<H',b,0xbe,7);struct.pack_into('<I',b,0x18,rng.choice([0,512]));struct.pack_into('<I',p,0x18,rng.choice([0,512]));struct.pack_into('<i',b,0x10,rng.choice([-1,3]));table=bytearray(rng.randbytes(800))
 for j in range(100):struct.pack_into('<H',table,j*8+4,rng.choice([7,8,9]))
 q=dict(actorId=0,actorTile=dict(x=rng.choice([10,11]),z=10),clubhouseTile=dict(x=10,z=10),selectionState=rng.choice([-1,0,1]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x578000,bytes(p));u.mem_write(0x567698,bytes(table));put(0x5a4440,q['selectionState']);put(0x576ba0,10);put(0x576ba4,10);put(0x102010,0);put(0x10204c,10)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['actorTile']['x']);u.reg_write(UC_X86_REG_ECX,struct.unpack_from('<I',b,0x18)[0]);end=None;calls=[];u.emu_start(0x429024,0x400fff,count=2000);assert end
 rows.append([q,list(b),list(p),list(table),dict(actor=list(u.mem_read(0x577f00,256)),assignments=list(u.mem_read(0x567698,800)),selectionState=struct.unpack('<i',u.mem_read(0x5a4440,4))[0],calls=calls,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalFinishedDeparture}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let cleanups=0;for(const [q,b,p,t,e] of rows){const r=originalFinishedDeparture({...q,actors:[new Uint8Array(b),new Uint8Array(p)],visitorAssignments:new Uint8Array(t)});const a={actor:Array.from(r.state.actors[0]),assignments:Array.from(r.state.visitorAssignments),selectionState:r.state.selectionState,calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));cleanups+=r.calls.length;}console.log(`${rows.length} native finished departures match; ${cleanups} real assignment cleanups.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-finished-departure.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
