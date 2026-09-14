"""Native fatigue and animation with controlled reaction mutation."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[];q={}
def hook(u,a,size,data):
 global end
 if a in [0x4295ef,0x42d23c,0x42b825]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a in [0x40c140,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,4)];calls.append(dict(address=a,args=args))
  if a==0x4672d0:u.mem_write(0x577f8d,bytes([args[1]]))
  u.reg_write(UC_X86_REG_EAX,0);u.reg_write(UC_X86_REG_EIP,get(sp)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42);rows=[]
for i in range(1400):
 b=bytearray(256);struct.pack_into('<h',b,0xb2,rng.choice([0,159,160,199,200,32767,-32768]));struct.pack_into('<h',b,0xb6,rng.choice([0,3]));b[0x29]=rng.choice([1,6,12,18,19]);b[0x20]=rng.choice([0,32]);b[0x25]=rng.choice([0,7,8,9,10,11,127,255]);struct.pack_into('<i',b,0xec,rng.choice([0,1]));struct.pack_into('<h',b,0x1c,100)
 q=dict(actorId=0,actorIndex=10,nextTerrain=10,phaseCounter=rng.choice([0,0,24,25]),walkingOverride=rng.randrange(2),worldFlags=rng.choice([0,16]),destination=dict(x=23000,z=24000));metadata=[dict(walkingCost=rng.choice([-1,0,1,3])) for _ in range(23)];flags=rng.choice([0,32]);u.mem_write(0x577f00,bytes(b));u.mem_write(0x53ba00+20,struct.pack('<H',flags));put(0x831828,q['phaseCounter']);put(0x59d208,q['worldFlags']);put(0x102010,0);put(0x10203c,10);put(0x10206c,10*48);put(0x102034,q['walkingOverride']);u.mem_write(0x576dc5+10*48,bytes([metadata[10]['walkingCost']&255]));u.reg_write(UC_X86_REG_EBX,23000);u.reg_write(UC_X86_REG_ESI,24000)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);end=None;calls=[];u.emu_start(0x42b2b2,0x400fff,count=10000);assert end
 rows.append([q,list(b),metadata,flags,dict(actor=list(u.mem_read(0x577f00,256)),calls=calls,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPostStep}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,metadata,f,e] of rows){const terrain=new Uint8Array(2500),tileFlags=new Uint16Array(2500);tileFlags[10]=f;const r=originalWalkingPostStep({...q,actors:[new Uint8Array(b)],metadata,tileFlags},(event,state)=>{if(event.address===0x4672d0)state.actors[0][0x8d]=event.args[1];return {state,value:q.slope};});const a={actor:Array.from(r.state.actors[0]),calls:r.calls,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));}console.log(`${rows.length} native post-step cases match.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-post-step.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
