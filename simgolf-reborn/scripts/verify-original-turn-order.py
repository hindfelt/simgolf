"""Native partner/turn-order branch, retaining both original distance helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x425b50,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];branch=None
def hook(u,a,size,data):
 global branch
 if a in [0x428ad1,0x42b3f2]:branch=hex(a);u.emu_stop()
 if a==0x425b50:
  calls.append(dict(address=a,args=[0]));u.mem_write(0x577faa,struct.pack('<h',2))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2000):
 actors=[]
 for j in range(3):
  b=bytearray(256);struct.pack_into('<h',b,0xaa,1);struct.pack_into('<I',b,0x18,rng.choice([0,0x400,0x20000400]));struct.pack_into('<ii',b,0xdc,rng.choice([0,15000,25000,40000]),rng.randrange(1000,50000));b[0x29]=rng.choice([0,1,2]);b[0x2a]=rng.choice([0,1]);b[0x28]=rng.choice([0,1]);actors.append(b)
 targets=[dict(x=rng.randrange(50),z=rng.randrange(50)) for _ in range(3)]
 q=dict(actorId=0,actors=[list(b) for b in actors],holeTargets=targets)
 for j,b in enumerate(actors):u.mem_write(0x577f00+j*256,bytes(b))
 for j,t in enumerate(targets):put(0x574518+j*520,t['x']);put(0x57451c+j*520,t['z'])
 calls=[];branch=None;put(0x102010,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,0);u.emu_start(0x428992,0x400fff,count=10000)
 rows.append(dict(q=q,expected=dict(state={**q,'actors':[list(u.mem_read(0x577f00+j*256,256)) for j in range(3)]},calls=calls,partnerNotReady=bool(read(0x102034)),closerToCup=bool(read(0x102074)),next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-turn-order.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalTurnOrder}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(a=>Uint8Array.from(a));const a=originalTurnOrder(r.q,(_,s)=>{new DataView(s.actors[0].buffer).setInt16(0xaa,2,true);return {state:s};});a.state.actors=a.state.actors.map(a=>Array.from(a));if(!isDeepStrictEqual(a,r.expected))throw Error(JSON.stringify({r,a}));}console.log('2000 native partner/turn order cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
