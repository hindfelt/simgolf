"""Verify original first-match object footprints, including expansion exceptions."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x40dc70;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x77])
def run(q):
 for i,r in enumerate(q['records']):u.mem_write(0x58a708+i*16,struct.pack('<hhh',r['type'],r['x'],r['z']))
 for i,size in enumerate(q['sizes']):u.mem_write(0x4c16b8+i*20,bytes([size&255]))
 for i,size in enumerate(q['expansions']):u.mem_write(0x5a7680+i*4,struct.pack('<i',size))
 u.mem_write(0x102000,struct.pack('<Iii',0x400fff,q['x'],q['z']));u.reg_write(UC_X86_REG_ESP,0x102000)
 u.emu_start(0x40dc70,0x400fff,count=30000);assert u.reg_read(UC_X86_REG_EIP)==0x400fff
 value=u.reg_read(UC_X86_REG_EAX);return value if value<2**31 else value-2**32
rng=random.Random(2002);rows=[]
for i in range(1000):
 records=[dict(type=-1,x=0,z=0) for _ in range(256)]
 sizes=[rng.randrange(-2,7) for _ in range(11)];expansions=[rng.randrange(6) for _ in range(11)]
 for index in rng.sample(range(256),20):records[index]=dict(type=rng.randrange(11),x=rng.randrange(-5,51),z=rng.randrange(-5,51))
 x=rng.randrange(-5,56);z=rng.randrange(-5,56)
 if i%4==0:
  records=[dict(type=-1,x=0,z=0) for _ in range(256)]
  records[255]=dict(type=7,x=25,z=25);sizes[7]=2;expansions[7]=5;x=25+i%3;z=25
 elif i%4==1:
  records[0]=dict(type=6,x=25,z=25);records[1]=dict(records[0]);sizes[6]=1;expansions[6]=4;x=25+i%4;z=25
 q=dict(x=x,z=z,records=records,sizes=sizes,expansions=expansions);rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-object-index.js').as_uri()
script="""import {readFileSync} from 'node:fs';const {originalObjectIndex}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalObjectIndex(q.x,q.z,{
 objectAt:index=>q.records[index],baseSizeAt:type=>q.sizes[type],expansionAt:type=>q.expansions[type]});
 if(a!==e)throw Error(JSON.stringify({q,a,e}));}
console.log('1000 original object-table scans match first hit, footprint edges and expansion rules.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-object-index.json').write_text(json.dumps(rows[:40],separators=(',',':'))+'\n')
