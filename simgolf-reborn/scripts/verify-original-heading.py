"""Differential check against isolated original x86; requires pefile and unicorn.
Run from any directory. The original executable is read, never launched as an app.
"""
from pathlib import Path
import hashlib, json, random, struct, subprocess
import pefile
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP, UC_X86_REG_EAX

root = Path(__file__).resolve().parents[2]
exe = root / "resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest() == '82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p = pefile.PE(str(exe))
offset = p.get_offset_from_rva(0x466ba0 - 0x400000)
u = Uc(UC_ARCH_X86, UC_MODE_32)
u.mem_map(0x466000, 0x1000)
u.mem_write(0x466ba0, p.__data__[offset:offset + 0x10e])
u.mem_map(0x100000, 0x2000)
rng = random.Random(2002)
vectors = [(0,0),(0,-1),(1,0),(0,1),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]
vectors += [(rng.randint(-51200,51200), rng.randint(-51200,51200)) for _ in range(10000)]
vectors += [(a,b) for a in [-2147483648,-131073,-1,1,131073,2147483647] for b in [-2147483648,-1,1,2147483647]]
rows = []
for x,z in vectors:
    u.mem_write(0x101000, struct.pack('<III',0x466fff,x & 0xffffffff,z & 0xffffffff))
    u.reg_write(UC_X86_REG_ESP,0x101000)
    u.emu_start(0x466ba0,0x466fff,count=200)
    rows.append([x,z,u.reg_read(UC_X86_REG_EAX)])
module = (root / 'simgolf-reborn/scene/src/simulation/original-heading.js').as_uri()
script = '''import {readFileSync} from 'node:fs';
const {originalHeading}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [x,z,expected] of rows)if(originalHeading(x,z)!==expected)throw Error(`Mismatch ${x},${z}`);
console.log(`${rows.length} vectors match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
