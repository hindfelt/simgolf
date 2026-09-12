"""Native dispatch and complete supported standard remark cases; no helper stubs."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBX,UC_X86_REG_EDX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x469330,0x2e10),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
rows=[]
kinds=[6,8,9,12,14,15,16,17,18,20,21,24,25,27,29,32,33,43,45,46,48,55,56,57,36,41,47,63,64,65,0,-1,66,-2147483648]
for kind in kinds:
 for i in range(128):
  id=i%16;record=[0]*256;record[0x18]=(i*17)%256;record[0xb6]=i%256
  prefix=['','Near ','Start\0ignored'][i%3];mode=[-1,0,1,2,2147483647][i%5];value=[-1,0,1,256][i%4]
  q=dict(kind=kind,actorId=id,value=value,originalMode=mode,state=dict(sourceText=prefix,remarkStyle=i,actors={str(id):record}))
  u.mem_write(0x577f08+id*256,bytes(record));u.mem_write(0x518f78,prefix.encode()+b'\0');put(0x589be8,i);put(0x820344,mode)
  u.reg_write(UC_X86_REG_ESP,0x102000);put(0x102000+0x4e4,value);u.reg_write(UC_X86_REG_EBX,id);u.reg_write(UC_X86_REG_EDX,kind&0xffffffff)
  u.emu_start(0x469380,0x46bc7e,count=10000);assert u.reg_read(UC_X86_REG_EIP)==0x46bc7e
  expected=json.loads(json.dumps(q['state']));expected['sourceText']=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii');expected['remarkStyle']=struct.unpack('<I',u.mem_read(0x589be8,4))[0]
  # With no appends, the JS buffer may retain data beyond C-string termination.
  if kind in [0,-1,66,-2147483648,64]:expected['sourceText']=prefix
  rows.append([q,dict(state=expected,next='postprocess')])
module=(root/'simgolf-reborn/scene/src/simulation/original-standard-phrase.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalStandardPhrase} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const s of [q.state,expected.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);const got=originalStandardPhrase(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native standard-phrase cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
# Retain each combination that changes text/style within each dispatch case.
seen=set();fixture=[]
for row in rows:
 q,out=row;key=(q['kind'],out['state']['sourceText'],out['state']['remarkStyle'])
 if key not in seen:seen.add(key);fixture.append(row)
(root/'simgolf-reborn/scene/tests/fixtures/original-standard-phrase.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
