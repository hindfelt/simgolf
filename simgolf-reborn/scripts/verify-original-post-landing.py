"""Native final landing reactions with controlled range/effect callbacks."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x4093b0,0x4219e0,0x4672d0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];mutate=False;reply_range=0

def hook(u,a,size,data):
 if a==0x4295ef:u.emu_stop()
 if a in [0x4093b0,0x4219e0,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(3 if a==0x4672d0 else 1)]))
  if a==0x4219e0:u.reg_write(UC_X86_REG_EAX,reply_range)
  if mutate:
   if a==0x4093b0:u.mem_write(0x577f78,b'\x63')
   if a==0x4219e0:u.mem_write(0x577f29,b'\x06')
   if a==0x4672d0:put(0x577f18,read(0x577f18)|0x40);u.mem_write(0x577f8c,b'\x03')
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1600):
 b=bytearray(256);b[0x29]=rng.choice([1,3,4]);b[0x2a]=rng.choice([1,2]);b[0x78]=5;b[0x8c]=rng.choice([0,0,3]);struct.pack_into('<I',b,0x18,rng.choice([1,4,0x20,0x40,0x60]));struct.pack_into('<ii',b,0xcc,10000,10000);struct.pack_into('<ii',b,0xdc,20000,20000)
 code=rng.choice([1,12,17,20]);scatter=rng.choice([-1,0,1]);prior=rng.choice([5,6]);visual=rng.choice([-1,2]);reply_range=rng.choice([100,500]);mutate=i%2==0
 q=dict(actor=list(b),code=code,scatter=scatter,prior=prior,visual=visual)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x576dc2+code*48,bytes([scatter&255]));put(0x102010,0);put(0x102018,20);put(0x102020,20);put(0x102030,visual);put(0x10204c,prior);put(0x102050,0x576dc2+code*48)
 calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,code);u.emu_start(0x42d110,0x400fff,count=10000)
 rows.append(dict(q=q,mutate=mutate,reply_range=reply_range,expected=dict(actor=list(u.mem_read(0x577f00,256)),calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-post-landing.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalPostLanding}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,metadata=[];metadata[q.code]={scatterCoefficient:q.scatter};const a=originalPostLanding({actorId:0,actors:[Uint8Array.from(q.actor)],landingTile:{x:20,z:20},landingTerrain:q.code,terrain:new Uint8Array(2500).fill(q.code),metadata,priorMood:q.prior,visualSlot:q.visual},(e,state)=>{if(r.mutate){if(e.address===0x4093b0)state.actors[0][0x78]=99;if(e.address===0x4219e0)state.actors[0][0x29]=6;if(e.address===0x4672d0){const v=new DataView(state.actors[0].buffer);v.setUint32(0x18,v.getUint32(0x18,true)|0x40,true);state.actors[0][0x8c]=3;}}return {state,result:r.reply_range};});const actual={actor:Array.from(a.state.actors[0]),calls:a.calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1600 continuous native post-landing cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
