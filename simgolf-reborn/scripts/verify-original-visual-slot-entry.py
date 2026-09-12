"""Native visual entry/countdown stage with controlled reaction helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
counts={0x466ea0:1,0x4672d0:3,0x40c580:4}
for address in counts:u.mem_write(address,b'\xc3')
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];branch=None
def hook(u,address,size,data):
 global branch
 if address in [0x402b6b,0x40383c]:branch='skip' if address==0x40383c else hex(address);u.emu_stop();return
 if address in counts:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=address,args=[read(sp+4+j*4) for j in range(counts[address])]))
  u.reg_write(UC_X86_REG_EAX,3)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(2002);rows=[]
for i in range(1024):
 slot=i%64;b=bytearray(76);b[0x12]=rng.choice([0,1,8,9]);b[0x13]=rng.choice([0,255]);b[0x14]=rng.choice([0,251,254]);b[0x15]=rng.choice([0,1,5,6]);struct.pack_into('<H',b,0x1a,rng.choice([0,1,65535]));struct.pack_into('<ii',b,0,123,456)
 actor=bytearray(256)
 for offset in [0xae,0xb0,0xb2]:struct.pack_into('<h',actor,offset,rng.choice([-1,0,16,17,160,161]))
 period=bytearray(20);struct.pack_into('<H',period,4,rng.choice([0,65535]));phase=rng.randrange(8);selected=rng.choice([-1,1]);cash=rng.choice([0,2147483647]);records=[None]*64;records[slot]=list(b)
 q=dict(visualRecords=records,actors=[list(actor)],financialPeriods=[list(period)],periodIndex=0,phaseCounter=phase,selectedActor=selected,cashTotal=cash)
 u.mem_write(0x5842a0+slot*76,bytes(b));u.mem_write(0x577f00,bytes(actor));u.mem_write(0x582c60,bytes(period));u.mem_write(0x5a5784,b'\0\0')
 for address,value in [(0x831828,phase),(0x5a4440,selected),(0x570a24,cash)]:u.mem_write(address,struct.pack('<I',value&0xffffffff))
 calls=[];branch=None;u.reg_write(UC_X86_REG_ESI,slot);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x4029f3,0x400fff,count=1000)
 rows.append(dict(slot=slot,q=q,expected=dict(record=list(u.mem_read(0x5842a0+slot*76,76)),actor=list(u.mem_read(0x577f00,256)),period=list(u.mem_read(0x582c60,20)),cash=read(0x570a24),calls=calls,next=branch)))
module=(root/'simgolf-reborn/scene/src/simulation/original-visual-slot-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalVisualSlotEntry}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){for(const k of ['visualRecords','actors','financialPeriods'])r.q[k]=r.q[k].map(b=>b===null?null:Uint8Array.from(b));const out=originalVisualSlotEntry(r.q,r.slot,(_,state)=>({state,value:3}));const actual={record:Array.from(out.state.visualRecords[r.slot]),actor:Array.from(out.state.actors[0]),period:Array.from(out.state.financialPeriods[0]),cash:out.state.cashTotal,calls:out.calls,next:out.next};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('1024 native visual-entry cases match records, reactions, cash, ledger and branch.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
