"""Compare record-based variety with isolated original x86 (pefile, unicorn, Node)."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2]
exe=root / "resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
for address,size in [(0x42d000,4096),(0x466000,4096),(0x574000,16384),(0x820000,4096),(0x100000,8192)]:u.mem_map(address,size)
for address,size in [(0x42da34,0x10e),(0x466ba0,0x10e)]:
 offset=p.get_offset_from_rva(address-0x400000);u.mem_write(address,p.__data__[offset:offset+size])
rng=random.Random(2002);rows=[]
for i in range(2000):
 current=bytearray(520);previous=bytearray(520)
 for record in [current,previous]:
  record[0]=rng.randint(3,5)
  for offset in [8,12,24,28]:struct.pack_into('<i',record,offset,rng.randint(0,51200))
  struct.pack_into('<I',record,512,rng.choice([0,0x20,0x40,0x810]))
 struct.pack_into('<i',current,32,rng.choice([0,7,8,30]))
 for offset in [306,308]:struct.pack_into('<h',current,offset,rng.choice([0,0,1,8]))
 number=rng.randint(1,18);difficulty=rng.randrange(4);classification=rng.randrange(8);prior=rng.randrange(8)
 base=0x574500+520*number
 u.mem_write(base,bytes(current));u.mem_write(base-520,bytes(previous))
 u.mem_write(0x820344,struct.pack('<I',difficulty));u.mem_write(0x101010,struct.pack('<I',classification));u.mem_write(0x10102c,struct.pack('<I',prior))
 u.reg_write(UC_X86_REG_ESP,0x101000);u.reg_write(UC_X86_REG_EBX,number)
 u.emu_start(0x42da34,0x42db42,count=500)
 penalty=struct.unpack('<I',u.mem_read(base+508,4))[0]
 rows.append(dict(record=list(current),previousRecord=list(previous),holeNumber=number,difficulty=difficulty,classification=classification,previousClassification=prior,expected=penalty))
module=(root/'simgolf-reborn/scene/src/simulation/original-hole-variety.js').as_uri()
script='''import {readFileSync} from 'node:fs';
const {originalHoleVarietyFromRecords}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const row of rows){const actual=originalHoleVarietyFromRecords({...row,record:new Uint8Array(row.record),previousRecord:new Uint8Array(row.previousRecord)}).penalty;
if(actual!==row.expected)throw Error(`Variety mismatch ${actual},${row.expected}`);}
console.log(`${rows.length} record pairs match original x86 variety block.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
