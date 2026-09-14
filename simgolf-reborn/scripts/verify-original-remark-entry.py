"""Execute the original remark entry gates and compare their JS reconstruction."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x4672d0;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0xad])
def w(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def b(a,v):u.mem_write(a,bytes([v&255]))
def stop(u,a,size,data):
 if a in (0x46737d,0x469075):u.emu_stop()
u.hook_add(UC_HOOK_CODE,stop)
rng=random.Random(2002);rows=[]
for i in range(1800):
 q=dict(actorId=[0,151,152][i%3],shotCounter=[0,9,10,127,128,255][i%6],globalFlags=0x2000000 if i%13==0 else 0,kind=0x13 if i%5 else 0x1c,actorStatus=rng.choice([0,0x20,0x40,0xff]),holeCompletions=rng.choice([9,10,11]),holeStrokes=rng.choice([0,3,4,5,6,127,128,255]),par=rng.choice([3,4,5,127,128]),holeFlags=rng.randrange(16))
 # Independent combinations avoid correlation between actor and shot guards.
 if i>=900:q['actorId']=rng.choice([0,151,152]);q['shotCounter']=rng.choice([0,9,10,127,128,255])
 sp=0x102000;s=q['actorId']*256
 w(sp+4,q['actorId']);w(sp+8,q['kind']);w(0x59d208,q['globalFlags'])
 b(0x577f2a+s,q['shotCounter']);b(0x577f20+s,q['actorStatus']);b(0x577f29+s,1)
 w(0x574520+520,q['holeCompletions']);b(0x577f2c+s,q['holeStrokes']);b(0x574500+520,q['par']);w(0x574700+520,q['holeFlags'])
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x4672d0,0,count=100)
 end=u.reg_read(UC_X86_REG_EIP);assert end in (0x46737d,0x469075)
 result=dict(allowed=end==0x46737d,kind=u.reg_read(UC_X86_REG_EBX) if end==0x46737d else q['kind'])
 rows.append([q,result])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkEntry} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalRemarkEntry(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native remark-entry cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
fixture=root/'simgolf-reborn/scene/tests/fixtures/original-remark-entry.json'
fixture.write_text(json.dumps(rows[:60]+rows[900:960],indent=2)+'\n')
