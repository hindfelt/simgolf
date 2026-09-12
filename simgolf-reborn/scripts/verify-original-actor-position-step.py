"""Native position/gravity ordering with callback mutations and original trig."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x42f110,0x4096e0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];base=0;mutate=False

def hook(u,a,size,data):
 if a==0x42beb0:u.emu_stop()
 if a in [0x42f110,0x4096e0]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(2 if a==0x42f110 else 1)],vertical=read(base+0xf0)))
  if a==0x42f110:u.reg_write(UC_X86_REG_EAX,123)
  if mutate:
   if a==0x42f110:put(base+0xdc,21000)
   if a==0x4096e0:put(base+0xf0,200);put(0x831828,0)
u.hook_add(UC_HOOK_CODE,hook);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(10212);rows=[]
for i in range(1500):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(256)
 for off,v in [(0xdc,20992),(0xe0,20992),(0xe4,rng.choice([0,0,100])),(0xec,rng.randrange(-200,2000)),(0xf0,rng.choice([0,1,32,63,64,-1,200])),(0xe8,rng.randrange(2**32))]:struct.pack_into('<I',b,off,v&0xffffffff)
 visual=rng.choice([-1,0,15]);phase=rng.choice([0,1,8]);mutate=i%2==0;q=dict(actorId=id,actor=list(b),visualSlot=visual,phaseCounter=phase)
 u.mem_write(base,bytes(b));put(0x831828,phase);put(0x102030,visual);calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x42bdc3,0x400fff,count=3000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(base,256)),phaseCounter=read(0x831828),previousTerrainHeight=read(0x10207c),stepX=read(0x102070),stepCosine=read(0x10206c),calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-position-step.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorPositionStep}=await import(MODULE);let effects=0;for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[],calls=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalActorPositionStep({...q,actors},(e,state)=>{const v=new DataView(state.actors[q.actorId].buffer);calls.push({...e,vertical:v.getInt32(0xf0,true)});if(r.mutate){if(e.address===0x42f110)v.setInt32(0xdc,21000,true);if(e.address===0x4096e0){v.setInt32(0xf0,200,true);state.phaseCounter=0;}}return {state,value:123};});const actual={actor:Array.from(a.state.actors[q.actorId]),phaseCounter:a.state.phaseCounter,previousTerrainHeight:a.previousTerrainHeight,stepX:a.stepX,stepCosine:a.stepCosine,calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));effects+=calls.length;}console.log(`1500 native actor position steps match; ${effects} height/visual effects.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
