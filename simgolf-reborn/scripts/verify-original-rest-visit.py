"""Native rest arrivals with actual adjacency and controlled reaction effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EDI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
calls=[];end=False;attempts=0
def hook(u,a,size,data):
 global end,attempts
 if a==0x42a168:end=True;u.emu_stop();return
 sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,5 if a==0x40c1f0 else 4)];calls.append(dict(address=a,args=args));value=0
 if a==0x4672d0:u.mem_write(0x577f8d,bytes([args[1]]))
 if a==0x4071d0:return
 u.reg_write(UC_X86_REG_EAX,value);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
for address in [0x42a168,0x4672d0,0x40c1f0,0x4071d0]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42026);rows=[]
for i in range(1200):
 b=bytearray(rng.randbytes(256));struct.pack_into('<h',b,0xb2,rng.choice([1,2,20,100]));q=dict(actorId=0,actorTile=dict(x=23,z=24),restDecoration=rng.randrange(256),seed=rng.getrandbits(32),acceptAfter=rng.randrange(1,10))
 terrain=bytearray(rng.choices([1,2,7,17,20,21,22],k=2500));flags=[rng.choice([0,0,32,256]) for _ in range(2500)];metadata=[rng.choice([-1,0,1,2]) for _ in range(23)]
 u.mem_write(0x570d38,bytes(terrain));u.mem_write(0x53ba00,struct.pack('<2500H',*flags))
 for j,v in enumerate(metadata):u.mem_write(0x576dc2+j*48,bytes([v&255]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x5682dc+23*50+24,bytes([q['restDecoration']]));put(0x820454,q['seed'])
 for off,v in [(0x10,0),(0x40,23),(0x4c,24),(0x6c,23*50)]:put(0x102000+off,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_FPCW,0x37f);calls=[];end=False;attempts=0;u.emu_start(0x42a026,0x400fff,count=100000);assert end
 rows.append([q,list(b),list(terrain),flags,metadata,dict(actor=list(u.mem_read(0x577f00,256)),seed=get(0x820454)&0xffffffff,calls=calls)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRestVisit}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,t,f,m,e] of rows){let attempts=0;const r=originalRestVisit({...q,actors:[new Uint8Array(b)],terrain:new Uint8Array(t),tileFlags:new Uint16Array(f),metadata:m.map(shotClass=>({shotClass}))},(event,state)=>{if(event.address===0x4672d0)state.actors[0][0x8d]=event.args[1];return {state,value:event.address===0x4071d0?Number(++attempts>=q.acceptAfter):0};});const a={actor:Array.from(r.state.actors[0]),seed:r.state.seed,calls:r.calls};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));}console.log(`${rows.length} native rest visits with actual adjacency match actors, RNG and ordered effects.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-rest-visit.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
