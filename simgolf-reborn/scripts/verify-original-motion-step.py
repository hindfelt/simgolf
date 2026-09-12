"""Continuous native motion block against assembled JS step on uniform and mixed terrain.
Original projection/RNG/collisions/height/slope execute with supplied corner
and vertex samples; presentation/scoring callbacks are no-ops. This is not the outer golfer loop.
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
for a in [0x40bcd0,0x40be60]:u.mem_write(a,b'\xc3')
elevated=False
def vertex(r,c):return 3+((r-20)//3)+((c-20)//3) if elevated else 3
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
draws=0;captured=False;sounds=[]
def hook(u,a,size,data):
 global draws,captured
 if a in [0x40bcd0,0x40be60]:
  sp=u.reg_read(UC_X86_REG_ESP);r=signed(sp+4);c=signed(sp+8)
  if a==0x40bcd0:
   d=read(sp+12);dr,dc={5:(0,0),7:(0,-1),1:(1,-1),3:(1,0)}[d];r+=dr;c+=dc
  u.reg_write(UC_X86_REG_EAX,vertex(r,c)&0xffffffff)
 if a in [0x4295ef,0x42ca9d]:u.emu_stop()
 if a==0x45ba70:draws+=1
 if a==0x42c477:captured=True
 if a==0x40c1f0:sounds.append(read(u.reg_read(UC_X86_REG_ESP)+4))
u.hook_add(UC_HOOK_CODE,hook)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(2002);rows=[]
for i in range(360):
 code=[1,10,12,13,17][i%5];cell=dict(code=code,flags=0,metadataFlags=0,edgeFlags=0,rollCoefficient=3,bounceCoefficient=4,scatterCoefficient=i%3-1)
 u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x53ba00,b'\0'*5000);u.mem_write(0x5608b0,b'\0'*2500)
 elevated=i>=240
 mixed=i>=120
 def cell_code(x,z):return [1,10,12,13,17][(x+z+i)%5] if mixed else code
 if mixed:
  u.mem_write(0x570d38,bytes(cell_code(x,z) for x in range(50) for z in range(50)))
  u.mem_write(0x5608b0,bytes(5 if (x+z)%4==0 else 0 for x in range(50) for z in range(50)))
 for c in [1,10,12,13,17]:
  u.mem_write(0x576dc0+c*48,bytes([4,3,cell['scatterCoefficient']&255]));write(0x576dcc+c*48,0)
 u.mem_write(0x5a1f30,b'\x00')
 b=dict(x=20992,z=20992,height=rng.choice([0,100,300]),speed=rng.randrange(100,2000),verticalSpeed=rng.choice([0,400,-400]),heading=rng.randrange(2**32),angularOffset=rng.choice([0,0x1000000,-0x1000000]),seed=17)
 q=dict(ball=b,originTerrainCode=cell_code(20,20),club=13,eventFlag=False,centreFlag=0,stateFlags=0,skillEnabled=bool(i%2),skillMask=512,luck=60,targetTile=dict(x=20,z=20),variant=0,seed=rng.randrange(2**32),phaseCounter=0)
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
 rows.append(dict(q=initial,cell=cell,steps=steps,mixed=mixed,pattern=i,elevated=elevated))
terrainModule=(root/'simgolf-reborn/scene/src/simulation/original-motion-terrain.js').as_uri()
module=(root/'simgolf-reborn/scene/src/simulation/original-motion-step.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalMotionStep}=await import(MODULE);const {createOriginalMotionTerrain}=await import(TERRAIN);let count=0,crossings=0;
for(const row of JSON.parse(readFileSync(0,'utf8'))){let q=row.q;const vertex=(r,c)=>row.elevated?3+Math.floor((r-20)/3)+Math.floor((c-20)/3):3;const world=createOriginalMotionTerrain({globalFlags:0,readCell:(x,z)=>row.mixed?{...row.cell,code:[1,10,12,13,17][(x+z+row.pattern)%5],edgeFlags:(x+z)%4===0?5:0}:row.cell,readVertexHeight:vertex,readCornerHeight:(r,c,d)=>{const [dr,dc]={5:[0,0],7:[0,-1],1:[1,-1],3:[1,0]}[d];return vertex(r+dr,c+dc);}});
for(const e of row.steps){const a=originalMotionStep(q,world);count++;if(row.mixed&&((q.ball.x>>10)!==(a.ball.x>>10)||(q.ball.z>>10)!==(a.ball.z>>10)))crossings++;
for(const key of Object.keys(e))if(!isDeepStrictEqual(a[key],e[key]))throw Error(JSON.stringify({key,q,a,e}));
q={...q,ball:a.ball,stateFlags:a.stateFlags,centreFlag:a.centreFlag,seed:a.rngState,phaseCounter:q.phaseCounter+1};q=JSON.parse(JSON.stringify(q));}}
if(crossings===0)throw Error("No mixed terrain crossings exercised");
console.log(`360 trajectories / ${count} steps match native motion; ${crossings} mixed-terrain tile crossings.`);
""".replace('MODULE',json.dumps(module)).replace('TERRAIN',json.dumps(terrainModule))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
