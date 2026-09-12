"""Continuous original shot-entry gate, with native heading and distance.
Hole settlement is a controlled callback; its body is not claimed here.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
from collections import Counter
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x426b00,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
branch=None;calls=[]
def hook(u,a,size,data):
 global branch
 if a in [0x42d23c,0x42b825,0x42b55c,0x4295ef]:branch='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a==0x426b00:
  calls.append(dict(address=a,args=[read(u.reg_read(UC_X86_REG_ESP)+4)]));u.mem_write(0x577f29,b'\x02')
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2500):
 actors=[]
 for j in range(2):
  b=bytearray(256);struct.pack_into('<ii',b,8,rng.randrange(51200),rng.randrange(51200));struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<h',b,0xaa,1)
  struct.pack_into('<i',b,0xec,rng.choice([0,0,0,100]));struct.pack_into('<h',b,0x1c,rng.randrange(-32768,32768))
  b[0x29]=rng.choice([0,1]);b[0x2a]=rng.choice([0,1,255]);b[0x25]=rng.choice([0,5,6,7,127,255]);b[0x20]=rng.choice([0,32,64]);b[0x21]=rng.randrange(256);b[0xc2]=rng.randrange(4)
  struct.pack_into('<ii',b,0xdc,25*1024+512+rng.choice([-256,-255,-1,0,255,256,1000]),35*1024+512)
  actors.append(b)
 actors[0][0x29]=1;closer=rng.choice([False,False,False,True]);counts=[rng.choice([0,100,0xffffffff]) for _ in range(32)];totals=[rng.choice([0,100,65535]) for _ in range(3)];targets=[dict(x=25,z=35)]*3
 q=dict(actorId=0,actors=[list(b) for b in actors],closerToCup=closer,holeTargets=targets,shotStatCounts=counts,holeStrokeTotals=totals)
 for j,b in enumerate(actors):u.mem_write(0x577f00+j*256,bytes(b))
 for j,t in enumerate(targets):put(0x574518+j*520,t['x']);put(0x57451c+j*520,t['z']);u.mem_write(0x574662+j*520,struct.pack('<H',totals[j]))
 for j,v in enumerate(counts):put(0x5698cc+j*184,v)
 calls=[];branch=None;put(0x102010,0);put(0x102074,int(closer));u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.emu_start(0x42b3f2,0x400fff,count=10000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(0x577f00,256)),counts=[read(0x5698cc+j*184) for j in range(32)],totals=[struct.unpack('<H',u.mem_read(0x574662+j*520,2))[0] for j in range(3)],calls=calls,next=branch)))
print('Native continuation coverage:',dict(Counter(r['expected']['next'] for r in rows)),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalShotEntry}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q;q.actors=q.actors.map(b=>Uint8Array.from(b));q.shotStatCounts=Uint32Array.from(q.shotStatCounts);q.holeStrokeTotals=Uint16Array.from(q.holeStrokeTotals);const a=originalShotEntry(q,(_,state)=>{state.actors[0][0x29]=2;return {state};});const actual={actor:Array.from(a.state.actors[0]),counts:Array.from(a.state.shotStatCounts),totals:Array.from(a.state.holeStrokeTotals),calls:a.calls,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('2500 continuous native shot-entry cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
