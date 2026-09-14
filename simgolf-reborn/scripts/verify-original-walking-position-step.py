"""Native walking coordinate updates with real distance clamp and terrain lookup."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_FPCW,UC_X86_REG_EDI,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
rng=random.Random(42927);rows=[]
for i in range(1600):
 b=bytearray(256);b[0x22]=rng.randrange(8);struct.pack_into('<ii',b,8,24560,24560);struct.pack_into('<h',b,0x1c,rng.randrange(-100,1000));struct.pack_into('<I',b,0x18,rng.getrandbits(24));terrain=bytes(rng.choices([10,17],k=2500))
 q=dict(actorId=0,actorIndex=23*50+23,walkingRate=rng.randrange(-3,50),distance=rng.choice([0,10,127,128,512,1024,4096]),difficulty=rng.randrange(3),fastWalking=rng.randrange(2),worldFlags=rng.choice([0,0x20000]))
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x570d38,terrain);put(0x59d208,q['worldFlags']);put(0x820344,q['difficulty']);put(0x599a9c,q['fastWalking']);put(0x102070,q['distance']);put(0x10203c,q['actorIndex']);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EDI,q['walkingRate']&0xffffffff);u.emu_start(0x42b17c,0x42b2b2,count=10000)
 axis=8 if b[0x22] not in [0,4] else 12;direction=([0,1,1,1,0,-1,-1,-1] if axis==8 else [-1,-1,0,1,1,1,0,-1])[b[0x22]]
 rows.append([q,list(b),list(terrain),dict(actor=list(u.mem_read(0x577f00,256)),step=(get(0x577f00+axis)-24560)//direction)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingPositionStep}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,b,t,e] of rows){const r=originalWalkingPositionStep({...q,actors:[new Uint8Array(b)],terrain:new Uint8Array(t)});const a={actor:Array.from(r.state.actors[0]),step:r.step,};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}console.log(`${rows.length} native walking position steps match.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-position-step.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
