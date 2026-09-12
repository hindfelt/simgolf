"""Continuous native motion block against assembled JS step on uniform terrain.
Original projection/RNG/collisions execute; height/slope are flat samples and
presentation/scoring callbacks are no-ops. This is not the outer golfer loop.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4672d0,0x426b00,0x4093b0,0x4096e0]:u.mem_write(a,b'\xc3')
for a in [0x42f110,0x40c140]:u.mem_write(a,b'\x31\xc0\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
draws=0;captured=False;sounds=[]
def hook(u,a,size,data):
 global draws,captured
 if a in [0x4295ef,0x42ca9d]:u.emu_stop()
 if a==0x45ba70:draws+=1
 if a==0x42c477:captured=True
 if a==0x40c1f0:sounds.append(read(u.reg_read(UC_X86_REG_ESP)+4))
u.hook_add(UC_HOOK_CODE,hook)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(2002);rows=[]
for i in range(120):
 code=[1,10,12,13,17][i%5];cell=dict(code=code,flags=0,edgeFlags=0,rollCoefficient=3,bounceCoefficient=4,scatterCoefficient=i%3-1)
 u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x53ba00,b'\0'*5000);u.mem_write(0x5608b0,b'\0'*2500)
 u.mem_write(0x576dc0+code*48,bytes([4,3,cell['scatterCoefficient']&255]));u.mem_write(0x5a1f30,b'\x00')
 b=dict(x=20992,z=20992,height=rng.choice([0,100,300]),speed=rng.randrange(100,2000),verticalSpeed=rng.choice([0,400,-400]),heading=rng.randrange(2**32),angularOffset=rng.choice([0,0x1000000,-0x1000000]),seed=17)
 q=dict(ball=b,originTerrainCode=code,club=13,eventFlag=False,centreFlag=0,stateFlags=0,skillEnabled=bool(i%2),skillMask=512,luck=60,targetTile=dict(x=20,z=20),variant=0,seed=rng.randrange(2**32),phaseCounter=0)
 write(0x577fcc,b['x']);write(0x577fd0,b['z']);u.mem_write(0x577f24,b'\x0d');write(0x59d208,0)
 u.mem_write(0x577f20,bytes([q['skillEnabled']]));u.mem_write(0x577f1e,struct.pack('<H',512));u.mem_write(0x578001,b'\x3c');u.mem_write(0x577f29,b'\x01')
 write(0x574518+520,20);write(0x57451c+520,20)
 initial=json.loads(json.dumps(q));steps=[]
 for tick in range(400):
  sp=0x102000;u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EDI,q['ball']['x']>>10)
  for name,a in [('x',0x577fdc),('z',0x577fe0),('height',0x577fe4),('speed',0x577fec),('verticalSpeed',0x577ff0),('heading',0x577fe8),('angularOffset',0x577ff4)]:write(a,q['ball'][name])
  for a,v in [(0x820454,q['seed']),(0x831828,q['phaseCounter']),(0x577f18,q['stateFlags']),(sp+0x28,q['centreFlag']),(sp+0x30,-1)]:write(a,v)
  u.emu_start(0x4285bb,0x4285ff,count=1000)
  u.reg_write(UC_X86_REG_EDI,q['ball']['x']>>10)
  draws=0;captured=False;sounds=[]
  u.emu_start(0x42bdc3,0x400fff,count=200000)
  ball=dict(x=signed(0x577fdc),z=signed(0x577fe0),height=signed(0x577fe4),speed=signed(0x577fec),verticalSpeed=signed(0x577ff0),heading=read(0x577fe8),angularOffset=signed(0x577ff4),seed=read(0x820454))
  e=dict(ball=ball,stateFlags=read(0x577f18),centreFlag=read(sp+0x28),rngState=read(0x820454),draws=draws,captured=captured,stopped=captured or ball['speed']<64 and ball['height']==0 and ball['verticalSpeed']==0,sounds=sounds)
  steps.append(e)
  q.update(ball=ball,stateFlags=e['stateFlags'],centreFlag=e['centreFlag'],seed=e['rngState'],phaseCounter=q['phaseCounter']+1)
  if e['stopped']:break
 assert steps[-1]['stopped'], 'Trajectory did not finish within the verification limit'
 rows.append(dict(q=initial,cell=cell,steps=steps))
module=(root/'simgolf-reborn/scene/src/simulation/original-motion-step.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalMotionStep}=await import(MODULE);let count=0;
for(const row of JSON.parse(readFileSync(0,'utf8'))){let q=row.q;const world={cellAt:()=>row.cell,heightAt:()=>0,slopeAt:()=>0};
for(const e of row.steps){const a=originalMotionStep(q,world);count++;
for(const key of Object.keys(e))if(!isDeepStrictEqual(a[key],e[key]))throw Error(JSON.stringify({key,q,a,e}));
q={...q,ball:a.ball,stateFlags:a.stateFlags,centreFlag:a.centreFlag,seed:a.rngState,phaseCounter:q.phaseCounter+1};q=JSON.parse(JSON.stringify(q));}}
console.log(`120 trajectories / ${count} steps match continuous native motion on five uniform terrains.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
