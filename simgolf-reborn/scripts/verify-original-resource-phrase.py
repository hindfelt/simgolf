"""Execute full 0x466440 with only original CRT file calls controlled."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x466440,0x592),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
for a in [0x4a58bd,0x4a5d5e,0x4a580f]:u.mem_write(a,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def text(a,s):u.mem_write(a,s.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,512)).split(b'\0')[0].decode()
events=[];position=0

def hook(u,a,size,data):
 global position
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x4a58bd:
  path,mode=struct.unpack('<II',u.mem_read(sp+4,8));events.append(dict(kind='open',path=read(path),mode=read(mode)));position=0;u.reg_write(UC_X86_REG_EAX,0 if q['lines'] is None else 0x101000)
 elif a==0x4a5d5e:
  buffer,n,handle=struct.unpack('<III',u.mem_read(sp+4,12));assert n==250 and handle==0x101000;events.append(dict(kind='read',maxBytes=n))
  if position>=len(q['lines']):u.reg_write(UC_X86_REG_EAX,0)
  else:text(buffer,q['lines'][position]);position+=1;u.reg_write(UC_X86_REG_EAX,buffer)
 elif a==0x4a580f:events.append(dict(kind='close'));u.reg_write(UC_X86_REG_EAX,0)
u.hook_add(UC_HOOK_CODE,hook);rows=[]
base=['First\n',' A\n',' B\n',' C\n','Second\n',' D\n',' E\n','Third\n',' F\n']
for i in range(2912):
 file=i%8;section=[-1,0,1,2,3,4,9][i//8%7];variant=[-1,0,1,2,3,4][i//56%6];mode=[-1,0,1,2][i//336%4]
 cache=[dict(fileId=-9,section=-8,variant=-7,text='Old '+str(j)) for j in range(8)];slot=i%8
 if i%11==0:cache[(slot+3)%8]=dict(fileId=file,section=section,variant=variant,text='Cached\nAlternative')
 lines=None if i%13==0 else (['\n']+base if i%3==0 else base[:-1]+[' Tail without newline'] if i%5==0 else base)
 q=dict(fileId=file,section=section,variant=variant,mode=mode,resourceFlags=0x10000000 if i%2 else 0,themeName='Current',previousLineBuffer='Previous stack line',resourceFileNames={str(file):'sample.txt'},lines=lines,state=dict(sourceText='Prefix ' if i%2 else '',resourceCacheIndex=slot,resourceCache=cache))
 if i>=2688:q['section']=99 if i<2800 else 999;q['lines']=['Header\n']*205
 for j,r in enumerate(cache):u.mem_write(0x8358e0+j*268,struct.pack('<iii',r['fileId'],r['section'],r['variant'])+r['text'].encode()+b'\0')
 u.mem_write(0x8358d8,struct.pack('<I',slot));text(0x518f78,q['state']['sourceText']);put(0x59d208,q['resourceFlags']);text(0x566238,q['themeName']);text(0x539364+50*file,'sample.txt')
 text(0x101f00,q['previousLineBuffer']);u.mem_write(0x102000,struct.pack('<Iiiii',0x401000,file,q['section'],variant,mode));u.reg_write(UC_X86_REG_ESP,0x102000);events=[];u.emu_start(0x466440,0x401000,count=100000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 state=dict(sourceText=read(0x518f78),resourceCacheIndex=struct.unpack('<h',u.mem_read(0x8358d8,2))[0],resourceCache=[])
 for j in range(8):
  a=0x8358e0+j*268;f,s,v=struct.unpack('<iii',u.mem_read(a,12));state['resourceCache'].append(dict(fileId=f,section=s,variant=v,text=read(a+12)))
 rows.append([q,dict(state=state,events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-resource-phrase.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalResourcePhrase} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){let got;try{got=originalResourcePhrase(q,()=>q.lines);}catch(e){throw Error(JSON.stringify({q,error:e.message,expected}));}if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native resource-parser cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-resource-phrase.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
