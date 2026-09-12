"""Full native world motion table, using native x87-initialized trig helpers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
rng=random.Random(2002);rows=[]
for batch in range(64):
 phase=rng.choice([0,1024,1025,2147483647,2147483648,4294967295]);records=[]
 for i in range(256):records.extend([rng.choice([-1,0,10000]),rng.randrange(-10000,50000),rng.choice([-1,0,1,1000,2147483647]),rng.randrange(-2**31,2**31),rng.randrange(-100000,100000),rng.randrange(-10000,10000),rng.choice([0,phase,2147483647,4294967295])&0xffffffff,rng.randrange(100),rng.randrange(100)])
 records=[v if v<2**31 else v-2**32 for v in records]
 u.mem_write(0x572108,struct.pack('<2304i',*records));u.mem_write(0x831828,struct.pack('<I',phase));u.mem_write(0x102000,struct.pack('<I',0x400fff));u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x409980,0x400fff,count=200000)
 rows.append(dict(q=dict(phaseCounter=phase,motionRecords=records),expected=list(struct.unpack('<2304i',u.mem_read(0x572108,9216)))))
module=(root/'simgolf-reborn/scene/src/simulation/original-world-motion.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWorldMotion}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){r.q.motionRecords=Int32Array.from(r.q.motionRecords);const actual=Array.from(originalWorldMotion(r.q).state.motionRecords);if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({phase:r.q.phaseCounter,diffs:actual.map((v,i)=>v===r.expected[i]?null:[i,v,r.expected[i]]).filter(Boolean)}));}console.log('64 complete native world-motion tables match (16384 records).');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
