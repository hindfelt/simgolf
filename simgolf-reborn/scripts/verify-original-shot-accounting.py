"""Continuous native stopped-shot accounting, including original distance helper."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
rng=random.Random(2002);rows=[]
for i in range(2000):
 b=bytearray(256);b[0x29]=1;b[0x2a]=rng.choice([0,0,1,2,3,127,255]);b[0x21]=rng.randrange(256);b[0xc2]=rng.randrange(4);b[0x28]=10
 struct.pack_into('<h',b,0xa6,-25);struct.pack_into('<I',b,0x18,rng.randrange(2**32));struct.pack_into('<ii',b,0xdc,rng.randrange(51200),rng.randrange(51200));struct.pack_into('<ii',b,0xcc,rng.randrange(51200),rng.randrange(51200))
 hole=bytearray(rng.randbytes(520));hole[0]=rng.choice([3,4,5,127,255]);stat=bytearray(rng.randbytes(184));code=rng.choice([1,2,10,12]);scatter=rng.choice([-1,0,1]);statIndex=b[0xc2]+(b[0x21]&7)*4
 q=dict(actor=list(b),hole=list(hole),stat=list(stat),statIndex=statIndex,terrain=code,scatter=scatter)
 u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500+520,bytes(hole));u.mem_write(0x5698c0+statIndex*184,bytes(stat));u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x576dc2+code*48,bytes([scatter&255]));put(0x102010,0)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_EAX,0);u.emu_start(0x42ca9d,0x42cc88,count=10000)
 rows.append(dict(q=q,expected=dict(actor=list(u.mem_read(0x577f00,256)),hole=list(u.mem_read(0x574500+520,520)),stat=list(u.mem_read(0x5698c0+statIndex*184,184)),tile=dict(x=read(0x102018),z=read(0x102020)),index=read(0x102074),terrain=read(0x102014))))
module=(root/'simgolf-reborn/scene/src/simulation/original-shot-accounting.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalShotAccounting}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,statRecords=[];statRecords[q.statIndex]=Uint8Array.from(q.stat);const metadata=[];metadata[q.terrain]={scatterCoefficient:q.scatter};const a=originalShotAccounting({actorId:0,actors:[Uint8Array.from(q.actor)],holeRecords:[null,Uint8Array.from(q.hole)],statRecords,terrain:new Uint8Array(2500).fill(q.terrain),metadata});const actual={actor:Array.from(a.state.actors[0]),hole:Array.from(a.state.holeRecords[1]),stat:Array.from(a.state.statRecords[q.statIndex]),tile:a.tile,index:a.index,terrain:a.terrain};if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({r,actual}));}console.log('2000 continuous native stopped-shot accounting cases match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
