"""Native periodic terrain-condition counters and remark dispatch."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4672d0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];draws=0;base=0

def hook(u,a,size,data):
 global draws
 if a==0x45ba70:draws+=1
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);args=[read(sp+4+j*4) for j in range(3)];calls.append(dict(address=a,args=args));put(0x820454,read(0x820454)+1)
  if args[1]==63:u.mem_write(base+0xb0,struct.pack('<h',19))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2500):
 slot=i%152;base=0x577f00+slot*256;b=bytearray(256);struct.pack_into('<ii',b,8,20480,25600)
 modifier=rng.choice([0,1,-1]);struct.pack_into('<h',b,0x1c,modifier);b[0x29]=rng.choice([1,2,3,19,255]);b[0x2b]=i%2;b[0x20]=rng.choice([0,0x20,0xe0]);struct.pack_into('<h',b,0xa8,i%2)
 for off in [0xae,0xb0]:struct.pack_into('<h',b,off,rng.choice([15,19,32767,-1]))
 period=120 if modifier else 160;phase=period*100-37*slot+(1 if i%7==0 else 0)
 seed=rng.randrange(2**32);shape=rng.choice([1,7,8,14]);environment=rng.choice([0,3]);conditionRange=rng.choice([0,2,20,-3])
 q=dict(actorId=slot,actor=list(b),phaseCounter=phase,seed=seed,shape=shape,environmentByte=environment,conditionRange=conditionRange)
 u.mem_write(base,bytes(b));u.mem_write(0x570d38,b'\x01'*2500);u.mem_write(0x576dc7+48,bytes([shape]));u.mem_write(0x5a1f30,bytes([environment]));put(0x831828,phase);put(0x820454,seed);put(0x5672a0,conditionRange);put(0x102010,slot)
 calls=[];draws=0;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,slot*256);u.emu_start(0x4285ff,0x4287ef,count=10000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(base,256)),seed=read(0x820454),calls=calls,randomDraws=draws,tile=dict(x=20,z=25))))
module=(root/'simgolf-reborn/scene/src/simulation/original-condition-update.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalConditionUpdate}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalConditionUpdate({...q,actors,terrain:new Uint8Array(2500).fill(1),metadata:[{}, {shape:q.shape}]},(e,s)=>{s.seed=(s.seed+1)>>>0;if(e.args[1]===63)new DataView(s.actors[q.actorId].buffer).setInt16(0xb0,19,true);return {state:s};});const actual={actor:Array.from(a.state.actors[q.actorId]),seed:a.state.seed,calls:a.calls,randomDraws:a.randomDraws,tile:a.tile};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('2500 native terrain condition cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
