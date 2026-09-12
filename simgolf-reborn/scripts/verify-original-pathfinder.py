"""Full native pathfinder with actual heading, map and direction helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def hook(u,a,size,data):
 if a==0x400fff:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(42327);rows=[]
for n in range(160):
 terrain=bytearray(rng.choices([0,1,2,7,17,20,22],k=2500));costs=[rng.choice([1,2,3,5,8,20,100]) for _ in range(2500)];flags=[rng.choice([0,0,32,32,0x420]) for _ in range(2500)];metadata=bytearray(rng.choices([0,7],k=128))
 if n%8==0:costs=[1]*2500;flags=[32]*2500
 x=rng.randint(-1024,52000);z=rng.randint(-1024,52000);dest=dict(x=rng.randint(-1024,52000),z=rng.randint(-1024,52000))
 if n%13==0:dest=dict(x=x,z=z)
 actors=[bytearray(256),bytearray(256)];struct.pack_into('<ii',actors[0],8,x,z);struct.pack_into('<ii',actors[1],8,rng.randint(0,51000),rng.randint(0,51000));actors[0][0x29]=rng.choice([1,2,19])
 q=dict(actorId=0,origin=dict(x=x,z=z),destination=dest,worldFlags=rng.choice([0,256]),abortSearch=int(n%17==0))
 u.mem_write(0x570d38,bytes(terrain));u.mem_write(0x53aabc,struct.pack('<2500b',*costs));u.mem_write(0x53ba00,struct.pack('<2500H',*flags));u.mem_write(0x577f00,b''.join(actors));put(0x59d208,q['worldFlags']);put(0x838684,q['abortSearch'])
 u.mem_write(0x5a5e4c,bytes(2048));u.mem_write(0x5a6a70,bytes(2048))
 for i,c in enumerate(metadata):u.mem_write(0x576dc6+i*48,bytes([c]))
 for i,v in enumerate([0x400fff,dest['x'],dest['z'],x,z,0]):put(0x102000+i*4,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x42def0,0x400fff,count=10000000)
 assert u.reg_read(UC_X86_REG_EIP)==0x400fff,'native search did not return'
 direction=u.reg_read(UC_X86_REG_EAX);direction=direction if direction<0x80000000 else direction-0x100000000
 e=dict(value=direction,worldFlags=get(0x59d208),visited=list(u.mem_read(0x58bdc0,2500)),queueX=list(struct.unpack('<1024h',u.mem_read(0x5a5e4c,2048))),queueZ=list(struct.unpack('<1024h',u.mem_read(0x5a6a70,2048))))
 rows.append([q,list(terrain),costs,flags,list(metadata),[list(a) for a in actors],e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalPathfinder}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,t,c,f,m,actors,e] of rows){const r=originalPathfinder({...q,terrain:new Uint8Array(t),traversalCosts:new Int8Array(c),tileFlags:new Uint16Array(f),metadataClass:new Uint8Array(m),actors:actors.map(a=>new Uint8Array(a)),queueX:new Int16Array(1024),queueZ:new Int16Array(1024)});const a={value:r.value,worldFlags:r.state.worldFlags,visited:Array.from(r.state.visited),queueX:Array.from(r.state.queueX),queueZ:Array.from(r.state.queueZ)};for(const key of Object.keys(e))if(!isDeepStrictEqual(a[key],e[key]))throw Error(JSON.stringify({q,key,actual:key==='value'?a[key]:undefined,expected:key==='value'?e[key]:undefined}));}console.log(`${rows.length} complete native pathfinder cases match direction, flags, all tile costs and ring queues.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-pathfinder.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
