"""Compare the native destination scan, including its preceding motion words."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
branch=None
def hook(u,a,size,data):
 global branch
 if a in [0x40383c,0x403480,0x402ebd]:branch='skip' if a==0x40383c else hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(310);rows=[]
for i in range(128):
 slot=i%64;b=bytearray(76);struct.pack_into('<ii',b,0,rng.randrange(50000),rng.randrange(50000));b[0x10]=rng.choice([255,0,20,49]);b[0x11]=rng.choice([0,20,49]);b[0x13]=rng.choice([250,252,255]);b[0x12]=rng.choice([1,8,16]);b[0x18]=int(i%11==0)
 terrain=[20 if rng.random()<.1 else 0 for _ in range(2500)];flags=[2048 if i%2 and rng.random()<.03 else 0 for _ in range(2500)];motion=[rng.randrange(50000) for _ in range(2304)];prefix=[10000,12000];selected=-1;worldFlags=0;records=[None]*64;records[slot]=list(b)
 q=dict(visualRecords=records,terrain=terrain,tileFlags=flags,motionRecords=motion,motionPrefix=prefix,selectedActor=selected,worldFlags=worldFlags)
 u.mem_write(0x5842a0+76*slot,bytes(b));u.mem_write(0x570d38,bytes(terrain));u.mem_write(0x53ba00,struct.pack('<2500H',*flags));u.mem_write(0x572100,struct.pack('<2306i',*(prefix+motion)));u.mem_write(0x5a4440,struct.pack('<i',selected));u.mem_write(0x59d208,struct.pack('<i',worldFlags));u.reg_write(UC_X86_REG_ESI,slot*76);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBX,b[0x13]);branch=None;u.emu_start(0x402c6f,0x400fff,count=200000)
 expected=dict(next=branch)
 if branch=='0x402ebd':
  expected['locals']={k:read(0x102000+o) for k,o in dict(x=0x10,z=0x14,selection=0x18,kind=0x20,index=0x24,distance=0x30).items()}
  if expected['locals']['selection']==1:expected['locals']['row']=read(0x10203c)
 rows.append(dict(q=q,slot=slot,expected=expected))
module=(root/'simgolf-reborn/scene/src/simulation/original-visual-destination.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalVisualDestination}=await import(MODULE);let i=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.visualRecords=r.q.visualRecords.map(b=>b===null?null:Uint8Array.from(b));for(const [key,T] of [['terrain',Uint8Array],['tileFlags',Uint16Array],['motionRecords',Int32Array],['motionPrefix',Int32Array]])r.q[key]=T.from(r.q[key]);const out=originalVisualDestination(r.q,r.slot);const actual={next:out.next,...(out.locals?{locals:out.locals}:{})};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({case:i,expected:r.expected,actual}));i++;}console.log('128 native destination scans match selections and continuations.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
