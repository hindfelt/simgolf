"""Native settlement prefix with controlled assessment/sound effects and whole-record hashes."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x405e80,0x40c1f0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];mutate=False

def hook(u,a,size,data):
 if a in [0x405e80,0x40c1f0]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(2 if a==0x405e80 else 4)]))
  if mutate:
   if a==0x405e80:u.mem_write(0x577f21,b'\x02');u.mem_write(0x577f29,b'\x02');u.mem_write(0x577fc2,b'\x01')
   if a==0x40c1f0:put(0x4c1848,read(0x4c1848)+1)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1200):
 b=bytearray(256);b[0x20]=rng.choice([0,0,1]);b[0x21]=rng.randrange(16);b[0x29]=rng.choice([1,2,18]);b[0x2a]=rng.choice([0,1,9,10,127,255]);b[0xc2]=rng.randrange(4);struct.pack_into('<h',b,0xac,rng.randrange(-32768,32768));struct.pack_into('<ii',b,8,20000,25000)
 h=rng.randbytes(520);s=rng.randbytes(184);record=bytearray(44);record[0x12]=rng.randrange(256);mode=rng.choice([0,2]);bonus=rng.choice([-2,0,4,2147483647]);mutate=i%2==0
 q=dict(actor=list(b),hole=list(h),stat=list(s),record=list(record),mode=mode,bonus=bonus)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,h*20);u.mem_write(0x5698c0,s*32);u.mem_write(0x583420,bytes(record));put(0x542c04,mode);put(0x542be8,bonus);put(0x102004,0)
 calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x426b00,0x426c92,count=10000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),holes=hashlib.sha256(bytes(u.mem_read(0x574500,520*20))).hexdigest(),stats=hashlib.sha256(bytes(u.mem_read(0x5698c0,184*32))).hexdigest(),value=struct.unpack('<i',u.mem_read(0x4c1848,4))[0],calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-hole-settlement.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';const {originalHoleSettlement}=await import(MODULE);const hash=rows=>createHash('sha256').update(Buffer.concat(rows.map(b=>Buffer.from(b)))).digest('hex');for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q;const a=originalHoleSettlement({actorId:0,actors:[Uint8Array.from(q.actor)],holeRecords:Array.from({length:20},()=>Uint8Array.from(q.hole)),statRecords:Array.from({length:32},()=>Uint8Array.from(q.stat)),completionRecords:[Uint8Array.from(q.record)],settlementMode:q.mode,settlementBonus:q.bonus},(e,state)=>{if(r.mutate){if(e.address===0x405e80){state.actors[0][0x21]=2;state.actors[0][0x29]=2;state.actors[0][0xc2]=1;}if(e.address===0x40c1f0)state.settlementValue=(state.settlementValue+1)|0;}return {state};});const actual={actor:Array.from(a.state.actors[0]),holes:hash(a.state.holeRecords),stats:hash(a.state.statRecords),value:a.state.settlementValue,calls:a.calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1200 continuous native hole-settlement prefix cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
