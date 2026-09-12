"""Continuous native service fallback with actual marked-tile search."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
calls=[]
def hook(u,a,size,data):
 global end
 if a in [0x429aae,0x429b5f]:end=hex(a);u.emu_stop()
 if a==0x40db60:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[get(sp+4),get(sp+8),get(sp+12)]))
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(429947);rows=[]
for i in range(1200):
 b=bytearray(256);tiles=[512 if rng.randrange(12)==0 else 0 for _ in range(2500)];struct.pack_into('<ii',b,8,rng.randrange(51200),rng.randrange(51200));flags=rng.choice([0,0x2000,0x1000,0x2000000,0x2003000]);struct.pack_into('<I',b,0x18,flags);struct.pack_into('<h',b,0xb2,rng.choice([-32768,-1,0,1,19,20,100,119,120,121,32767]))
 q=dict(actorId=0,destination=dict(x=22000,z=23000),waitingGroups=rng.choice([0,1,5,7]),serviceIndex=-1,skipPrimaryService=bool(i%2),serviceTileZ=37,nearestFacilityDistance=65535,serviceTileX=-1)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x53ba00,struct.pack('<2500H',*tiles));put(0x102038,q['waitingGroups']);put(0x10201c,-1);put(0x56936c,-1);put(0x569370,37);put(0x5679bc,65535);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,flags);u.reg_write(UC_X86_REG_EBX,22000);u.reg_write(UC_X86_REG_ESI,23000);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;calls=[];u.emu_start(0x429a84 if q['skipPrimaryService'] else 0x4299c0,0x400fff,count=40000);assert end
 e=dict(actor=list(u.mem_read(0x577f00,256)),serviceIndex=get(0x10201c),distance=get(0x5679bc),tileX=get(0x56936c),tileZ=get(0x569370),destination=dict(x=u.reg_read(UC_X86_REG_EBX),z=u.reg_read(UC_X86_REG_ESI)),calls=calls,next=end)
 rows.append([q,list(b),tiles,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingServiceFallback}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let selected=0;for(const [q,b,t,e] of rows){const r=originalWalkingServiceFallback({...q,actors:[new Uint8Array(b)],tileFlags:new Uint16Array(t)});const a={actor:Array.from(r.state.actors[0]),serviceIndex:r.serviceIndex,distance:r.state.nearestFacilityDistance,tileX:r.state.serviceTileX,tileZ:r.state.serviceTileZ,destination:r.destination,calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));selected+=r.serviceIndex===-2;}console.log(`${rows.length} native service fallbacks match; ${selected} accepted stops.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-service-fallback.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
