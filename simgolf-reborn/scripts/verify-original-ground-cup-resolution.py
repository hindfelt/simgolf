"""Continuous cup completion with actual ordinary hole scoring."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_ECX,UC_X86_REG_EBX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
counts={0x405e80:2,0x40c1f0:4,0x466fb0:2,0x40c7f0:3,0x40c580:4,0x4672d0:3,0x45b2c0:1,0x45b180:1,0x4093b0:1,0x40c140:3}
for a in counts:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text():return bytes(u.mem_read(0x518f78,800)).split(b'\0')[0].decode()
calls=[];mutate=False;branch=None

def hook(u,a,size,data):
 global branch
 if a==0x4295ef:branch='skip';u.emu_stop()
 if a in [0x425b50,0x426b00]:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4)]))
 if a==0x40c140:u.reg_write(UC_X86_REG_EAX,0)
 if a in counts:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(counts[a])]))
  if a==0x466fb0:u.mem_write(0x518f78,b'Gary\0')
  if mutate:
   if a==0x405e80:u.mem_write(0x577f21,b'\x02');u.mem_write(0x577f29,b'\x02');u.mem_write(0x577fc2,b'\x01')
   if a==0x40c1f0:put(0x4c1848,read(0x4c1848)+1)
   if a==0x40c7f0:put(0x4c1848,-9);u.mem_write(0x5a5784,b'\x01\x00')
   if a==0x4672d0:u.mem_write(0x577f29,b'\x03');u.mem_write(0x577f2a,b'\x06');put(0x831828,120)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9912);rows=[]
for i in range(1200):
 b=bytearray(256);b[0x20]=rng.choice([0,0,32]);b[0x21]=rng.randrange(16);b[0x29]=rng.choice([1,2,18]);b[0x2a]=rng.choice([1,4,127,255]);b[0x8c]=rng.choice([0,1]);struct.pack_into('<h',b,0xac,rng.randrange(-20,40));struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<i',b,0xc8,rng.choice([-1,0,50,2147483647]))
 hole=rng.randbytes(520);stat=rng.randbytes(184);record=rng.randbytes(44);periods=bytearray(40);periods[0]=rng.choice([0,1]);notices=bytearray(64*76);notices[0]=1;flags=rng.choice([0,0x200000]);mode=rng.choice([0,2]);bonus=rng.choice([-2,0,7]);mutate=i%2==0
 q=dict(actor=list(b),hole=list(hole),stat=list(stat),record=list(record),periods=list(periods),notices=list(notices),globalFlags=flags,settlementMode=mode,settlementBonus=bonus,cashTotal=200,periodIndex=0,phaseCounter=100,recordHolder=-1,presentationMode=0,sourceText='Before',courseHoleCount=19,selectionState=0,difficulty=1,performanceBonus=0,secondaryBalance=0,adjustmentSetting=0,scoreList=[0]*10,ballTile=dict(x=rng.randrange(50),z=rng.randrange(50)),visualSlot=rng.choice([-1,0,15]),settlementValue=0)
 x=q['ballTile']['x']*1024+512;z=q['ballTile']['z']*1024+512
 struct.pack_into('<i',b,0xdc,x);struct.pack_into('<i',b,0xe0,z);struct.pack_into('<i',b,0xec,160);q['actor']=list(b)
 q.update(ballTerrain=1,direction=0,subX=8,subZ=8,centreFlag=0,boundaryFlags=0,rollCoefficient=4,seed=1,worldFlags=flags)
 u.mem_write(0x570d38,bytes([1])*2500);u.mem_write(0x53ba00,struct.pack('<H',128)*2500);u.mem_write(0x576dc1+48,b'\x04');put(0x820454,1)
 for addr,value in [(0x577f00,bytes(b)),(0x574500,hole*20),(0x5698c0,stat*32),(0x583430,record),(0x582c60,bytes(periods)),(0x5842b2,bytes(notices)),(0x518f78,b'Before\0')]:u.mem_write(addr,value)
 for addr,v in [(0x59d208,flags),(0x542c04,mode),(0x542be8,bonus),(0x570a24,200),(0x5a5784,0),(0x831828,100),(0x4c1dfc,-1),(0x5a8714,0)]:put(addr,v)
 u.mem_write(0x574500+19*520,b'\0');u.mem_write(0x574500+20*520,bytes(520));u.mem_write(0x568f74,bytes(40))
 for addr,v in [(0x5672a0,19),(0x5a4440,0),(0x820344,1),(0x542bd4,0),(0x56bc00,0),(0x542be4,0)]:put(addr,v)
 put(0x4c1848,0);put(0x102010,0);put(0x102018,q['ballTile']['x']);put(0x102030,q['visualSlot']);calls=[];branch=None;u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,q['ballTile']['z']);put(0x102014,1);put(0x102020,q['ballTile']['z']);put(0x102028,0);put(0x10201c,0);put(0x102050,0);put(0x102074,8);u.reg_write(UC_X86_REG_EAX,x);u.reg_write(UC_X86_REG_ECX,z);u.reg_write(UC_X86_REG_EBX,8);u.emu_start(0x42c13a,0x400fff,count=50000)
 def h(addr,n):return hashlib.sha256(bytes(u.mem_read(addr,n))).hexdigest()
 rows.append(dict(q=q,mutate=mutate,expected=dict(actor=list(u.mem_read(0x577f00,256)),record=list(u.mem_read(0x583430,44)),holes=h(0x574500,520*21),stats=h(0x5698c0,184*32),periods=h(0x582c60,40),notices=h(0x5842b2,76*64),value=read(0x4c1848),cashTotal=read(0x570a24),periodIndex=struct.unpack('<h',u.mem_read(0x5a5784,2))[0],phaseCounter=read(0x831828),recordHolder=read(0x4c1dfc),presentationMode=read(0x5a8714),sourceText=text(),calls=calls,next=branch,selectionState=read(0x5a4440),scoreList=list(struct.unpack('<10i',u.mem_read(0x568f74,40))))))
module=(root/'simgolf-reborn/scene/src/simulation/original-ground-resolution.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';const {originalGroundResolution}=await import(MODULE);const hash=rows=>createHash('sha256').update(Buffer.concat(rows.map(b=>Buffer.from(b)))).digest('hex');for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q;const a=originalGroundResolution({...q,terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500).fill(128),actorId:0,actors:[Uint8Array.from(q.actor)],scoreList:Int32Array.from(q.scoreList),holeRecords:Array.from({length:21},(_,i)=>{const b=i===20?new Uint8Array(520):Uint8Array.from(q.hole);if(i===19)b[0]=0;return b;}),statRecords:Array.from({length:32},()=>Uint8Array.from(q.stat)),completionRecords:[Uint8Array.from(q.record)],financialPeriods:Array.from({length:2},(_,i)=>Uint8Array.from(q.periods.slice(i*20,i*20+20))),completionNotices:Array.from({length:64},(_,i)=>Uint8Array.from(q.notices.slice(i*76,i*76+76)))},(e,state)=>{if(e.address===0x466fb0)state.sourceText='Gary';if(r.mutate){if(e.address===0x405e80){state.actors[0][0x21]=2;state.actors[0][0x29]=2;state.actors[0][0xc2]=1;}if(e.address===0x40c1f0)state.settlementValue=(state.settlementValue+1)|0;if(e.address===0x40c7f0){state.settlementValue=-9;state.periodIndex=1;}if(e.address===0x4672d0){state.actors[0][0x29]=3;state.actors[0][0x2a]=6;state.phaseCounter=120;}}return {state,value:0};});const s=a.state,actual={actor:Array.from(s.actors[0]),record:Array.from(s.completionRecords[0]),holes:hash(s.holeRecords),stats:hash(s.statRecords),periods:hash(s.financialPeriods),notices:hash(s.completionNotices),value:s.settlementValue,cashTotal:s.cashTotal,periodIndex:s.periodIndex,phaseCounter:s.phaseCounter,recordHolder:s.recordHolder,presentationMode:s.presentationMode,sourceText:s.sourceText,calls:a.calls,next:a.next,selectionState:s.selectionState,scoreList:Array.from(s.scoreList)};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));}console.log('1200 continuous native rolling-to-scored-cup cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
