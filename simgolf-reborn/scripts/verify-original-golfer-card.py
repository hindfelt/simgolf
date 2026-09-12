"""Native skill-card byte selection, including packed record crossings."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image())
rows=[]
for personal in [False,True]:
 actors=[bytearray((slot*13+i*7)%256 for i in range(256)) for slot in range(152)]
 for b in actors:struct.pack_into('<H',b,0xbe,65535 if personal else 0)
 defaults=list(range(10));tail=[91,255]
 u.mem_write(0x577f00,b''.join(actors)+bytes(tail));u.mem_write(0x5a444c,bytes(defaults))
 for slot in range(-1,152):
  values=[]
  for i in range(10):
   u.reg_write(UC_X86_REG_EBP,slot&0xffffffff);u.reg_write(UC_X86_REG_EDI,i);u.reg_write(UC_X86_REG_ECX,0x5a444c-10);u.reg_write(UC_X86_REG_EAX,0)
   u.emu_start(0x45eba5,0x45ebc6,count=30);values.append(u.reg_read(UC_X86_REG_EAX)&255)
  rows.append(dict(personal=personal,slot=slot,values=values))
module=(root/'simgolf-reborn/scene/src/simulation/original-golfer-card.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalGolferCard}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const actors=Array.from({length:152},(_,slot)=>{const b=Uint8Array.from({length:256},(_,i)=>(slot*13+i*7)%256);new DataView(b.buffer).setUint16(0xbe,r.personal?65535:0,true);return b;});const state={actors,defaultSkills:Uint8Array.from({length:10},(_,i)=>i),actorTableTail:new Uint8Array([91,255])};const values=originalGolferCard(state,{actorId:r.slot,portraitId:0,x:0,title:''}).skills.map(r=>r.value);if(!isDeepStrictEqual(values,r.values))throw Error(JSON.stringify({r,values}));}console.log('306 native golfer-card selections match all ten skills, including record tails.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
