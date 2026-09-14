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
def readtext(a):return bytes(u.mem_read(a,512)).split(b'\0')[0].decode('ascii')
def hook(u,a,size,data):
 global end
 if a==0x4295ef:end=True;u.emu_stop();return
 sp=u.reg_read(UC_X86_REG_ESP);value=0
 if a==0x4acb95:
  value=get(sp+8);u.mem_write(value,str(get(sp+4)).encode()+b'\0')
 else:
  count={0x466fb0:2,0x40c7f0:3,0x447a30:5,0x425b50:1}[a];args=[get(sp+4*j) for j in range(1,count+1)];calls.append(dict(address=a,args=args))
  if a==0x466fb0:u.mem_write(0x518f78,(readtext(0x518f78)+'Golfer '+str(args[0])).encode()+b'\0')
  if a==0x425b50:u.mem_write(0x577f29+args[0]*256,b'\0')
 u.reg_write(UC_X86_REG_EAX,value);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
for address in [0x4295ef,0x466fb0,0x40c7f0,0x447a30,0x425b50,0x4acb95]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42);rows=[]
for i in range(800):
 b=bytearray(rng.randbytes(512));h=bytearray(rng.randbytes(20*520));records=bytearray(rng.randbytes(44*3));b[0x29]=rng.randrange(1,19);struct.pack_into('<h',b,0xaa,1);struct.pack_into('<h',b,0xbe,i%3);q=dict(actorId=0,messageFlag=255)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));u.mem_write(0x583430,bytes(records));u.mem_write(0x568148,b'\xff');put(0x102010,0);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);calls=[];end=False;u.emu_start(0x42adac,0x400fff,count=100000);assert end
 rows.append([q,list(b),list(h),list(records),dict(actors=list(u.mem_read(0x577f00,512)),holes=list(u.mem_read(0x574500,len(h))),records=list(u.mem_read(0x583430,len(records))),messageFlag=u.mem_read(0x568148,1)[0],sourceText=readtext(0x518f78),calls=calls)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalCongestionDeparture}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,h,c,e] of rows){const r=originalCongestionDeparture({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520))),completionRecords:Array.from({length:3},(_,i)=>new Uint8Array(c.slice(i*44,(i+1)*44)))},(event,state)=>{if(event.address===0x466fb0)state.sourceText+='Golfer '+event.args[0];if(event.address===0x425b50)state.actors[event.args[0]][0x29]=0;return {state};});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),holes:r.state.holes.flatMap(b=>Array.from(b)),records:r.state.completionRecords.flatMap(b=>Array.from(b)),messageFlag:r.state.messageFlag,sourceText:r.state.sourceText,calls:r.calls};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));}console.log(`${rows.length} native congestion departures match actors, records, complaint and calls.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-congestion-departure.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
