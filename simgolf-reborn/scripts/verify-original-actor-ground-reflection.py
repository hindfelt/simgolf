"""Original ground reflection with audio-dependent heading and position."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x40c1f0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
q=None;calls=[]
def hook(u,a,size,data):
 if a!=0x40c1f0:return
 sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+i*4) for i in range(4)]))
 if q['mutate']:put(0x577fe8,12345);put(0x577fe0,20992);u.mem_write(0x5608b0+1020,b'\x00')
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(480);rows=[]
for i in range(2000):
 q=dict(actorId=0,ballTile=dict(x=20,z=20),edgeFlags=rng.randrange(256),stepX=rng.randrange(-1000,1001),stepCosine=rng.randrange(-1000,1001),mutate=bool(i%2))
 b=bytearray(256)
 for o,v in [(0xdc,20992+rng.randrange(-1024,1025)),(0xe0,20992+rng.randrange(-1024,1025)),(0xe8,rng.randrange(-2147483648,2147483648))]:struct.pack_into('<i',b,o,v)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x5608b0+1020,bytes([q['edgeFlags']]))
 sp=0x102000
 for o,v in [(0x18,20),(0x70,q['stepX']),(0x6c,q['stepCosine'])]:put(sp+o,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,1000);u.reg_write(UC_X86_REG_EDI,20);calls=[];u.emu_start(0x42c47c,0x42c527,count=1000)
 rows.append([q,list(b),dict(actor=list(u.mem_read(0x577f00,256)),edgeFlags=u.mem_read(0x5608b0+1020,1)[0],calls=calls)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorGroundReflection}=await import(MODULE);let effects=0;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,e] of rows){const r=originalActorGroundReflection({...q,actors:[new Uint8Array(b)]},(event,state)=>{if(q.mutate){const a=new DataView(state.actors[0].buffer);a.setUint32(0xe8,12345,true);a.setInt32(0xe0,20992,true);state.edgeFlags=0;}return {state};});const a={actor:Array.from(r.state.actors[0]),edgeFlags:r.state.edgeFlags,calls:r.calls};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));effects+=r.calls.length;}console.log(`${rows.length} native ground reflections match; ${effects} ordered sounds.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-ground-reflection.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
