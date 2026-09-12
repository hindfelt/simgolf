"""Compare native tee queue branch; cleanup effects controlled and mutation-tested."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[]
def hook(u,a,size,data):
 if a==0x429192:u.emu_stop()
 if a==0x425b50:
  sp=u.reg_read(UC_X86_REG_ESP);index=get(sp+4);calls.append(dict(address=a,args=[index]));u.mem_write(0x577f29+index*256,b'\0');put(0x568f6c,get(0x568f6c)+17)
  u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(4290);rows=[]
for i in range(600):
 actors=bytearray(152*256);holes=bytearray(20*520);id=rng.randrange(152)
 for j in range(152):
  base=j*256;actors[base+0x29]=rng.choice([0,1,2,19,255]);actors[base+0x2a]=rng.choice([0,0,1]);struct.pack_into('<h',actors,base+0xaa,j^1);struct.pack_into('<h',actors,base+0xc6,rng.randint(-32768,32767))
 actors[id*256+0x29]=rng.choice([1,2,19])
 for j in range(20):holes[j*520]=rng.choice([0,3,4])
 q=dict(actorId=id,queueClock=rng.choice([0,1000,2147483647,-2147483648]),selectionState=rng.choice([-1,id,id^1]),worldFlags=rng.choice([0,0,0x200000,0x4000000]),waitingGroups=rng.choice([0,3,2147483647]))
 u.mem_write(0x577f00,bytes(actors));u.mem_write(0x574500,bytes(holes));put(0x568f6c,q['queueClock']);put(0x5a4440,q['selectionState']);put(0x59d208,q['worldFlags']);put(0x102010,id);put(0x102038,q['waitingGroups']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EAX,actors[id*256+0x29]);calls=[];u.emu_start(0x4290ca,0x429192,count=20000)
 rows.append([q,list(actors),list(holes),dict(actors=list(u.mem_read(0x577f00,len(actors))),queueClock=get(0x568f6c),waitingGroups=get(0x102038),calls=calls)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingQueue}=await import(MODULE);let effects=0;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,h,e] of rows){const actors=Array.from({length:152},(_,i)=>new Uint8Array(b.slice(i*256,(i+1)*256)));const holes=Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520)));const r=originalWalkingQueue({...q,actors,holes},(event,state)=>{state.actors[event.args[0]][0x29]=0;state.queueClock=(state.queueClock+17)|0;return {state};});const actual={actors:r.state.actors.flatMap(b=>Array.from(b)),queueClock:r.state.queueClock>>>0,waitingGroups:r.waitingGroups>>>0,calls:r.calls};if(!isDeepStrictEqual(actual,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(actual[k],e[k]))}));effects+=r.calls.length;}console.log(`${rows.length} native tee-queue cases match; ${effects} ordered cleanup effects.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-queue.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
