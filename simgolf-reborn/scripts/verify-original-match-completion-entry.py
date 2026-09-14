"""Native match gate and signed paired score totals."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
branch=None

def hook(u,a,size,data):
 global branch
 if a in [0x426ff6,0x427a53]:branch=hex(a);u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(10112);rows=[]
for i in range(1200):
 id=rng.randrange(151);a=bytearray(rng.randbytes(256));b=bytearray(rng.randbytes(256));a[0x29]=rng.randrange(19);b[0x29]=rng.choice([0,a[0x29],a[0x29]+1,255]);a[0x21]=rng.choice([0,16,255]);b[0x21]=rng.choice([0,16,255]);struct.pack_into('<h',a,0xaa,151);holes=[rng.randrange(256) for _ in range(20)]
 u.mem_write(0x577f00+id*256,bytes(a));u.mem_write(0x577f00+151*256,bytes(b))
 for j,n in enumerate(holes):u.mem_write(0x574500+j*520,bytes([n])+bytes(519))
 put(0x102034,id);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x426f3b,0x400fff,count=1000)
 expected=dict(next=branch)
 if branch=='0x426ff6':expected['totals']=dict(actorStrokes=read(0x102010),partnerStrokes=read(0x102014),par=read(0x10201c))
 rows.append(dict(id=id,a=list(a),b=list(b),holes=holes,expected=expected))
module=(root/'simgolf-reborn/scene/src/simulation/original-match-completion-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalMatchCompletionEntry}=await import(MODULE);let matches=0;for(const r of JSON.parse(readFileSync(0,'utf8'))){const actors=[];actors[r.id]=Uint8Array.from(r.a);actors[151]=Uint8Array.from(r.b);const a=originalMatchCompletionEntry({actorId:r.id,actors,holeRecords:r.holes.map(n=>{const b=new Uint8Array(520);b[0]=n;return b;})});const actual={next:a.next,...(a.totals?{totals:a.totals}:{})};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));matches+=!!a.totals;}console.log(`1200 native match-entry cases match; ${matches} paired score totals.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
