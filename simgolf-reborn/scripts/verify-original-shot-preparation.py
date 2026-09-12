"""Native shot preparation with a controlled planner; tutorial exits are explicit."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
from collections import Counter
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000);u.mem_write(0x4235c0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def signed(a):return struct.unpack('<i',u.mem_read(a,4))[0]
globals_map=dict(aimX=0x4c1b98,aimZ=0x4c1b9c,aimScratch=0x58dd80,aimMode=0x5a1f34,selectionMode=0x566a0c,selectedActor=0x5a4440,aimResult=0x560164,updateScratch=0x59a188,globalFlags=0x59d208)
branch=None;calls=[];reply={}
def hook(u,a,size,data):
 global branch
 if a in [0x42b647,0x4295ef]:branch='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a==0x4235c0:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[signed(sp+4+j*4) for j in range(5)]))
  put(0x577fe8,reply['heading']);put(0x577fdc,reply['x']);put(0x577fe0,reply['z']);u.mem_write(0x577f25,bytes([reply['animation']]))
  u.mem_write(0x53ba00+(20*50+25)*2,struct.pack('<H',reply['tileFlags']))
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(2500):
 b=bytearray(256);b[0x29]=rng.choice([1,2]);b[0x2a]=rng.choice([0,1]);b[0x21]=rng.randrange(8);b[0xc2]=rng.randrange(4);b[0x26]=9
 struct.pack_into('<h',b,0xaa,1);struct.pack_into('<I',b,0x18,rng.choice([0,0x200]));struct.pack_into('<ii',b,8,20480,25600);struct.pack_into('<i',b,0x10,rng.choice([-1,0]));struct.pack_into('<i',b,0xd4,rng.choice([-1,0,25]));struct.pack_into('<ii',b,0xdc,25*1024+512+rng.choice([1023,1024,5000]),35*1024+512)
 partner=bytearray(256);partner[0x20]=rng.choice([0,32]);counts=[rng.choice([0,0xffffffff]) for _ in range(32)];totals=[rng.choice([0,65535]) for _ in range(3)]
 q=dict(actorId=0,actors=[list(b),list(partner)],ballTerrain=rng.choice([1,2]),ballTile=dict(x=20,z=25),holeTargets=[dict(x=25,z=35)]*3,shotStatCounts=counts,holeStrokeTotals=totals,**{name:123 for name in globals_map})
 q['globalFlags']=rng.choice([0,0x200000]);q['updateScratch']=rng.choice([0,0,1]);entry='0x42b6f8' if i%5==0 else '0x42b55c'
 reply=dict(heading=rng.randrange(2**32),x=22000,z=27000,animation=rng.choice([0,14]),tileFlags=rng.choice([0,0x80]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x578000,bytes(partner))
 for name,address in globals_map.items():put(address,q[name])
 for j in range(3):put(0x574518+j*520,25);put(0x57451c+j*520,35);u.mem_write(0x574662+j*520,struct.pack('<H',totals[j]))
 for j,v in enumerate(counts):put(0x5698cc+j*184,v)
 u.mem_write(0x53ba00,bytes(5000));put(0x102010,0);put(0x102014,q['ballTerrain']);put(0x102018,20);put(0x102020,25)
 calls=[];branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ESI,0);u.emu_start(int(entry,16),0x400fff,count=10000)
 rows.append(dict(q=q,reply=reply,entry=entry,expected=dict(actor=list(u.mem_read(0x577f00,256)),counts=[read(0x5698cc+j*184) for j in range(32)],totals=[struct.unpack('<H',u.mem_read(0x574662+j*520,2))[0] for j in range(3)],globals={name:signed(address) for name,address in globals_map.items()},flags=struct.unpack('<H',u.mem_read(0x53ba00+(20*50+25)*2,2))[0],calls=calls,next=branch)))
print('Native preparation coverage:',dict(Counter(r['expected']['next'] for r in rows)),'planner calls:',sum(len(r['expected']['calls']) for r in rows),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-preparation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalShotPreparation}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q;q.actors=q.actors.map(b=>Uint8Array.from(b));q.shotStatCounts=Uint32Array.from(q.shotStatCounts);q.holeStrokeTotals=Uint16Array.from(q.holeStrokeTotals);q.tileFlags=new Uint16Array(2500);const a=originalShotPreparation(q,(_,state)=>{const v=new DataView(state.actors[0].buffer);v.setUint32(0xe8,r.reply.heading,true);v.setInt32(0xdc,r.reply.x,true);v.setInt32(0xe0,r.reply.z,true);state.actors[0][0x25]=r.reply.animation;state.tileFlags[1025]=r.reply.tileFlags;return {state};},r.entry);const actual={actor:Array.from(a.state.actors[0]),counts:Array.from(a.state.shotStatCounts),totals:Array.from(a.state.holeStrokeTotals),globals:Object.fromEntries(Object.keys(r.expected.globals).map(k=>[k,a.state[k]])),flags:a.state.tileFlags[1025],calls:a.calls,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('2500 continuous native shot preparation cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
