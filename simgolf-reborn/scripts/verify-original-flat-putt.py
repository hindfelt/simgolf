"""Compare composed native flat-green blocks with resumable JS rolls.
Not the full game caller: flat slope and scoring/audio callbacks are stubbed.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_ESI,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image())
u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4093b0,0x426b00]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def stop(u,a,size,data):
 if a in [0x42c47c,0x42c480,0x4295ef]:u.emu_stop()
u.hook_add(UC_HOOK_CODE,stop)
# Flat terrain slope sampling only; projection/RNG/distance/clamp execute natively.
u.mem_write(0x40c140,b'\x31\xc0\xc3')
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000)
u.emu_start(0x491380,0x4913bc,count=20000)

def unsigned(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def tick(q,phase,seed):
 sp=0x102000;u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESP,sp)
 for field,addr in [('x',0x577fdc),('z',0x577fe0),('height',0x577fe4),('heading',0x577fe8),('speed',0x577fec),('verticalSpeed',0x577ff0),('angularOffset',0x577ff4)]:write(addr,q[field])
 write(0x831828,phase);write(0x820454,seed)
 u.emu_start(0x4285bb,0x4285ff,count=1000)
 # Position block follows a two-argument height call whose stack is still live.
 u.reg_write(UC_X86_REG_ESP,sp-8)
 u.emu_start(0x42bddd,0x42be61,count=1000)
 assert u.reg_read(UC_X86_REG_ESP)==sp
 write(sp+0x1c,0);write(sp+0x50,0)
 u.reg_write(UC_X86_REG_EAX,q['x']);u.reg_write(UC_X86_REG_ECX,q['z'])
 u.emu_start(0x42c13a,0x42c27b,count=2000)
 assert u.reg_read(UC_X86_REG_ESP)==sp
 write(sp+0x30,-1)
 u.emu_start(0x42c354,0x400fff,count=10000)
 end=u.reg_read(UC_X86_REG_EIP);assert end in [0x42c47c,0x42c480,0x4295ef]
 captured=end==0x4295ef
 stopped=False
 if not captured:
  u.emu_start(0x42ca6c,0x42ca9d,count=100)
  stopped=u.reg_read(UC_X86_REG_EIP)==0x42ca9d
 ball=dict(x=read(0x577fdc),z=read(0x577fe0),height=read(0x577fe4),heading=unsigned(0x577fe8),speed=read(0x577fec),verticalSpeed=read(0x577ff0),angularOffset=read(0x577ff4),seed=unsigned(0x820454))
 return ball,'captured' if captured else 'stopped' if stopped else 'rolling'
rng=random.Random(2002);rows=[]
for i in range(160):
 config=dict(cupX=20,cupZ=20,eventFlag=bool(i%2),rollCoefficient=2+i%3)
 launch=dict(x=20992+rng.randrange(-90,91),z=20992+rng.randrange(100,1200),height=0,verticalSpeed=0,club=13,heading=rng.choice([0,0,0,0x01000000,0xff000000]),angularOffset=rng.choice([0,0x04000000,-0x04000000]),speed=rng.randrange(70,1600),seed=rng.randrange(2**32))
 u.mem_write(0x570d38,b'\x01'*2500);u.mem_write(0x53ba00,b'\0'*5000)
 u.mem_write(0x53ba00+(20*50+20)*2,b'\x80\x00');u.mem_write(0x576df1,bytes([config['rollCoefficient']]))
 write(0x577fcc,launch['x']);write(0x577fd0,launch['z']);u.mem_write(0x577f24,b'\x0d');write(0x59d208,0x200000 if config['eventFlag'] else 0)
 ball=launch.copy();phase=rng.choice([0,7,19,0xfffffffc]);steps=[]
 for j in range(300):
  seed=ball['seed'] if j%11 else rng.randrange(2**32)
  ball,status=tick(ball,phase,seed);steps.append(dict(phaseCounter=phase,seed=seed,ball=ball,status=status));phase=(phase+1)&0xffffffff
  if status!='rolling':break
 assert status!='rolling'
 rows.append(dict(launch=launch,config=config,steps=steps))
module=(root/'simgolf-reborn/scene/src/simulation/original-flat-putt.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalFlatPuttStart,originalFlatPuttStep}=await import(MODULE);let ticks=0;
for(const q of JSON.parse(readFileSync(0,'utf8'))){let state=originalFlatPuttStart(q.launch,q.config);
for(const e of q.steps){state=originalFlatPuttStep(state,e).state;ticks++;
if(!isDeepStrictEqual(state.ball,e.ball)||state.status!==e.status)throw Error(JSON.stringify({q:q.launch,e,a:state}));
state=JSON.parse(JSON.stringify(state));}}
console.log(`160 complete flat-green rolls / ${ticks} steps match composed native blocks, with JSON resume each step.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
