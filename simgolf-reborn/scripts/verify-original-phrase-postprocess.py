"""Compare native phrase substitution, intercepting name/location and libc search."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBX,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x8000)
for a,n in [(0x46bc7e,0x2b8),(0x46c104,58),(0x45b090,0xbd),(0x4e1a48,26),(0x4c496c,2),(0x4d290c,15),(0x4e28f4,5)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
for a in [0x466fb0,0x4074d0,0x4a5c60]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode('ascii')+b'\0')
def read(a):return bytes(u.mem_read(a,512)).split(b'\0')[0].decode('ascii')
q=None;events=[]
def hook(u,a,size,data):
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x466fb0:events.append(dict(address=a,args=[get(sp+4),get(sp+8)]));text(0x518f78,q['names'][str(get(sp+4))])
 if a==0x4074d0:events.append(dict(address=a,args=[get(sp+4),get(sp+8),get(sp+12)]));text(0x518f78,read(0x518f78)+q['location'])
 if a==0x4a5c60:
  pointer=get(sp+4);index=read(pointer).find(read(get(sp+8)));u.reg_write(UC_X86_REG_EAX,0 if index<0 else pointer+index)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(3200):
 actorId=[0,1,152,153][i%4];value=[-1,0,1,2,3][(i//4)%5];kind=i%66
 if i>=1600:kind=[11,20,28][i%3];value=[-100,-50,-2,0,50,100][i%6]
 q=dict(actorId=actorId,value=value,kind=kind,names={str(actorId):['Alice','MYNAME','DATA'][i%3],str(actorId^1):'Bob'},location='Location',terms=[dict(name=f'Term{j}',alternate=f'Tree{j}',type=[0,13,18,4][j]) for j in range(4)],labels=['Level0','Level1','Level2','Level3'],state=dict(sourceText=['MYNAME PARTNER DATA','DATA DATA MYNAME MYNAME','No substitutions','PARTNER and MYNAME'][i%4]))
 for j,term in enumerate(q['terms']):text(0x576da0+j*48,term['name']);text(0x576db0+j*48,term['alternate']);u.mem_write(0x576dc6+j*48,bytes([term['type']]))
 for j,label in enumerate(q['labels']):text(0x4c0990+j*18,label)
 sp=0x104000;put(sp+0x4e0,kind);put(sp+0x4e4,value);text(0x518f78,q['state']['sourceText']);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,actorId);events=[];u.emu_start(0x46bc7e,0x46bf36,count=5000);assert u.reg_read(UC_X86_REG_EIP)==0x46bf36
 rows.append([q,dict(state=dict(sourceText=read(0x518f78)),events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-phrase-postprocess.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalPhrasePostprocess} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalPhrasePostprocess(q,(e,s)=>({...s,sourceText:q.names[e.args[0]]}),(e,s)=>({...s,sourceText:s.sourceText+q.location}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native phrase-postprocess cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-phrase-postprocess.json').write_text(json.dumps(rows[:264]+rows[1600:1624],separators=(',',':'))+'\n')
