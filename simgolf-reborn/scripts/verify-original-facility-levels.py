"""Verify packed building level aggregation using original instructions."""
from pathlib import Path
import hashlib,json,struct,subprocess,random
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x40f908,0xc7),(0x466a00,0x20)]:u.mem_write(a,p.get_data(a-0x400000,n))
rng=random.Random(2002);rows=[]
for i in range(256):
 records=bytearray(4096)
 for j in range(256):
  struct.pack_into('<h',records,j*16,rng.randrange(-2,20));records[j*16+7]=rng.randrange(256);struct.pack_into('<i',records,j*16+8,rng.choice([-2,-1,0,1,2,5,98,99,100,2147483647]))
 u.mem_write(0x58a708,bytes(records));u.mem_write(0x59d208,bytes(4));u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x40f908,0x40f9cf,count=30000)
 out=dict(levels=list(struct.unpack('<20i',u.mem_read(0x5a7680,80))),activeLevels=list(struct.unpack('<20i',u.mem_read(0x542bb0,80))),activeMask=struct.unpack('<I',u.mem_read(0x5a4db8,4))[0]);rows.append([list(records),out])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalFacilityLevels} from MODULE;for(const [r,out] of JSON.parse(readFileSync(0,'utf8'))){const got=originalFacilityLevels(Uint8Array.from(r));if(!isDeepStrictEqual(got,out))throw Error(JSON.stringify({out,got}));}""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-facility-levels.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True);print(len(rows),'native facility aggregations matched')
(root/'simgolf-reborn/scene/tests/fixtures/original-facility-levels.json').write_text(json.dumps(rows[:16],separators=(',',':'))+'\n')
