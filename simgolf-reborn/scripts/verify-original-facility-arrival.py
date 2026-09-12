"""Native facility arrivals with controlled reaction, sound and money notices."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];end=False
def hook(u,a,size,data):
 global end
 if a==0x4295ef:end=True;u.emu_stop();return
 sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,4 if a==0x4672d0 else 5)];calls.append(dict(address=a,args=args))
 if a==0x4672d0:
  u.mem_write(0x577f8c,bytes([250]));put(0x570a24,get(0x570a24)+7);put(0x5a76a0,2);put(0x5a76a8,2)
 if a==0x40c580:u.mem_write(0x5a5784,struct.pack('<h',1))
 u.reg_write(UC_X86_REG_EAX,1);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
for address in [0x4295ef,0x4672d0,0x40c1f0,0x40c580]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42200);rows=[]
for i in range(900):
 b=bytearray(rng.randbytes(256));struct.pack_into('<ii',b,8,24000,23000);f=bytearray(4096);kind=rng.choice([1,3,6,7,8,10]);struct.pack_into('<hhh',f,0,kind,20,20);flags=[0]*2500;flags[1020]=rng.randrange(65536);tileState=bytearray([255]*2500);ledger=[rng.randint(-32768,32767) for _ in range(3)]
 q=dict(actorId=0,serviceIndex=0,seed=rng.getrandbits(32),cashUnits=rng.randint(-10000,10000),ledgerPeriod=0,type6Level=rng.choice([-1,0,1,2,3]),type8Level=rng.choice([0,1,2]),type10Level=rng.choice([0,1,2]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x58a708,bytes(f));u.mem_write(0x53ba00,struct.pack('<2500H',*flags));u.mem_write(0x577254,bytes(tileState))
 for j,v in enumerate(ledger):u.mem_write(0x582c64+j*20,struct.pack('<h',v))
 for a,v in [(0x820454,q['seed']),(0x570a24,q['cashUnits']),(0x5a7698,q['type6Level']),(0x5a76a0,q['type8Level']),(0x5a76a8,q['type10Level']),(0x102010,0)]:put(a,v)
 u.mem_write(0x5a5784,b'\0\0');u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,0);u.reg_write(UC_X86_REG_FPCW,0x37f);calls=[];end=False;u.emu_start(0x42a200,0x400fff,count=100000);assert end
 e=dict(actor=list(u.mem_read(0x577f00,256)),seed=get(0x820454)&0xffffffff,cashUnits=get(0x570a24),ledgerPeriod=struct.unpack('<h',u.mem_read(0x5a5784,2))[0],ledger=[struct.unpack('<h',u.mem_read(0x582c64+j*20,2))[0] for j in range(3)],flags=list(struct.unpack('<2500H',u.mem_read(0x53ba00,5000))),tileState=list(u.mem_read(0x577254,2500)),calls=calls)
 rows.append([q,list(b),list(f),flags,list(tileState),ledger,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalFacilityArrival}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,f,flags,t,ledger,e] of rows){const r=originalFacilityArrival({...q,actors:[new Uint8Array(b)],facilityRecords:new Uint8Array(f),tileFlags:new Uint16Array(flags),tileServiceState:new Uint8Array(t),serviceIncome:new Int16Array(ledger)},(event,state)=>{if(event.address===0x4672d0){state.actors[0][0x8c]=250;state.cashUnits=(state.cashUnits+7)|0;state.type8Level=2;state.type10Level=2;}if(event.address===0x40c580)state.ledgerPeriod=1;return {state,value:1};});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,cashUnits:r.state.cashUnits,ledgerPeriod:r.state.ledgerPeriod,ledger:Array.from(r.state.serviceIncome),flags:Array.from(r.state.tileFlags),tileState:Array.from(r.state.tileServiceState),calls:r.calls};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));}console.log(`${rows.length} native facility arrival cases match actors, RNG, income, tiles and calls.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-facility-arrival.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
