"""Full native0x40c7f0 popup helper, including actual original RNG."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x40c7f0,0xf7),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v&255 if fmt=='<B' else v&0xffffffff))
def get(a,fmt='<I'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def text(a,s):u.mem_write(a,s.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,1024)).split(b'\0')[0].decode()
fields={'popupActive':(0x568148,'<B'),'popupPending':(0x53ce64,'<I'),'popupMode':(0x566a0c,'<I'),'popupStyle':(0x5a1f38,'<I'),'popupActor':(0x4c1df8,'<i'),'popupLifetime':(0x5a5b8c,'<I'),'popupDuration':(0x568154,'<i'),'popupX':(0x56bbf8,'<I'),'popupY':(0x56bbfc,'<I'),'seed':(0x820454,'<I')};rows=[]
for i in range(2880):
 q=dict(priority=[-2147483648,-8,-1,0,1,8][i%6],style=0x80000210+i,actorId=i%8-1,difficulty=[-1,0,1,2][i//6%4],state=dict(sourceText=['','A','ABCDE','A\0ignored','A'*249][i//24%5],popupText='Previous',popupActive=[0,1,255][i//120%3],popupPending=1 if i%7==0 else 0,popupMode=[0,1,2,3][i//360%4],popupStyle=0,popupActor=-1,popupLifetime=9,popupDuration=23,popupX=7,popupY=11,seed=(i*1234567)&0xffffffff))
 for key,(a,fmt) in fields.items():put(a,q['state'][key],'<B' if fmt=='<B' else '<I')
 text(0x518f78,q['state']['sourceText']);text(0x5a5788,'Previous');put(0x820344,q['difficulty']);sp=0x104000;u.mem_write(sp,struct.pack('<IIii',0x401000,q['style'],q['priority'],q['actorId']));u.reg_write(UC_X86_REG_ESP,sp)
 u.emu_start(0x40c7f0,0x401000,count=3000);assert u.reg_read(UC_X86_REG_EIP)==0x401000;result=u.reg_read(UC_X86_REG_EAX)
 state={key:get(a,fmt) for key,(a,fmt) in fields.items()};state.update(sourceText=q['state']['sourceText'],popupText=read(0x5a5788));rows.append([q,dict(state=state,result=result,randomDraws=2 if result else 0)])
module=(root/'simgolf-reborn/scene/src/simulation/original-explanation-popup.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalExplanationPopup} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalExplanationPopup(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native explanation-popup cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-explanation-popup.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
