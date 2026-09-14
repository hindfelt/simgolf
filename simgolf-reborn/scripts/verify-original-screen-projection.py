"""Compare full original screen projection with controlled terrain helper outputs."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
o=p.get_offset_from_rva(0x42f270-0x400000);u.mem_write(0x42f270,p.__data__[o:o+0x485])
for a in (0x42eb90,0x40bcd0):u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
q=None;calls=[]
def hook(u,a,size,data):
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x42eb90:
  calls.append(['object',get(sp+4),get(sp+8)]);put(get(sp+12),0);put(get(sp+16),q['terrain']['object'])
 if a==0x40bcd0:
  d=get(sp+12);calls.append(['corner',get(sp+4),get(sp+8),d]);u.reg_write(UC_X86_REG_EAX,q['terrain']['corners'][str(d)]&0xffffffff)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2400):
 q=dict(x=rng.randrange(5*1024,40*1024),z=rng.randrange(5*1024,40*1024),cameraX=20,cameraZ=20,scale=rng.choice([1,2,3,4,8]),width=rng.choice([800,1024,1280]),height=rng.choice([600,768,1024]),rotation=[0,2,4,6][(i//6)%4],margin=rng.choice([0,20,100]),heightScale=rng.choice([8,16,32]),magnify=bool((i//24)%2),terrain=dict(flags=[0,2,4,8,6,10][i%6],object=rng.randrange(-5,12),stored=rng.randrange(-5,12),corners={str(d):rng.randrange(-5,12) for d in [5,7,1,3]}))
 if i%7==0:q['terrain']['corners']={str(d):4 for d in [5,7,1,3]}
 sp=0x102000;idx=(q['x']>>10)*50+(q['z']>>10)
 for a,v in [(sp,0x401000),(sp+4,q['x']),(sp+8,q['z']),(sp+12,0x103000),(sp+16,0x103004),(sp+20,q['margin']),(0x4c1b98,q['cameraX']),(0x4c1b9c,q['cameraZ']),(0x4c183c,q['scale']),(0x820348,q['width']),(0x82034c,q['height']),(0x5672a4,q['rotation']),(0x4c1df0,q['heightScale']),(0x5a8708,q['magnify']),(0x576dcc+2*48,q['terrain']['flags'])]:put(a,v)
 u.mem_write(0x570d38+idx,b'\x02');u.mem_write(0x541f28+idx,bytes([q['terrain']['stored']&255]))
 u.reg_write(UC_X86_REG_ESP,sp);calls=[];u.emu_start(0x42f270,0x401000,count=1500);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,dict(result=dict(x=get(0x103000),y=get(0x103004),visible=bool(u.reg_read(UC_X86_REG_EAX))),calls=calls)])
module=(root/'simgolf-reborn/scene/src/simulation/original-screen-projection.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalScreenProjection} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const calls=[];const result=originalScreenProjection(q,{flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:(c,r)=>{calls.push(['object',c,r]);return q.terrain.object;},cornerHeight:(c,r,d)=>{calls.push(['corner',c,r,d]);return q.terrain.corners[d];}});const got={result,calls};if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native screen-projection cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-screen-projection.json').write_text(json.dumps(rows[:144],separators=(',',':'))+'\n')
