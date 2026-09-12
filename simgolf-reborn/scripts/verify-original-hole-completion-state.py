"""Native post-presentation completion bookkeeping, controlled remark effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4672d0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];branch=None;mutate=False;id=0;base=0

def hook(u,a,size,data):
 global branch
 if a in [0x426f3b,0x427e25]:branch=hex(a);u.emu_stop()
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(3)]))
  if mutate:u.mem_write(base+0x29,b'\x02');u.mem_write(base+0x2a,b'\x06');put(0x831828,100);put(0x59d208,0x200000)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1200):
 id=rng.choice([0,1,127,128,151]);base=0x577f00+id*256;b=bytearray(256);b[0x29]=rng.choice([1,2,18]);b[0x2a]=rng.choice([1,7,255]);b[0x8c]=rng.choice([0,3]);b[0x24]=13;struct.pack_into('<h',b,0xac,rng.randrange(-32768,32768));struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<i',b,0xdc,25000);struct.pack_into('<i',b,0xc8,rng.choice([-2147483648,-1,0,99,2147483647]))
 notices=[]
 for j in range(64):
  n=bytearray(76);n[0]=rng.choice([0,1,4]);n[1]=rng.choice([id,0,127,255]);notices.append(list(n))
 phase=rng.choice([0,1,100,0x7fffffff,0x80000000,0xffffffff]);flags=rng.choice([0,0x200000]);record=rng.randbytes(44);hole=rng.randbytes(520);mutate=i%2==0
 q=dict(actorId=id,actor=list(b),record=list(record),hole=list(hole),notices=notices,phase=phase,flags=flags)
 u.mem_write(base,bytes(b));u.mem_write(0x583432,record);u.mem_write(0x574500,hole*20)
 for j,n in enumerate(notices):u.mem_write(0x5842b2+j*76,bytes(n))
 put(0x831828,phase);put(0x59d208,flags);calls=[];branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EBX,id);u.emu_start(0x426e6b,0x400fff,count=10000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(base,256)),record=list(u.mem_read(0x583432,44)),holes=hashlib.sha256(bytes(u.mem_read(0x574500,520*20))).hexdigest(),notices=hashlib.sha256(bytes(u.mem_read(0x5842b2,76*64))).hexdigest(),phase=read(0x831828),flags=read(0x59d208),calls=calls,next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-hole-completion-state.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';const {originalHoleCompletionState}=await import(MODULE);const hash=rows=>createHash('sha256').update(Buffer.concat(rows.map(b=>Buffer.from(b)))).digest('hex');for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalHoleCompletionState({actorId:q.actorId,actors,completionRecords:[Uint8Array.from(q.record)],completionNotices:q.notices.map(b=>Uint8Array.from(b)),holeRecords:Array.from({length:20},()=>Uint8Array.from(q.hole)),phaseCounter:q.phase,globalFlags:q.flags},(_,state)=>{if(r.mutate){state.actors[q.actorId][0x29]=2;state.actors[q.actorId][0x2a]=6;state.phaseCounter=100;state.globalFlags=0x200000;}return {state};});const actual={actor:Array.from(a.state.actors[q.actorId]),record:Array.from(a.state.completionRecords[0]),holes:hash(a.state.holeRecords),notices:hash(a.state.completionNotices),phase:a.state.phaseCounter,flags:a.state.globalFlags,calls:a.calls,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1200 continuous native completion bookkeeping cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
