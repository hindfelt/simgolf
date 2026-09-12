"""Animation completion -> swing impact -> rolling to rest and shot accounting, with actual trig."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
effects={0x40c140:3,0x42f110:2,0x4096e0:1,0x4672d0:3,0x40c1f0:4,0x409820:1,0x409780:1,0x4093b0:1,0x4219e0:1}
for a in effects:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];exit_address=None

def hook(u,a,n,d):
 global exit_address,moving
 if a==0x42bdc3:moving=True
 if a==0x4295ef:exit_address=a;u.emu_stop()
 if a==0x40bc90 and read(u.reg_read(UC_X86_REG_ESP))==0x42c7d5:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4),read(sp+8)]))
 if a in effects:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(effects[a])]))
  u.reg_write(UC_X86_REG_EAX,100 if a==0x4219e0 else 0)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(512);rows=[]
for i in range(500):
 b=bytearray(256);b[0x29]=1;b[0x2a]=i%3;b[0x24]=rng.choice([0,6,7,10,13]);b[0x25]=16;b[0x28]=1;b[0x22]=i%8;b[0x21]=rng.randrange(8)
 for off,v in [(8,20992),(12,20992),(0x10,-1),(0x18,rng.choice([0,0x400000])),(0xcc,20992),(0xd0,20992),(0xdc,20992),(0xe0,20992),(0xe4,0),(0xec,rng.randrange(100,1200)),(0xf0,0),(0xe8,rng.randrange(2**32))]:struct.pack_into('<I',b,off,v&0xffffffff)
 counts=[rng.choice([0,1,2,6,8]) for _ in range(160)];terrain=rng.choice([1,2]);q=dict(actor=list(b),actorId=0,globalFlags=0,ballTerrain=terrain,visualSlot=-1,phaseCounter=i,animationDirection=i%8,frameCounts=counts)
 u.mem_write(0x574500+520,bytes(520));u.mem_write(0x574500+520,b'\x04');put(0x574518+520,45);put(0x57451c+520,45);u.mem_write(0x5698c0,bytes(184*32));u.mem_write(0x53d934,bytes(2500));put(0x820344,0)
 u.mem_write(0x577f00,bytes(152*256));u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,bytes([terrain])*2500);u.mem_write(0x53ba00,bytes(5000));u.mem_write(0x5608b0,bytes(2500));u.mem_write(0x576dc0+terrain*48,bytes([4,3,0]));put(0x820454,17);put(0x102018,20);put(0x102020,20);put(0x102028,0);u.mem_write(0x53e2f8,struct.pack('<160i',*counts));put(0x59d208,0);put(0x831828,i);put(0x102010,0);put(0x102014,terrain);put(0x102030,-1);put(0x10204c,0);calls=[];animation_ticks=0
 while u.mem_read(0x577f28,1)[0]!=2:
  animation_ticks+=1;assert animation_ticks<=10
  put(0x102038,u.mem_read(0x577f26,1)[0]);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,q['animationDirection']);u.emu_start(0x414f79,0x41503b,count=1000)
 for ticks in range(1,10):
  exit_address=None;moving=False;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,u.mem_read(0x577f28,1)[0]);u.emu_start(0x42bb3b,0x400fff,count=10000)
  if moving:break
 assert moving and exit_address==0x4295ef
 motion_ticks=1
 for extra in range(150):
  if read(0x577fec)==0:break
  motion_ticks+=1
  put(0x102018,read(0x577fdc)>>10);put(0x102020,read(0x577fe0)>>10);put(0x102028,0);put(0x831828,i+extra+1);moving=False
  u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,u.mem_read(0x577f28,1)[0]);u.emu_start(0x42bb3b,0x400fff,count=10000)
  assert moving and exit_address==0x4295ef
 assert read(0x577fec)==0, "Ball did not stop"
 rows.append(dict(q=q,expected=dict(motionTicks=motion_ticks,hole=list(u.mem_read(0x574500+520,520)),stats=list(u.mem_read(0x5698c0,184*32)),wear=list(u.mem_read(0x53d934,2500)),seed=read(0x820454)&0xffffffff,actor=list(u.mem_read(0x577f00,256)),calls=calls,animationTicks=animation_ticks,swingTicks=ticks)))
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorSwingAnimation}=await import(ANIMATION),{originalSwingProgress}=await import(SWING),{originalActorBallMotion}=await import(POSITION),{originalActorMotionContext}=await import(CONTEXT);for(const {q,expected} of JSON.parse(readFileSync(0,'utf8'))){let state={...q,actors:Array.from({length:152},(_,i)=>i===0?Uint8Array.from(q.actor):new Uint8Array(256)),seed:17,worldFlags:0,luck:0,variant:0,terrain:new Uint8Array(2500).fill(q.ballTerrain),tileFlags:new Uint16Array(2500),edgeMasks:new Uint8Array(2500),metadata:Array.from({length:23},()=>({bounceCoefficient:4,rollCoefficient:3,scatterCoefficient:0}))},frameIndex=0,animationTicks=0,swingTicks=0;const h=new Uint8Array(520),hv=new DataView(h.buffer);h[0]=4;hv.setInt32(0x18,45,true);hv.setInt32(0x1c,45,true);Object.assign(state,{holeRecords:[null,h],statRecords:Array.from({length:32},()=>new Uint8Array(184)),tileWear:new Uint8Array(2500),difficulty:0});const calls=[],resolve=(e,state)=>{calls.push(e);return {state,result:100,value:e.address===0x40bc90?q.ballTerrain:0};};while(state.actors[0][0x28]!==2){if(++animationTicks>10)throw Error('Animation did not complete');const r=originalActorSwingAnimation(state,{animationDirection:q.animationDirection,frameCounts:q.frameCounts,previousFrame:state.actors[0][0x26],frameIndex});state=r.state;frameIndex=r.frameIndex;}for(swingTicks=1;swingTicks<10;swingTicks++){const r=originalSwingProgress(state,resolve);state=r.state;if(r.next==='motion'){state=originalActorBallMotion(originalActorMotionContext(state),resolve).state;break;}}let motionTicks=1;for(let extra=0;extra<150;extra++){if(new DataView(state.actors[0].buffer).getInt32(0xec,true)===0)break;motionTicks++;state.phaseCounter=q.phaseCounter+extra+1;state=originalSwingProgress(state,resolve).state;state=originalActorBallMotion(originalActorMotionContext(state),resolve).state;}const actual={motionTicks,hole:Array.from(state.holeRecords[1]),stats:state.statRecords.flatMap(x=>Array.from(x)),wear:Array.from(state.tileWear),seed:state.seed,actor:Array.from(state.actors[0]),calls,animationTicks,swingTicks};if(!isDeepStrictEqual(actual,expected)){console.error(JSON.stringify({motionTicks,expectedMotion:expected.motionTicks,holeDiff:actual.hole.flatMap((v,i)=>v===expected.hole[i]?[]:[[i,v,expected.hole[i]]]),statDiff:actual.stats.flatMap((v,i)=>v===expected.stats[i]?[]:[[i,v,expected.stats[i]]]),diff:actual.actor.flatMap((v,i)=>v===expected.actor[i]?[]:[[i,v,expected.actor[i]]]),calls,expectedCalls:expected.calls,animationTicks,expectedAnimation:expected.animationTicks,swingTicks,expectedSwing:expected.swingTicks}));process.exit(1);}}console.log('500 native swing sequences through rest match actor, hole, statistics, wear, RNG and effects.');"""
for key,name in [('ANIMATION','original-swing-animation'),('SWING','original-swing-progress'),('POSITION','original-actor-ball-motion'),('CONTEXT','original-actor-motion-context')]:script=script.replace(key,json.dumps((root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
