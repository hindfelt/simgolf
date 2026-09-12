"""Continuous native cup-completion caller with controlled sound/visual/scoring effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4093b0,0x426b00]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];mutate=False

def hook(u,a,size,data):
 if a==0x4295ef:u.emu_stop()
 if a in [0x40c1f0,0x4093b0,0x426b00]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(4 if a==0x40c1f0 else 1)],x=read(0x577fdc),z=read(0x577fe0),strokes=u.mem_read(0x577f2a,1)[0]))
  if mutate:
   if a==0x40c1f0:put(0x577fdc,12345)
   if a==0x4093b0:u.mem_write(0x577f2a,b'\xff')
   if a==0x426b00:put(0x577fec,100);put(0x577f18,0x40001);u.mem_write(0x577f29,b'\x02');put(0x820454,read(0x820454)+1)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1000):
 b=bytearray(256);b[0x29]=1;b[0x2a]=rng.choice([0,1,8,255]);struct.pack_into('<ii',b,0xdc,rng.randrange(51200),rng.randrange(51200));struct.pack_into('<i',b,0xec,rng.randrange(320));struct.pack_into('<I',b,0x18,rng.randrange(2**32));tile=dict(x=rng.randrange(50),z=rng.randrange(50));visual=rng.choice([-1,0,15]);mutate=i%2==0
 q=dict(actorId=0,actors=[list(b)],ballTile=tile,visualSlot=visual,seed=17)
 u.mem_write(0x577f00,bytes(b));put(0x820454,17);put(0x102010,0);put(0x102018,tile['x']);put(0x102030,visual)
 calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,tile['z']);u.emu_start(0x42c3f4,0x400fff,count=10000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),seed=read(0x820454),calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-cup-completion.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalCupCompletion}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));const calls=[];const a=originalCupCompletion(r.q,(e,state)=>{const v=new DataView(state.actors[0].buffer);calls.push({...e,x:v.getUint32(0xdc,true),z:v.getUint32(0xe0,true),strokes:state.actors[0][0x2a]});if(r.mutate){if(e.address===0x40c1f0)v.setInt32(0xdc,12345,true);if(e.address===0x4093b0)state.actors[0][0x2a]=255;if(e.address===0x426b00){v.setInt32(0xec,100,true);v.setUint32(0x18,0x40001,true);state.actors[0][0x29]=2;state.seed++;}}return {state};});const actual={actor:Array.from(a.state.actors[0]),seed:a.state.seed,calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1000 continuous native cup completion cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
