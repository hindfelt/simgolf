"""Execute the complete original building-label helper, without helper stubs."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x407270,0x25c),(0x4c3930,0x300)]:u.mem_write(a,p.get_data(a-0x400000,n))
rows=[]
for id in [*range(20),-1,-2147483648,2147483647,256]:
 for detailed in [0,1,-1,2,-2147483648]:
  for prefix in ['', 'Near ', 'a', 'Before\0ignored']:
   q=dict(buildingId=id,detailed=detailed,state=dict(sourceText=prefix,unchanged=23))
   u.mem_write(0x518f78,prefix.encode()+b'\0')
   u.mem_write(0x102000,struct.pack('<III',0x401000,id&0xffffffff,detailed&0xffffffff));u.reg_write(UC_X86_REG_ESP,0x102000)
   u.emu_start(0x407270,0x401000,count=3000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
   result=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii')
   rows.append([q,dict(sourceText=result,unchanged=23)])
module=(root/'simgolf-reborn/scene/src/simulation/original-building-description.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalBuildingDescription} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalBuildingDescription(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native building-description cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-building-description.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
