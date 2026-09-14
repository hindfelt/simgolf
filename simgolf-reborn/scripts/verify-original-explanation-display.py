"""Execute original explanation display completion with controlled popup effects."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
u.mem_write(0x468feb,p.get_data(0x68feb,0x8a));u.mem_write(0x40c7f0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<I',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode()+b'\0')
events=[]
def hook(u,a,size,data):
 if a!=0x40c7f0:return
 sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<Iii',u.mem_read(sp+4,12)))));u.reg_write(UC_X86_REG_EAX,q['popupResult']&0xffffffff)
 if q['mutate']:
  put(0x831828,9876);put(0x59aadc,16);put(0x570788,32);put(0x55d4bc,42);text(0x518f78,'Popup changed text')
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for i in range(3168):
 q=dict(kind=[-1,0,1,31,32,33,63,64,65,66,127,128][i%12],actorId=i%4,selectedDelta=[-2147483648,-3,-2,-1,0,1,2147483647][i//12%7],difficulty=[-1,0,1,2][i//84%4],popupResult=[0,1,-1][i//336%3],mutate=i%5==0,state=dict(sourceText=['Explanation','', '\0ignored','Explanation\0ignored'][i%4],interfaceFlags=4 if i%7 else 0,originalClock=1000,lastExplanationClock=20,explanationMaskLow=i*1024,explanationMaskHigh=i*2048))
 s=q['state'];text(0x518f78,s['sourceText']);u.mem_write(0x5a4448,bytes([s['interfaceFlags']]));put(0x831828,s['originalClock']);put(0x55d4bc,s['lastExplanationClock']);put(0x59aadc,s['explanationMaskLow']);put(0x570788,s['explanationMaskHigh']);put(0x820344,q['difficulty']);sp=0x104000;put(sp+0x18,q['selectedDelta']);put(sp+0x128,q['kind']);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBX,q['actorId']);events=[]
 u.emu_start(0x468feb,0x469075,count=1000);assert u.reg_read(UC_X86_REG_EIP)==0x469075
 expected=dict(s);expected.update(originalClock=get(0x831828),lastExplanationClock=get(0x55d4bc),explanationMaskLow=get(0x59aadc),explanationMaskHigh=get(0x570788))
 if q['mutate'] and events:expected['sourceText']='Popup changed text'
 rows.append([q,dict(state=expected,events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-explanation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkExplanationDisplay} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalRemarkExplanationDisplay(q,(e,s)=>({result:q.popupResult,state:q.mutate?{...s,originalClock:9876,explanationMaskLow:16,explanationMaskHigh:32,lastExplanationClock:42,sourceText:'Popup changed text'}:s}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native explanation-display cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-explanation-display.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
