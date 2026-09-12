"""Verify pre-movement cell sampling and native cup checks across tile crossings.

This executes the sampling and cup blocks, not the intervening full ball update.
Sound/scoring callbacks are no-ops; the actual map and distance helpers execute.
"""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_ESI,UC_X86_REG_EIP
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
def run(q):
 sp=0x102000;u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0)
 u.mem_write(0x570d38,b'\x01'*2500);u.mem_write(0x53ba00,b'\0'*5000)
 write(0x577fdc,q['beforeX']);write(0x577fe0,q['beforeZ'])
 u.emu_start(0x4285bb,0x4285ff,count=1000)
 cx=read(sp+0x18);cz=read(sp+0x20);terrain=read(sp+0x14)
 assert (cx,cz)==(q['beforeX']>>10,q['beforeZ']>>10)
 write(0x577fdc,q['x']);write(0x577fe0,q['z']);write(0x577fec,q['speed'])
 u.mem_write(0x577f24,b'\x0d');write(0x59d208,0x200000 if q['eventFlag'] else 0)
 u.mem_write(0x53ba00+(q['cupX']*50+q['cupZ'])*2,b'\x80\x00')
 write(sp+0x30,-1);u.reg_write(UC_X86_REG_EDI,cz);u.reg_write(UC_X86_REG_ESI,cx*50)
 u.emu_start(0x42c354,0x400fff,count=10000)
 end=u.reg_read(UC_X86_REG_EIP);assert end in [0x42c47c,0x42c480,0x4295ef],hex(end)
 result=dict(x=read(0x577fdc),z=read(0x577fe0),speed=read(0x577fec)) if end==0x4295ef else None
 return dict(cellX=cx,cellZ=cz,terrainCode=terrain,capture=result)
rows=[]
# Deliberately include entering/leaving the cup cell and strict capture radii.
for oldCell in [19,20,21]:
 for offset in [-52,-51,-50,-35,-34,-33,0,33,34,50,51,52]:
  for speed in [0,63,319,320,1000]:
   for flag in [False,True]:
    q=dict(beforeX=oldCell*1024+512,beforeZ=20992,x=20992+offset,z=20992,
     speed=speed,eventFlag=flag,cupX=20,cupZ=20)
    rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-cup.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalCupCapture}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,e] of rows){const a=originalCupCapture({...q,...e,club:13,
cellFlags:e.cellX===q.cupX&&e.cellZ===q.cupZ?128:0});
if(!isDeepStrictEqual(a,e.capture))throw Error(JSON.stringify({q,a,e}));}
console.log(`${rows.length} original cell-sampling/cup cases match, including crossings and strict boundaries.`);
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
