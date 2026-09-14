"""Compare the actual swing animation phase transition, without helper stubs."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
rng=random.Random(416);rows=[]
for i in range(1600):
 b=bytearray(rng.randbytes(256));b[0x25]=16;b[0x28]=1;b[0x27]=rng.choice([10,120,130,140,0]);counts=[rng.choice([0,1,2,6,12,64]) for _ in range(160)]
 q=dict(actor=list(b),animationDirection=i%8,previousFrame=rng.randrange(256),frameIndex=rng.randrange(20),globalFlags=rng.choice([0,4,32]),frameCounts=counts)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x53e2f8,struct.pack('<160i',*counts));u.mem_write(0x59d208,struct.pack('<I',q['globalFlags']));u.mem_write(0x102038,struct.pack('<I',q['previousFrame']));u.mem_write(0x10204c,struct.pack('<i',q['frameIndex']))
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,q['animationDirection']);u.emu_start(0x414f79,0x41503b,count=1000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(0x577f00,256)),animationGroup=struct.unpack('<i',u.mem_read(0x102050,4))[0],frameIndex=struct.unpack('<i',u.mem_read(0x10204c,4))[0])))
print('Native phase-2 transitions:',sum(row['expected']['actor'][0x28]==2 for row in rows),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-swing-animation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalSwingAnimation}=await import(MODULE);for(const {q,expected} of JSON.parse(readFileSync(0,'utf8'))){const r=originalSwingAnimation({...q,actor:Uint8Array.from(q.actor)});const actual={actor:Array.from(r.state.actor),animationGroup:r.animationGroup,frameIndex:r.frameIndex};if(!isDeepStrictEqual(actual,expected))throw Error(JSON.stringify({q,actual,expected}));}console.log('1600 native swing animation transitions match actor bytes and frame selection.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
