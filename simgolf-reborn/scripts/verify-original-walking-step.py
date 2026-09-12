"""Native walking-rate selection with controlled sound playback."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EDI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[];q={};rate=None
def hook(u,a,size,data):
 global end,rate
 if a==0x42b17c:rate=u.reg_read(UC_X86_REG_EDI)
 if a in [0x4295e6,0x42b2b2]:end=hex(a);u.emu_stop()
 if a==0x40c1f0:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,5)];calls.append(dict(address=a,args=args))
  u.reg_write(UC_X86_REG_EAX,0);u.reg_write(UC_X86_REG_EIP,get(sp)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42);rows=[]
for i in range(1400):
 b=bytearray(512);struct.pack_into('<ii',b,8,24560,24560);struct.pack_into('<h',b,0xaa,1);struct.pack_into('<h',b,0xa6,rng.choice([-1,0,0]));struct.pack_into('<h',b,0xb2,rng.choice([0,40,41,159,160,200]));b[0x22]=rng.choice(list(range(8))+[255]);b[0x2a]=rng.choice([0,1,2,255]);b[256+0x2a]=rng.choice([0,1,2,255]);struct.pack_into('<I',b,0x18,rng.choice([0,0x10000,0x8000,0x18000,0x4000]));marks=[rng.choice([0,32]) for _ in range(2500)];metadata=[dict(walkingCost=rng.choice([-1,0,1,3,8]),shotClass=rng.choice([-1,0,1,2])) for _ in range(23)]
 q=dict(actorId=0,actorIndex=23*50+23,actorTile=dict(x=23,z=23),nextTerrain=rng.choice([0,1,10,17]),distance=rng.choice([512,1024,2000]),cachedFlags=rng.choice([0,0x8000]),phaseCounter=rng.randrange(64),worldFlags=rng.choice([0,0x200000]),selectionState=rng.choice([-1,0,1]),cartUpgrade=rng.randrange(4))
 q.update(difficulty=i%3,fastWalking=i%2);put(0x820344,q['difficulty']);put(0x599a9c,q['fastWalking']);u.mem_write(0x570d38,bytes([10]*2500));u.mem_write(0x577f00,bytes(b));u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 for j,m in enumerate(metadata):u.mem_write(0x576dc2+j*48,bytes([m['shotClass']&255]));u.mem_write(0x576dc5+j*48,bytes([m['walkingCost']&255]))
 for addr,v in [(0x59d208,q['worldFlags']),(0x5a4440,q['selectionState']),(0x831828,q['phaseCounter']),(0x542bdc,q['cartUpgrade'])]:put(addr,v)
 for off,v in [(0x10,0),(0x2c,q['nextTerrain']),(0x3c,q['actorIndex']),(0x40,23),(0x4c,23),(0x50,q['cachedFlags']),(0x70,q['distance'])]:put(0x102000+off,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);end=None;calls=[];rate=None;u.emu_start(0x42af66,0x400fff,count=10000);assert end
 e=dict(actors=list(u.mem_read(0x577f00,512)),calls=calls,next=end)
 if rate is not None:e['walkingRate']=rate
 rows.append([q,list(b),marks,metadata,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingStep}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let sounds=0;for(const [q,b,t,metadata,e] of rows){const r=originalWalkingStep({...q,actors:[new Uint8Array(b.slice(0,256)),new Uint8Array(b.slice(256))],tileFlags:new Uint16Array(t),terrain:new Uint8Array(2500).fill(10),metadata},(_,state)=>({state}));const a={actors:r.state.actors.flatMap(b=>Array.from(b)),calls:r.calls,next:r.next};if(r.walkingRate!==undefined)a.walkingRate=r.walkingRate;if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));sounds+=r.calls.length;}console.log(`${rows.length} continuous native walking steps match; ${sounds} activation sounds.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-step.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
