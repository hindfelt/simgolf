"""Native partner-dependent secondary facility selection."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
calls=[]
def hook(u,a,size,data):
 global end
 if a in [0x429c40,0x429c49]:end=hex(a);u.emu_stop()
 if a==0x40daa0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[get(sp+4),get(sp+8),get(sp+12)]))
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(429947);rows=[]
for i in range(1200):
 b=bytearray(512);records=bytearray(4096);widths=[2]*16;struct.pack_into('<ii',b,8,24000,24000);struct.pack_into('<I',b,0x18,rng.choice([0,0,0x4000000]));widths[3]=rng.choice([1,2,3,4])
 for j in range(256):
  struct.pack_into('<hhh',records,j*16,rng.choice([-1,3,8]),rng.randrange(3,45),rng.randrange(3,45));records[j*16+7]=rng.choice([0,64,64,64,64])
 struct.pack_into('<h',b,0xaa,1);struct.pack_into('<h',b,0xc6,rng.randint(-32768,32767));struct.pack_into('<h',b,256+0xc6,rng.randint(-32768,32767));b[256+0x2a]=rng.randrange(2)
 q=dict(actorId=0,destination=dict(x=22000,z=23000),queueClock=rng.choice([0,2147483647,-2147483648]),serviceIndex=-1,nearestFacilityDistance=65535)
 put(0x568f6c,q['queueClock']);put(0x10201c,-1);put(0x5679bc,65535)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x58a708,bytes(records));u.mem_write(0x4c16b8+3*20,bytes([widths[3]]));u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,22000);u.reg_write(UC_X86_REG_ESI,23000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ECX,0xffffffff);end=None;calls=[];u.emu_start(0x429aae,0x400fff,count=40000);assert end
 e=dict(actor=list(u.mem_read(0x577f00,256)),serviceIndex=get(0x10201c),distance=get(0x5679bc),destination=dict(x=u.reg_read(UC_X86_REG_EBX),z=u.reg_read(UC_X86_REG_ESI)),calls=calls,next=end)
 rows.append([q,list(b),list(records),widths,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPartnerService}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let selected=0;for(const [q,b,f,w,e] of rows){const r=originalWalkingPartnerService({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],facilityRecords:new Uint8Array(f),facilityWidths:w});const a={actor:Array.from(r.state.actors[0]),serviceIndex:r.serviceIndex,distance:r.state.nearestFacilityDistance,destination:r.destination,calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));selected+=r.serviceIndex>=0;}console.log(`${rows.length} native service selections match; ${selected} accepted stops.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-partner-service.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
