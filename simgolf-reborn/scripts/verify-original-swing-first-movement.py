"""Animation completion -> swing impact -> first position step, with actual trig."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
effects={0x42f110:2,0x4096e0:1,0x4672d0:3,0x40c1f0:4,0x409820:1,0x409780:1}
for a in effects:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];exit_address=None

def hook(u,a,n,d):
 global exit_address
 if a in [0x4295ef,0x42beb0]:exit_address=a;u.emu_stop()
 if a in effects:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(effects[a])]))
  u.reg_write(UC_X86_REG_EAX,0)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(512);rows=[]
for i in range(500):
 b=bytearray(256);b[0x24]=rng.choice([0,6,7,10,13]);b[0x25]=16;b[0x28]=1;b[0x22]=i%8;b[0x21]=rng.randrange(8)
 for off,v in [(8,20992),(12,20992),(0x10,-1),(0x18,rng.choice([0,0x400000])),(0xdc,20992),(0xe0,20992),(0xe4,0),(0xec,rng.randrange(100,4000)),(0xf0,0),(0xe8,rng.randrange(2**32))]:struct.pack_into('<I',b,off,v&0xffffffff)
 counts=[rng.choice([0,1,2,6,8]) for _ in range(160)];terrain=rng.choice([1,2]);q=dict(actor=list(b),actorId=0,globalFlags=0,ballTerrain=terrain,visualSlot=-1,phaseCounter=i,animationDirection=i%8,frameCounts=counts)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x53e2f8,struct.pack('<160i',*counts));put(0x59d208,0);put(0x831828,i);put(0x102010,0);put(0x102014,terrain);put(0x102030,-1);put(0x10204c,0);calls=[];animation_ticks=0
 while u.mem_read(0x577f28,1)[0]!=2:
  animation_ticks+=1;assert animation_ticks<=10
  put(0x102038,u.mem_read(0x577f26,1)[0]);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,q['animationDirection']);u.emu_start(0x414f79,0x41503b,count=1000)
 for ticks in range(1,10):
  exit_address=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,u.mem_read(0x577f28,1)[0]);u.emu_start(0x42bb3b,0x400fff,count=10000)
  if exit_address==0x42beb0:break
 assert exit_address==0x42beb0
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(0x577f00,256)),calls=calls,animationTicks=animation_ticks,swingTicks=ticks)))
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorSwingAnimation}=await import(ANIMATION),{originalSwingProgress}=await import(SWING),{originalActorPositionStep}=await import(POSITION);for(const {q,expected} of JSON.parse(readFileSync(0,'utf8'))){let state={...q,actors:[Uint8Array.from(q.actor)]},frameIndex=0,animationTicks=0,swingTicks=0;const calls=[],resolve=(e,state)=>{calls.push(e);return {state,value:0};};while(state.actors[0][0x28]!==2){if(++animationTicks>10)throw Error('Animation did not complete');const r=originalActorSwingAnimation(state,{animationDirection:q.animationDirection,frameCounts:q.frameCounts,previousFrame:state.actors[0][0x26],frameIndex});state=r.state;frameIndex=r.frameIndex;}for(swingTicks=1;swingTicks<10;swingTicks++){const r=originalSwingProgress(state,resolve);state=r.state;if(r.next==='motion'){state=originalActorPositionStep(state,resolve).state;break;}}const actual={actor:Array.from(state.actors[0]),calls,animationTicks,swingTicks};if(!isDeepStrictEqual(actual,expected)){console.error(JSON.stringify({diff:actual.actor.flatMap((v,i)=>v===expected.actor[i]?[]:[[i,v,expected.actor[i]]]),calls,expectedCalls:expected.calls,animationTicks,expectedAnimation:expected.animationTicks,swingTicks,expectedSwing:expected.swingTicks}));process.exit(1);}}console.log('500 native animation-to-impact-to-first-movement sequences match.');"""
for key,name in [('ANIMATION','original-swing-animation'),('SWING','original-swing-progress'),('POSITION','original-actor-position-step')]:script=script.replace(key,json.dumps((root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
