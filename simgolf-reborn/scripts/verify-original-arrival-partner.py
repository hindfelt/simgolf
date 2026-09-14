"""Native partner waiting and shot preparation after arrival."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None
def hook(u,a,size,data):
 global end
 end='skip' if a==0x4295ef else hex(a);u.emu_stop()
for address in [0x4295ef]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42168);rows=[]
for i in range(1600):
 b=bytearray(512);h=bytearray(20*520);id=i%2
 for j in range(2):
  o=j*256;b[o+0x29]=rng.choice([0,1,2]);b[o+0x2a]=rng.choice([0,1]);b[o+0x25]=7;struct.pack_into('<h',b,o+0xaa,j^1);struct.pack_into('<I',b,o+0x18,rng.choice([0,0x400,0x4000]));struct.pack_into('<h',b,o+0x1c,99)
  for off in [8,12,0xdc,0xe0]:struct.pack_into('<i',b,o+off,rng.randrange(15000,30000))
  if rng.randrange(2):struct.pack_into('<i',b,o+0xdc,0)
  struct.pack_into('<i',b,o+0xec,rng.choice([0,0,100]))
 for j in range(20):struct.pack_into('<ii',h,j*520+0x18,20,20)
 q=dict(actorId=id,seed=rng.getrandbits(32),walkingOverride=rng.randrange(2),movementReady=rng.randrange(2),waitingGroups=rng.randrange(2),startBall=dict(x=23552,z=22528))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));put(0x820454,q['seed'])
 for off,v in [(0x10,id),(0x34,q['walkingOverride']),(0x44,q['movementReady']),(0x38,q['waitingGroups']),(0x64,23552),(0x68,22528)]:put(0x102000+off,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;u.emu_start(0x42a168,0x400fff,count=100000);assert end
 rows.append([q,list(b),list(h),dict(actors=list(u.mem_read(0x577f00,512)),seed=get(0x820454)&0xffffffff,next=end)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalArrivalPartner}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8')),coverage={};for(const [q,b,h,e] of rows){const r=originalArrivalPartner({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520)))});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),seed:r.state.seed,next:r.next};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));coverage[r.next]=(coverage[r.next]??0)+1;}console.log(`${rows.length} native arrival-partner cases match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-arrival-partner.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
