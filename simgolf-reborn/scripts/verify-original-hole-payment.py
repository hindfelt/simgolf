"""Native tutorial/payment path, actual number formatting, controlled UI effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
counts={0x466fb0:2,0x40c7f0:3,0x40c580:4}
for a in counts:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text():return bytes(u.mem_read(0x518f78,800)).split(b'\0')[0].decode()
calls=[];mutate=False;base=0

def hook(u,a,size,data):
 if a==0x426e6b:u.emu_stop()
 if a in counts:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(counts[a])],sourceText=text(),cashTotal=read(0x570a24)))
  if a==0x466fb0:u.mem_write(0x518f78,b'Gary\0')
  if mutate:
   if a==0x466fb0:put(0x4c1848,7);u.mem_write(base+0x29,b'\x02')
   if a==0x40c7f0:put(0x4c1848,-9);u.mem_write(0x5a5784,b'\x01\x00')
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9812);rows=[]
for i in range(1200):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(256);b[0x29]=1;struct.pack_into('<i',b,8,1234);struct.pack_into('<i',b,12,-5678)
 periods=bytearray(rng.randbytes(60));struct.pack_into('<H',periods,0,rng.choice([0,0,500]));hole=rng.randbytes(520);flags=rng.choice([0,0,0,0x200000]);value=rng.choice([-1,0,7,2147483647]);period=rng.randrange(2);cash=rng.choice([0,200,2147483647]);mutate=i%2==0
 q=dict(actorId=id,actor=list(b),periods=list(periods),hole=list(hole),globalFlags=flags,settlementValue=value,periodIndex=period,cashTotal=cash,sourceText='Before',recordHolder=-1,presentationMode=0)
 u.mem_write(base,bytes(b));u.mem_write(0x574500,hole*20);u.mem_write(0x582c60,bytes(periods));u.mem_write(0x518f78,b'Before\0')
 for addr,v in [(0x59d208,flags),(0x4c1848,value),(0x570a24,cash),(0x4c1dfc,-1),(0x5a8714,0)]:put(addr,v)
 u.mem_write(0x5a5784,struct.pack('<h',period));calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EBX,id);u.reg_write(UC_X86_REG_ECX,value&0xffffffff);u.emu_start(0x426c92,0x400fff,count=20000)
 expected=dict(actor=list(u.mem_read(base,256)),periods=list(u.mem_read(0x582c60,60)),holes=hashlib.sha256(bytes(u.mem_read(0x574500,520*20))).hexdigest(),sourceText=text(),cashTotal=read(0x570a24),settlementValue=read(0x4c1848),periodIndex=struct.unpack('<h',u.mem_read(0x5a5784,2))[0],recordHolder=read(0x4c1dfc),presentationMode=read(0x5a8714),calls=calls);rows.append(dict(q=q,mutate=mutate,expected=expected))
module=(root/'simgolf-reborn/scene/src/simulation/original-hole-payment.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';const {originalHolePayment}=await import(MODULE);let effects=0;for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[],calls=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalHolePayment({...q,actors,financialPeriods:Array.from({length:3},(_,i)=>Uint8Array.from(q.periods.slice(i*20,i*20+20))),holeRecords:Array.from({length:20},()=>Uint8Array.from(q.hole))},(e,state)=>{calls.push({...e,sourceText:state.sourceText,cashTotal:state.cashTotal});if(e.address===0x466fb0)state.sourceText='Gary';if(r.mutate){if(e.address===0x466fb0){state.settlementValue=7;state.actors[q.actorId][0x29]=2;}if(e.address===0x40c7f0){state.settlementValue=-9;state.periodIndex=1;}}return {state};});const s=a.state,actual={actor:Array.from(s.actors[q.actorId]),periods:s.financialPeriods.flatMap(b=>Array.from(b)),holes:createHash('sha256').update(Buffer.concat(s.holeRecords.map(b=>Buffer.from(b)))).digest('hex'),sourceText:s.sourceText,cashTotal:s.cashTotal,settlementValue:s.settlementValue,periodIndex:s.periodIndex,recordHolder:s.recordHolder,presentationMode:s.presentationMode,calls};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,r,actual}));effects+=calls.length;}console.log(`1200 native hole-payment cases match; ${effects} ordered presentation effects.`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
