"""Native shot-line branch with controlled projection/draw callbacks."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x42f270,0x42f020]:u.mem_write(a,b'\xc3')
u.mem_write(0x47edd0,b'\xc2\x14\x00')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];points=[];index=0
def hook(u,a,size,data):
 global index
 if a in [0x42f270,0x42f020,0x47edd0]:
  sp=u.reg_read(UC_X86_REG_ESP)
  if a==0x47edd0:calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(5)]));return
  args=[signed(sp+4),signed(sp+8)]
  if a==0x42f270:args.append(signed(sp+20))
  calls.append(dict(address=a,args=args));point=points[index];index+=1
  put(read(sp+12),point['x']);put(read(sp+16),point['y']);u.reg_write(UC_X86_REG_EAX,int(point['visible']))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1000):
 b=bytearray(256);struct.pack_into('<I',b,0x18,0x10000000 if i%2 else 0);struct.pack_into('<iiii',b,0xcc,20000,25000,20,30);struct.pack_into('<i',b,0xec,rng.choice([0,100]));b[0x29]=1
 flags=rng.choice([0,32]);terrain=rng.choice([1,10]);points=[dict(x=100+j*20,y=150+j*30,visible=rng.choice([True,True,False])) for j in range(3)]
 q=dict(actorId=0,actors=[list(b)],globalFlags=flags,ballTerrain=terrain,holeTargets=[None,dict(x=25,z=35)])
 u.mem_write(0x577f00,bytes(b));put(0x59d208,flags);put(0x102014,terrain);put(0x574518+520,25);put(0x57451c+520,35)
 calls=[];index=0;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,0);u.emu_start(0x42889c,0x428992,count=1000)
 rows.append(dict(q=q,points=points,calls=calls))
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-line.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalShotLine}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(a=>Uint8Array.from(a));let i=0;const a=originalShotLine(r.q,(e,state)=>({state,point:e.address===0x47edd0?undefined:r.points[i++]}));if(!isDeepStrictEqual(a.calls,r.calls))throw Error(JSON.stringify({r,a}));}console.log('1000 native shot-line dispatch cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
