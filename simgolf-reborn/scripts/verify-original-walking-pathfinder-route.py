"""Continuous far walking with actual pathfinder; controlled reaction mutation."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[];q={}
def hook(u,a,size,data):
 global end
 if a in [0x42a758,0x42abda]:end=hex(a);u.emu_stop()
 if a in [0x42def0,0x4672d0]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,6 if a==0x42def0 else 4)];calls.append(dict(address=a,args=args))
  if a==0x42def0:return
  u.mem_write(0x577fc4,bytes([85]))
  u.reg_write(UC_X86_REG_EAX,q['routeHeading']);u.reg_write(UC_X86_REG_EIP,get(sp)&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4)

for address in [0x42a758,0x42abda,0x42def0,0x4672d0]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(42);rows=[]
for i in range(160):
 b=bytearray(256);struct.pack_into('<h',b,0x1c,rng.choice([-1,0,0,1]));struct.pack_into('<ii',b,8,rng.randrange(1000,50000),rng.randrange(1000,50000));b[0x8d]=rng.choice([0,7,135]);b[0xc4]=255
 q=dict(actorId=0,actorIndex=10,destination=dict(x=30000,z=30000),previousFacing=rng.randrange(8),reversalCheck=rng.randrange(2),phaseCounter=rng.randrange(32),worldFlags=rng.choice([0,256,0x80000]),seed=rng.getrandbits(32),routeFlags=rng.choice([0,0x81000]),routeHeading=rng.randrange(8))
 terrain=bytearray(rng.choices([0,1,2,7,17,20,22],k=2500));flags=[rng.choice([0,32,0x120,0x123,0x420]) for _ in range(2500)];costs=[rng.choice([1,2,4,8,20]) for _ in range(2500)];metadata=bytearray(rng.choices([0,7],k=128))
 x,z=struct.unpack_from('<ii',b,8);q['actorIndex']=(x>>10)*50+(z>>10);b[0x29]=rng.choice([1,2,19]);partner=bytearray(256);struct.pack_into('<ii',partner,8,29000,31000)
 u.mem_write(0x577f00,bytes(b)+bytes(partner));u.mem_write(0x570d38,bytes(terrain));u.mem_write(0x53ba00,struct.pack('<2500H',*flags));u.mem_write(0x53aabc,struct.pack('<2500b',*costs));u.mem_write(0x58bdc0,bytes(2500));u.mem_write(0x5a5e4c,bytes(2048));u.mem_write(0x5a6a70,bytes(2048));put(0x838684,0)
 for j,c in enumerate(metadata[:23]):u.mem_write(0x576dc6+j*48,bytes([c]))
 put(0x59d208,q['worldFlags']);put(0x831828,q['phaseCounter']);put(0x820454,q['seed']);put(0x102010,0);put(0x10203c,q['actorIndex']);put(0x10202c,q['reversalCheck']);put(0x102048,q['previousFacing']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EBX,30000);u.reg_write(UC_X86_REG_ESI,30000);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;calls=[];u.emu_start(0x42aa30,0x400fff,count=10000000);assert end
 rows.append([q,list(b),list(partner),list(terrain),flags,costs,list(metadata),dict(actor=list(u.mem_read(0x577f00,256)),worldFlags=get(0x59d208)&0xffffffff,seed=get(0x820454)&0xffffffff,calls=calls,next=end,visited=list(u.mem_read(0x58bdc0,2500)))])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPathfinderRoute}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let searches=0,reactions=0;for(const [q,b,p,t,f,c,m,e] of rows){const r=originalWalkingPathfinderRoute({...q,actors:[new Uint8Array(b),new Uint8Array(p)],terrain:new Uint8Array(t),tileFlags:new Uint16Array(f),traversalCosts:new Int8Array(c),metadataClass:new Uint8Array(m),visited:new Uint8Array(2500)},(event,state)=>{state.actors[0][0xc4]=85;return {state,value:q.routeHeading};});const a={actor:Array.from(r.state.actors[0]),worldFlags:r.state.worldFlags,seed:r.state.seed,calls:r.calls,next:r.next,visited:Array.from(r.state.visited)};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,diff:a.actor.map((v,i)=>v===e.actor[i]?null:[i,v,e.actor[i]]).filter(Boolean),fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k]))}));searches+=r.calls.filter(c=>c.address===0x42def0).length;reactions+=r.calls.filter(c=>c.address===0x4672d0).length;}console.log(`${rows.length} continuous native far-route cases match; ${searches} actual searches, ${reactions} reactions.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-pathfinder-route.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
