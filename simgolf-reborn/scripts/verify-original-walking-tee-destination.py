"""Native tee destination and service admission thresholds."""
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
 if a in [0x429947,0x429a84]:end=hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(4297);rows=[]
for i in range(1800):
 b=bytearray(512);h=bytearray(20*520);id=i%2;t=[]
 off=id*256;b[off+0x29]=1;b[off+0x20]=rng.choice([0,0,32]);b[off+0x21]=rng.choice([0,1,2,3,4,5,255]);struct.pack_into('<I',b,off+0x18,rng.choice([0,0x2000,0x1000000,0x1002000]));struct.pack_into('<h',b,off+0xae,rng.randrange(-2,14));struct.pack_into('<h',b,off+0xb0,rng.randrange(-2,16))
 h[521]=rng.randrange(256)
 for offset in [8,12,16,20,24,28]:struct.pack_into('<i',h,520+offset,rng.randrange(50))
 q=dict(actorId=id,waitingGroups=rng.choice([0,1,2,5,2147483647]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));put(0x102010,id);put(0x102038,q['waitingGroups']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);end=None;u.emu_start(0x4297c7,0x400fff,count=10000);assert end
 e=dict(next=end,teePosition=dict(x=get(0x102064),z=get(0x102068)),destination=dict(x=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBX)))[0],z=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_ESI)))[0]))
 rows.append([q,list(b),list(h),list(t),e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingTeeDestination}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let destinations=0;for(const [q,b,h,t,e] of rows){const r=originalWalkingTeeDestination({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520))),terrain:new Uint8Array(t)});const {state,...a}=r;if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));destinations+=Boolean(r.destination);}console.log(`${rows.length} native tee destination cases match; ${destinations} destinations.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-tee-destination.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
