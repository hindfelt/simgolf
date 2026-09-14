"""Native full facility search including ordered inactive-record termination."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
rng=random.Random(40);rows=[]
for i in range(1200):
 records=bytearray(4096);widths=[rng.choice([-3,-1,0,1,2,3,4,5]) for _ in range(16)];kind=rng.randrange(16);origin=dict(x=rng.randrange(512,49000),z=rng.randrange(512,49000))
 for j in range(256):
  struct.pack_into('<hhh',records,j*16,rng.choice([-1,kind,rng.randrange(16)]),rng.randrange(2,46),rng.randrange(2,46));records[j*16+7]=rng.choice([0,64,64,64])
 u.mem_write(0x58a708,bytes(records))
 for j,w in enumerate(widths):u.mem_write(0x4c16b8+j*20,bytes([w&255]))
 for off,v in [(0,0x400fff),(4,kind),(8,origin['x']),(12,origin['z'])]:put(0x102000+off,v)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.emu_start(0x40daa0,0x400fff,count=30000)
 rows.append([list(records),widths,kind,origin,dict(value=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0],distance=struct.unpack('<i',u.mem_read(0x5679bc,4))[0])])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalNearestFacility}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));let found=0;for(const [b,w,k,o,e] of rows){const r=originalNearestFacility({facilityRecords:new Uint8Array(b),facilityWidths:w},k,o);const a={value:r.value,distance:r.state.nearestFacilityDistance};if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({k,o,a,e}));found+=r.value>=0;}console.log(`${rows.length} native facility searches match; ${found} matches found.`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-nearest-facility.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
