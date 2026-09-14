"""Execute the original cache lookup/hit path, stopping before file loading on misses."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000);u.mem_write(0x466440,p.get_data(0x66440,0x592))
u.hook_add(UC_HOOK_CODE,lambda u,a,n,d:u.emu_stop() if a==0x46648b else None)
rows=[]
for i in range(2400):
 cache=[dict(fileId=j,section=j%3,variant=j%5,text='Entry '+str(j)) for j in range(8)];slot=i%9
 text=['First\nSecond','First\nSecond\nThird','\nLeading','Trailing\n','Plain','','One\0hidden','A\n\nB'][i//9%8]
 if slot<8:cache[slot]['text']=text
 if slot<7 and i%2:cache[slot+1]=dict(cache[slot],text='Duplicate must not win')
 key=cache[slot] if slot<8 else dict(fileId=-1,section=9,variant=-8)
 q=dict(fileId=key['fileId'],section=key['section'],variant=key['variant'],mode=[-1,0,1,2,-2][i//72%5],state=dict(sourceText=['','Prefix ','Old\nPrefix ','Before\0ignored'][i//360%4],resourceCache=cache))
 for j,r in enumerate(cache):u.mem_write(0x8358e0+268*j,struct.pack('<iii',r['fileId'],r['section'],r['variant'])+r['text'].encode()+b'\0')
 u.mem_write(0x518f78,q['state']['sourceText'].encode()+b'\0');u.mem_write(0x102000,struct.pack('<Iiiii',0x401000,q['fileId'],q['section'],q['variant'],q['mode']));u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x466440,0x401000,count=10000);end=u.reg_read(UC_X86_REG_EIP);assert end in [0x401000,0x46648b]
 state=json.loads(json.dumps(q['state']));next='load' if end==0x46648b else 'text'
 if next=='text':state['sourceText']=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode()
 rows.append([q,dict(state=state,next=next)])
module=(root/'simgolf-reborn/scene/src/simulation/original-cached-resource-phrase.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalCachedResourcePhrase} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalCachedResourcePhrase(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native resource-cache cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-cached-resource-phrase.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
