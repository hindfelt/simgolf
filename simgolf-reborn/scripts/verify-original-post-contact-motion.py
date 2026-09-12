"""Native contact prefix with controlled audio/visual mutations, not live integration."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/'resources/sim golf/Sid Meier\'s SimGolf/golf.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40c1f0,0x4096e0,0x40c140,0x40bc90,0x4672d0]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
q=None;calls=[];end=None
def hook(u,a,size,data):
 global end
 if a in [0x42ca9d,0x4295ef]:end=hex(a);u.emu_stop();return
 if a not in [0x40c1f0,0x4096e0,0x40c140,0x40bc90,0x4672d0]:return
 sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[read(sp+4+i*4) for i in range({0x40c1f0:4,0x4096e0:1,0x40c140:3,0x40bc90:2,0x4672d0:3}[a])]))
 if a==0x40c1f0:write(0x577ff0,q['replacementVelocity'])
 if a==0x4096e0:write(0x577f18,0x8123)
 if a==0x40c140:u.reg_write(UC_X86_REG_EAX,q['slopes'][read(sp+12)]&0xffffffff)
 if a==0x40bc90:u.reg_write(UC_X86_REG_EAX,q['currentTerrainCode'])
u.reg_write(UC_X86_REG_FPCW,0x37f);u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(527);rows=[]
for i in range(1600):
 q=dict(actorId=0,bounceCoefficient=rng.randrange(-128,128),boundaryFlags=rng.randrange(2),ballTerrain=rng.choice([1,7,12,13]),visualSlot=rng.choice([-1,0,15]),replacementVelocity=rng.randrange(-10000,10000))
 q.update(difficulty=rng.randrange(5),luck=rng.randrange(256),scatterCoefficient=rng.randrange(-2,6),seed=rng.randrange(2**32),direction=rng.randrange(8),slopes=[rng.randrange(-8,9) for _ in range(8)],currentTerrainCode=rng.choice([1,17]))
 write(0x820344,q['difficulty'])
 for j in range(1,152):
  other=bytearray(256);other[0x29]=2 if j%2 else 1
  struct.pack_into('<i',other,8,20992+j*20);struct.pack_into('<i',other,12,20992+j*20);struct.pack_into('<i',other,0xdc,21000)
  u.mem_write(0x577f00+j*256,bytes(other))
 b=bytearray(256);b[0x20]=i%2;b[0x29]=1
 struct.pack_into('<H',b,0x1e,512 if i%3 else 0)
 for o,v in [(0xe4,rng.randrange(-2,3)),(0xf0,rng.randrange(-20000,1000)),(0xdc,20992+rng.randrange(-2000,2001)),(0xe0,20992+rng.randrange(-2000,2001)),(0xec,rng.randrange(4000)),(0xe8,rng.randrange(-2147483648,2147483648))]:struct.pack_into('<i',b,o,v)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x576dc0+q['ballTerrain']*48,bytes([q['bounceCoefficient']&255]));sp=0x102000
 u.mem_write(0x576dc2+q['ballTerrain']*48,bytes([q['scatterCoefficient']&255]));write(0x820454,q['seed'])
 u.mem_write(0x578001,bytes([q['luck']]));u.mem_write(0x574500+520,bytes(520));write(0x574518+520,20);write(0x57451c+520,20);write(sp+0x10,0)
 for addr in [0x57724c,0x577250,0x4c1e18]:write(addr,77)
 for o,v in [(0x50,q['direction']),(0x14,q['ballTerrain']),(0x1c,q['boundaryFlags']),(0x30,q['visualSlot'])]:write(sp+o,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,0);calls=[];end=None;u.emu_start(0x42c527,0x42ca70,count=20000)
 assert end
 rows.append([q,list(b),dict(actor=list(u.mem_read(0x577f00,256)),calls=calls,next=end,stopped=end=='0x42ca9d',seed=read(0x820454)&0xffffffff,terrainStopX=read(0x57724c),terrainStopZ=read(0x577250),terrainStopState=read(0x4c1e18))])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalPostContactMotion}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let effects=0;
for(const [q,b,e] of rows){const hole=new Uint8Array(520),h=new DataView(hole.buffer);h.setInt32(0x18,20,true);h.setInt32(0x1c,20,true);const actors=Array.from({length:152},(_,j)=>{if(!j)return new Uint8Array(b);const bytes=new Uint8Array(256),v=new DataView(bytes.buffer);bytes[0x29]=j%2?2:1;v.setInt32(8,20992+j*20,true);v.setInt32(12,20992+j*20,true);v.setInt32(0xdc,21000,true);return bytes;});actors[1][1]=q.luck;const r=originalPostContactMotion({...q,actors,holes:[null,hole],terrainStopX:77,terrainStopZ:77,terrainStopState:77},(event,state)=>{const a=new DataView(state.actors[0].buffer);if(event.address===0x40c1f0)a.setInt32(0xf0,q.replacementVelocity,true);if(event.address===0x4096e0)a.setUint32(0x18,0x8123,true);return {state,value:event.address===0x40c140?q.slopes[event.args[2]]:q.currentTerrainCode};});const a={actor:Array.from(r.state.actors[0]),calls:r.calls,next:r.next,stopped:r.stopped,seed:r.state.seed,terrainStopX:r.state.terrainStopX,terrainStopZ:r.state.terrainStopZ,terrainStopState:r.state.terrainStopState};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));effects+=r.calls.length;}console.log(`${rows.length} continuous native contact-to-stop sequences match; ${effects} ordered effects.`);
""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-post-contact-motion.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
