"""Native course-record announcement, with controlled name/list presentation."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x466fb0,0x45b180]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text():return bytes(u.mem_read(0x518f78,500)).split(b'\0')[0].decode()
calls=[];mutate=False

def hook(u,a,size,data):
 if a==0x427d38:u.emu_stop()
 if a in [0x466fb0,0x45b180]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(2 if a==0x466fb0 else 1)],recordHolder=read(0x4c1dfc),sourceText=text()))
  u.mem_write(0x518f78,(text()+'X').encode()+b'\0')
  if mutate:put(0x5672a0,19)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9612);rows=[]
for i in range(1400):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(256);b[0x2c]=rng.choice([0,4,4,255]);score=rng.randrange(-20,90);par=rng.choice([score-1,score,score+1]);count=rng.choice([2,3,7,19]);holder=rng.choice([-1,-1,-1,0]);first=rng.choice([0,score,score+1]);bits=rng.choice([0,10,2147483647]);mutate=i%2==0
 q=dict(actorId=id,actor=list(b),courseHoleCount=count,recordHolder=holder,scoreList=[first]+[0]*9,sourceText='Before',totals=dict(playedStrokes=score,playedPar=par,completionBits=bits))
 u.mem_write(base,bytes(b));put(0x5672a0,count);put(0x4c1dfc,holder);put(0x568f74,first);u.mem_write(0x518f78,b'Before\0');put(0x10202c,par);put(0x102014,bits);put(0x102034,id);calls=[]
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EBX,score&0xffffffff);u.emu_start(0x427bd4,0x400fff,count=20000)
 rows.append(dict(q=q,mutate=mutate,expected=dict(sourceText=text(),recordHolder=read(0x4c1dfc),courseHoleCount=read(0x5672a0),completionBits=read(0x102014),calls=calls)))
module=(root/'simgolf-reborn/scene/src/simulation/original-record-announcement.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRecordAnnouncement}=await import(MODULE);let count=0;for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[],calls=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalRecordAnnouncement({...q,actors,scoreList:Int32Array.from(q.scoreList)},(e,state)=>{calls.push({...e,recordHolder:state.recordHolder,sourceText:state.sourceText});state.sourceText+='X';if(r.mutate)state.courseHoleCount=19;return {state};});const actual={sourceText:a.state.sourceText,recordHolder:a.state.recordHolder,courseHoleCount:a.state.courseHoleCount,completionBits:a.totals.completionBits,calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));count+=a.announced;}console.log(`1400 native record-announcement cases match, including ${count} announcements; native number formatting retained.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
