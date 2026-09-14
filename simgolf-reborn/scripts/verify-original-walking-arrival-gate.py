"""Native arrival gate including exact radius boundaries and preceding records."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
def hook(u,a,size,data):
 global end
 if a in [0x42a71c,0x42bdb5,0x4295ef,0x42a019]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42927);rows=[]
for i in range(1600):
 b=bytearray(512);f=bytearray(4096);prefix=bytearray(32);t=bytes([rng.choice([10,17])]*2500)
 for j in range(2):
  off=j*256;struct.pack_into('<ii',b,off+8,24000,24000);struct.pack_into('<ii',b,off+0xdc,rng.choice([0,24000,24500]),24000);struct.pack_into('<h',b,off+0xaa,j^1);struct.pack_into('<I',b,off+0x18,rng.choice([0,0,0x40000]));b[off+0x29]=rng.choice([1,19]);b[off+0x25]=7;b[off+0x22]=3
 struct.pack_into('<h',f,0,rng.choice([1,7]));struct.pack_into('<h',prefix,0,rng.choice([1,0,7]))
 q=dict(actorId=0,destination=dict(x=24000+rng.choice([0,127,128,129,511,512,513]),z=24000),serviceIndex=rng.choice([-2,-1,0]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x58a708,bytes(f));u.mem_write(0x58a6e8,bytes(prefix));u.mem_write(0x570d38,t);put(0x10201c,q['serviceIndex']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,q['destination']['x']);u.reg_write(UC_X86_REG_ESI,q['destination']['z']);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;u.emu_start(0x429f27,0x400fff,count=10000);assert end
 rows.append([q,list(b),list(f),list(prefix),list(t),dict(actor=list(u.mem_read(0x577f00,256)),distance=get(0x102070),next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingArrivalGate}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,f,p,t,e] of rows){const r=originalWalkingArrivalGate({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],facilityRecords:new Uint8Array(f),facilityPrefix:new Uint8Array(p),terrain:new Uint8Array(t)});const a={actor:Array.from(r.state.actors[0]),distance:r.distance,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));coverage[r.next]=(coverage[r.next]??0)+1;}console.log(`${rows.length} native arrival gates match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-arrival-gate.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
