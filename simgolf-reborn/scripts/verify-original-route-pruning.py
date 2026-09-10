"""Check reconstructed score pruning against the original x86 pruning/control loop."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x100000);u.mem_map(0x100000,0x20000)
a=0x4232f7;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x19f])
u.mem_write(0x483330,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
# Restart at the original scan entry when the original margin-control loop jumps
# to setup code. Non-score heading/spread setup is outside this oracle.
def hook(u,a,s,d):
 if a==0x423285:
  write(0x102034,0);u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_EIP,0x4232f7)
 if a==0x423492:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 u.mem_write(0x102000,bytes(0x9000))
 for offset,v in [(0x40,128),(0x60,q['bestScore']),(0x38,2),(0x44,q['work'])]:write(0x102000+offset,v)
 u.mem_write(0x1020bc,struct.pack('<2646I',*[v for row in q['scores'] for v in row]))
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_ESI,0)
 # End 0x423496 also covers the under-budget branch bypassing 0x423492.
 u.emu_start(0x4232f7,0x423496,count=500000)
 assert u.reg_read(UC_X86_REG_EIP) in [0x423492,0x423496]
 flat=struct.unpack('<2646I',u.mem_read(0x1020bc,2646*4))
 return dict(scores=[list(flat[i:i+6]) for i in range(0,2646,6)],margin=read(0x102040),count=read(0x102034))
rng=random.Random(2002);rows=[]
for _ in range(200):
 best=rng.randint(0,500)
 scores=[[rng.choice([best+rng.randrange(200),99999,100000]) for _ in range(6)] if rng.random()<.1 else [100000]*6 for _ in range(441)]
 q=dict(scores=scores,bestScore=best,samples=2,work=rng.randrange(300));rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-pruning.js').as_uri()
script='''import {readFileSync} from 'node:fs';const {originalRoutePruning}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,e] of rows){const a=originalRoutePruning(q);
 if(a.margin!==e.margin||a.survivors.length!==e.count||JSON.stringify(a.scores)!==JSON.stringify(e.scores))throw Error('Pruning mismatch');
}console.log(`${rows.length} complete score grids match original x86 pruning.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
