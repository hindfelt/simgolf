"""Compare native personal-phrase selection before standard cases/postprocessing."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x469330;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x175])
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode('ascii')+b'\0')
def hook(u,a,size,data):
 if a in [0x469380,0x46bc7e]:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3200):
 actorId=[0,1,151,152,153][i%5];actors={str(j):bytearray(rng.randrange(256) for _ in range(256)) for j in set([actorId,152])}
 for record in actors.values():struct.pack_into('<h',record,0xb6,i%3)
 codes=[3,7,19,35,64,3,255];phrases=[['' if (i+j+k)%3==0 else f'Personal {j}/{k}' for k in range(6)] for j in range(3)]
 q=dict(actorId=actorId,kind=[3,7,19,35,64,2,65][(i//5)%7],combined=rng.randrange(-2**31,2**31),requestCodes=codes,profilePhrases=phrases,state=dict(actors={j:list(r) for j,r in actors.items()},redirected=bool(i%2),sourceText='Lead: '))
 if i>=1600:q['combined']=[-11,-10,-1,0,1,10,11][i%7]
 for j,r in actors.items():u.mem_write(0x577f08+int(j)*256,bytes(r))
 u.mem_write(0x4c1d00,bytes(codes));put(0x53f8b8,q['state']['redirected']);text(0x518f78,q['state']['sourceText'])
 for j,group in enumerate(phrases):
  for k,phrase in enumerate(group):text(0x542c20+j*1250+k*50,phrase)
 sp=0x102000;put(sp,0x401000);put(sp+4,q['kind']);put(sp+8,123);put(sp+12,q['combined']);put(sp+16,actorId);u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x469330,0x401000,count=3000);end=u.reg_read(UC_X86_REG_EIP);assert end in [0x469380,0x46bc7e]
 rows.append([q,dict(state=dict(actors={j:list(u.mem_read(0x577f08+int(j)*256,256)) for j in actors},redirected=bool(get(0x53f8b8)),sourceText=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii')),hole=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EBP)))[0],next='standard' if end==0x469380 else 'postprocess')])
module=(root/'simgolf-reborn/scene/src/simulation/original-phrase-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalPhraseEntry} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){q.state.actors=Object.fromEntries(Object.entries(q.state.actors).map(([k,v])=>[k,Uint8Array.from(v)]));const got=originalPhraseEntry(q);got.state.actors=Object.fromEntries(Object.entries(got.state.actors).map(([k,v])=>[k,[...v]]));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native phrase-entry cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-phrase-entry.json').write_text(json.dumps(rows[:105]+rows[1600:1635],separators=(',',':'))+'\n')
