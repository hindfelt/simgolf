"""Native scenery cadence, tile addressing and reaction dispatch.
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
for a in [0x40dc70,0x4672d0,0x466ea0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];response=0;replacement=0;draws=0;sample=None
# Tile sample is fully computed at 4284c7, before terrain dispatch.
def hook(u,a,size,data):
 global draws,sample
 if a==0x45ba70:draws+=1
 if a==0x4284c7:
  index=u.reg_read(UC_X86_REG_EBX);sample=dict(x=index//50,z=index%50,index=index,remarkIndex=(index%50)*50+index//50)
 if a in [0x40dc70,0x4672d0,0x466ea0]:
  sp=u.reg_read(UC_X86_REG_ESP);n={0x40dc70:2,0x4672d0:3,0x466ea0:1}[a];calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(n)]))
  if a==0x40dc70:u.reg_write(UC_X86_REG_EAX,0)
  if a==0x466ea0:
   u.reg_write(UC_X86_REG_EAX,response);u.mem_write(0x53ba00,struct.pack('<H',replacement)*2500)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1500):
 slot=i%152;base=0x577f00+slot*256;actor=bytearray(256)
 struct.pack_into('<ii',actor,8,20*1024,25*1024);struct.pack_into('<H',actor,0x90,rng.choice([0,0x4000,0x8000,0xc000]));struct.pack_into('<h',actor,0x1c,rng.choice([0,1]))
 actor[0x22]=i%8;actor[0x78]=11 if i%17==0 else 0;actor[0x79]=139 if i%19==0 else 0
 phase=(-33*slot+(1 if i%7==0 else 0))&0xffffffff;seed=rng.randrange(2**32)
 code=rng.choice([1,22]);flags=rng.choice([0,0x1000,0x1800]);response=rng.choice([0,2]);replacement=rng.choice([0,0x800,0x1800])
 b=bytearray(16);struct.pack_into('<h',b,0,rng.choice([1,2,4]));struct.pack_into('<i',b,8,rng.choice([15,16,20]))
 q=dict(actorId=slot,actor=list(actor),phaseCounter=phase,seed=seed,code=code,flags=flags,building=list(b))
 u.mem_write(base,bytes(actor));put(0x820454,seed);put(0x831828,phase);put(0x102010,slot)
 u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x53ba00,struct.pack('<H',flags)*2500);u.mem_write(0x58a708,bytes(b))
 calls=[];draws=0;sample=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,slot*256);u.reg_write(UC_X86_REG_EBX,slot);u.emu_start(0x42841a,0x42858d,count=10000)
 rows.append(dict(q=q,response=response,replacement=replacement,expected=dict(seed=read(0x820454),flags=struct.unpack('<H',u.mem_read(0x53ba00,2))[0],calls=calls,randomDraws=draws,sample=sample)))
module=(root/'simgolf-reborn/scene/src/simulation/original-scenery-update.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalSceneryUpdate}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalSceneryUpdate({...q,actors,terrain:new Uint8Array(2500).fill(q.code),tileFlags:new Uint16Array(2500).fill(q.flags),buildings:[Uint8Array.from(q.building)]},(e,s)=>{if(e.address===0x466ea0)s.tileFlags.fill(r.replacement);return {state:s,result:e.address===0x466ea0?r.response:0};});const actual={seed:a.state.seed,flags:a.state.tileFlags[0],calls:a.calls,randomDraws:a.randomDraws,sample:a.sample};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1500 native scenery update cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
