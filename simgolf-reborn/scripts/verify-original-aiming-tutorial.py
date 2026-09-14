"""Native tutorial boundary; presentation/name helpers are controlled stubs."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
counts={0x447a30:5,0x466fb0:2,0x45e9c0:5,0x4803e0:1,0x45b990:1}
for address in counts:u.mem_write(address,b'\xc2\x04\x00' if address==0x4803e0 else b'\xc3')
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text():return bytes(u.mem_read(0x518f78,256)).split(b'\0')[0].decode()
rows=[];calls=[];messages=[]
def hook(u,address,size,data):
 if address==0x42b6f8:u.emu_stop();return
 if address not in counts:return
 sp=u.reg_read(UC_X86_REG_ESP);args=[read(sp+4+4*i) for i in range(counts[address])];event=dict(address=address,args=args)
 if address==0x4803e0:event['thisArg']=u.reg_read(UC_X86_REG_ECX)
 calls.append(event)
 if address==0x466fb0:u.mem_write(0x518f78,('Player'+str(args[0])).encode()+b'\0')
 if address==0x45e9c0:messages.append(text())
u.hook_add(UC_HOOK_CODE,hook)
for id in range(152):
 actors=[bytearray(256) for _ in range(152)]
 for slot in [id,id^1]:struct.pack_into('<h',actors[slot],0x1e,slot*301-22000)
 u.mem_write(0x577f00,b''.join(actors));u.mem_write(0x518f78,b'old\0');u.mem_write(0x102010,struct.pack('<i',id))
 calls=[];messages=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id<<8);u.emu_start(0x42b647,0x42b6f8,count=1000)
 rows.append(dict(q=dict(actorId=id,actors=[list(b) for b in actors],sourceText='old'),expected=dict(calls=calls,messages=messages,sourceText=text())))
module=(root/'simgolf-reborn/scene/src/simulation/original-aiming-tutorial.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAimingTutorial}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.actors=r.q.actors.map(b=>Uint8Array.from(b));const messages=[];const out=originalAimingTutorial(r.q,(e,state)=>{if(e.address===0x466fb0)state.sourceText='Player'+e.args[0];if(e.address===0x45e9c0)messages.push(state.sourceText);return {state};});const actual={calls:out.calls,messages,sourceText:out.state.sourceText};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({id:r.q.actorId,actual,expected:r.expected}));}console.log('152 native aiming tutorial boundaries match calls, profiles, messages and final text.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
