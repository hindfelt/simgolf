"""Continuous native normal actor prefix through motion gates.
Lookup/reaction helpers are controlled replacements; native RNG executes.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40dc70,0x4672d0,0x466ea0,0x406dd0,0x465c40,0x406450,0x426b00]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];response=0;replacement=0;draws=0;sample=None
# Tile sample is fully computed at 4284c7, before terrain dispatch.
next_branch=None
def hook(u,a,size,data):
 global draws,sample,next_branch
 if a in [0x42889c,0x42bdb5,0x4295ef]:
  next_branch={0x42889c:'continue',0x42bdb5:'motion',0x4295ef:'skip'}[a];u.emu_stop()
 if a==0x45ba70:draws+=1
 if a==0x4284c7:
  index=u.reg_read(UC_X86_REG_EBX);sample=dict(x=index//50,z=index%50,index=index,remarkIndex=(index%50)*50+index//50)
 if a in [0x40dc70,0x4672d0,0x466ea0,0x406dd0,0x465c40,0x406450,0x426b00]:
  sp=u.reg_read(UC_X86_REG_ESP);n={0x40dc70:2,0x4672d0:3,0x466ea0:1,0x406dd0:3,0x465c40:2,0x406450:1,0x426b00:1}[a];calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(n)]))
  if a in [0x40dc70,0x406dd0]:u.reg_write(UC_X86_REG_EAX,0)
  if a in [0x465c40,0x406450]:put(base+0x18,0x200)
  if a==0x466ea0:
   u.reg_write(UC_X86_REG_EAX,response);u.mem_write(base+0x8c,b'\x06');u.mem_write(0x53ba00,struct.pack('<H',replacement)*2500)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1000):
 slot=0;base=0x577f00+slot*256;actor=bytearray(256)
 struct.pack_into('<ii',actor,8,20*1024,25*1024);struct.pack_into('<H',actor,0x90,rng.choice([0,0x4000,0x8000,0xc000]));struct.pack_into('<h',actor,0x1c,rng.choice([0,1]))
 struct.pack_into('<iiiiI',actor,8,20480,25600,200,200,rng.choice([0,0x200,0x100000,0x40000,0x80040000]));struct.pack_into('<h',actor,0xaa,1);struct.pack_into('<h',actor,0xba,4);actor[0x25]=7;actor[0x29]=1;actor[0x8c]=rng.choice([0,2,7]);actor[0x8d]=50
 struct.pack_into('<h',actor,0xa6,rng.choice([-1,0]));struct.pack_into('<iii',actor,0xdc,rng.choice([-1024,20480,51200]),25600,0);struct.pack_into('<i',actor,0xec,100);actor[0x2a]=rng.choice([0,10]);
 actor[0x22]=i%8;actor[0x78]=11 if i%17==0 else 0;actor[0x79]=139 if i%19==0 else 0
 phase=rng.choice([0,192,1,256]);seed=rng.randrange(2**32)
 code=1;flags=rng.choice([0,0x1000,0x1800]);response=rng.choice([0,2]);replacement=rng.choice([0,0x800,0x1800])
 b=bytearray(16);struct.pack_into('<h',b,0,rng.choice([1,2,4]));struct.pack_into('<i',b,8,rng.choice([15,16,20]))
 partner=bytearray(actor);struct.pack_into('<i',partner,8,20500);owners=[rng.choice([-1,0]) for _ in range(16)]
 q=dict(actorId=slot,actor=list(actor),partner=list(partner),visualOwners=owners,difficulty=-1,focusActor=-1,lastPairClock=0,modeByte=0,detailLevel=4,environmentByte=0,conditionRange=20,metadata=[{}, {'shape':1}],trackedX=-1,trackedZ=-1,trackedFacing=0,phaseCounter=phase,seed=seed,code=code,flags=flags,building=list(b))
 u.mem_write(base,bytes(actor));u.mem_write(base+256,bytes(partner));
 for j,v in enumerate(owners):u.mem_write(0x59e6b0+j*0x388,struct.pack('<h',v))
 for a,v in [(0x820344,-1),(0x4c1dfc,-1),(0x599a98,0),(0x4c183c,4),(0x5842a0,-1),(0x5842a4,-1)]:put(a,v)
 u.mem_write(0x576dc7+48,b'\x01');put(0x5672a0,20);u.mem_write(0x5a1f30,b'\x00');u.mem_write(0x568148,b'\x00');u.mem_write(0x5842b6,b'\x00');put(0x820454,seed);put(0x831828,phase);put(0x102010,slot)
 u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x53ba00,struct.pack('<H',flags)*2500);u.mem_write(0x58a708,bytes(b))
 calls=[];draws=0;sample=None;next_branch=None;put(0x102050,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,slot*256);u.reg_write(UC_X86_REG_EBX,slot);u.emu_start(0x42819c,0x400fff,count=30000)
 rows.append(dict(q=q,response=response,replacement=replacement,expected=dict(actor=list(u.mem_read(base,256)),partner=list(u.mem_read(base+256,256)),visualOwners=[struct.unpack('<h',u.mem_read(0x59e6b0+j*0x388,2))[0] for j in range(16)],focusActor=struct.unpack('<i',u.mem_read(0x4c1dfc,4))[0],trackedX=struct.unpack('<i',u.mem_read(0x5842a0,4))[0],trackedZ=struct.unpack('<i',u.mem_read(0x5842a4,4))[0],trackedFacing=u.mem_read(0x5842b6,1)[0],visualSlot=struct.unpack('<i',u.mem_read(0x102030,4))[0],seed=read(0x820454),flags=struct.unpack('<H',u.mem_read(0x53ba00,2))[0],calls=calls,randomDraws=draws,ballTile=dict(x=struct.unpack('<i',u.mem_read(0x102018,4))[0],z=struct.unpack('<i',u.mem_read(0x102020,4))[0]),ballTerrain=read(0x102014),actorIndex=read(0x10203c),actorTerrain=read(0x10202c),next=next_branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-dispatch.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorDispatch}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);actors[1]=Uint8Array.from(q.partner);const a=originalActorDispatch({...q,actors,terrain:new Uint8Array(2500).fill(q.code),tileFlags:new Uint16Array(2500).fill(q.flags),buildings:[Uint8Array.from(q.building)]},(e,s)=>{if(e.address===0x466ea0){s.tileFlags.fill(r.replacement);s.actors[0][0x8c]=6;}if([0x465c40,0x406450].includes(e.address))new DataView(s.actors[0].buffer).setUint32(0x18,0x200,true);return {state:s,result:e.address===0x466ea0?r.response:0};});const actual={actor:Array.from(a.state.actors[0]),partner:Array.from(a.state.actors[1]),visualOwners:a.state.visualOwners,focusActor:a.state.focusActor,trackedX:a.state.trackedX,trackedZ:a.state.trackedZ,trackedFacing:a.state.trackedFacing,visualSlot:a.visualSlot,seed:a.state.seed,flags:a.state.tileFlags[0],calls:a.calls,randomDraws:a.randomDraws,ballTile:a.ballTile,ballTerrain:a.ballTerrain,actorIndex:a.actorIndex,actorTerrain:a.actorTerrain,next:a.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1000 continuous native actor dispatch cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
