"""Continuous round-result processing and next-hole transition, retaining real round exit."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x45b2c0,0x45b180,0x466fb0]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text():return bytes(u.mem_read(0x518f78,300)).split(b'\0')[0].decode()
calls=[];branch=None

def hook(u,a,size,data):
 global branch
 if a in [0x4280a3,0x4280e3,0x4280f8]:branch='return';u.emu_stop()
 if a==0x425b50:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4)]))
 if a in [0x45b2c0,0x45b180,0x466fb0]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(2 if a==0x466fb0 else 1)],sourceText=text()))
  u.mem_write(0x518f78,(text()+'x').encode()+b'\0');put(0x568f98,read(0x568f98)+1)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9512);rows=[]
for i in range(1500):
 id=rng.choice([0,1,127,150]);base=0x577f00+id*256;b=bytearray(256);b[0x29]=rng.randrange(19);b[0x20]=rng.choice([0,0x20,0xa0]);struct.pack_into('<h',b,0xaa,151);struct.pack_into('<h',b,0xac,rng.randrange(-20,40));struct.pack_into('<I',b,0x18,rng.randrange(2**32))
 for h in range(1,19):b[0x2b+h]=rng.choice([0,3,4,5,8,127,255])
 holes=[rng.choice([0,3,4,5,255]) for _ in range(21)];holes[b[0x29]+1]=0 if i%3 else 4
 record=rng.randbytes(44)
 scores=sorted([rng.randrange(-100,200) for _ in range(i%11)])+[0]*(10-i%11)
 flags=0x200000 if i%11==0 else 0
 q=dict(actorId=id,actor=list(b),holes=holes,record=list(record),scoreList=scores,globalFlags=flags,sourceText='previous',courseHoleCount=19,recordHolder=-1,selectionState=4,difficulty=rng.randrange(4),performanceBonus=0,periodIndex=1,cashTotal=500,secondaryBalance=0,adjustmentSetting=0)
 u.mem_write(base,bytes(b));u.mem_write(0x583430,record);u.mem_write(0x568f74,struct.pack('<10i',*scores));u.mem_write(0x518f78,b'previous\0');put(0x59d208,flags)
 u.mem_write(0x577f00+151*256,bytes(256));u.mem_write(0x577f29+151*256,b'\x01')
 for address,name in [(0x5672a0,'courseHoleCount'),(0x4c1dfc,'recordHolder'),(0x5a4440,'selectionState'),(0x820344,'difficulty'),(0x542bd4,'performanceBonus'),(0x5a5784,'periodIndex'),(0x570a24,'cashTotal'),(0x56bc00,'secondaryBalance'),(0x542be4,'adjustmentSetting')]:put(address,q[name])
 for j,n in enumerate(holes):u.mem_write(0x574500+j*520,bytes([n])+bytes(519))
 put(0x102034,id);calls=[];branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x427a53,0x400fff,count=10000)
 expected=dict(scoreList=list(struct.unpack('<10i',u.mem_read(0x568f74,40))),sourceText=text(),calls=calls,next=branch)
 expected.update(actor=list(u.mem_read(base,256)),record=list(u.mem_read(0x583430,44)),recordHolder=read(0x4c1dfc),selectionState=read(0x5a4440))
 rows.append(dict(q=q,expected=expected))
module=(root/'simgolf-reborn/scene/src/simulation/original-round-finish.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRoundFinish}=await import(MODULE);let effects=0;for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[],observed=[];actors[q.actorId]=Uint8Array.from(q.actor);actors[151]=new Uint8Array(256);actors[151][0x29]=1;const a=originalRoundFinish({...q,actors,scoreList:Int32Array.from(q.scoreList),completionRecords:[Uint8Array.from(q.record)],holeRecords:q.holes.map(n=>{const b=new Uint8Array(520);b[0]=n;return b;})},(e,state)=>{observed.push({...e,sourceText:state.sourceText});state.sourceText+='x';state.scoreList[9]++;return {state};});let cursor=0;const calls=a.calls.map(e=>e.address===0x425b50?e:observed[cursor++]);const actual={scoreList:Array.from(a.state.scoreList),sourceText:a.state.sourceText,calls,next:a.next,actor:Array.from(a.state.actors[q.actorId]),record:Array.from(a.state.completionRecords[0]),recordHolder:a.state.recordHolder,selectionState:a.state.selectionState};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));effects+=calls.length;}console.log(`1500 continuous native round finishes match; ${effects} ordered calls, real round exit retained.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
