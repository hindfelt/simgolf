"""Original explanatory-message gates, with native profile voice selection."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x46806a,0xde),(0x46c140,0x2c),(0x4c5c84,8)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
events=[]
def hook(u,a,size,data):
 if a==0x469075:u.emu_stop()
 if a==0x46c140:events.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(u.reg_read(UC_X86_REG_ESP)+4,4))[0]]))
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for i in range(3960):
 kind=i%66;actorId=i%4;actor=bytearray(256);profile=bytearray(560);profile[0x21]=i%256
 x=[100,101,699,700,300][i//66%5];y=[100,101,399,400,250][i//330%5];struct.pack_into('<ii',actor,8,x,y);struct.pack_into('<h',actor,0xae,0 if i%7 else -1)
 elapsed=[500,501,502,-1,2147483647,-2147483648][i//660%6];last=1000;clock=(last+elapsed)&0xffffffff;clock=clock if clock<2147483648 else clock-4294967296
 q=dict(kind=kind,actorId=actorId,profileRecords={'0':list(profile)},state=dict(actors={str(actorId):list(actor)},originalClock=clock,lastExplanationClock=last,explanationMaskLow=0 if i%11 else -1,explanationMaskHigh=0 if i%13 else 1<<(kind%32)))
 u.mem_write(0x577f08+actorId*256,bytes(actor));u.mem_write(0x4d5040,bytes(profile));put(0x831828,clock);put(0x55d4bc,last);put(0x59aadc,q['state']['explanationMaskLow']);put(0x570788,q['state']['explanationMaskHigh']);sp=0x104000;put(sp+0x128,kind);put(sp+0x124,actorId);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EBP,actorId*256);events=[]
 u.emu_start(0x46806a,0x468148,count=1000);end=u.reg_read(UC_X86_REG_EIP);assert end in [0x468148,0x469075]
 pronoun=None if kind==50 else bytes(u.mem_read(sp+0x10,8)).split(b'\0')[0].decode()
 rows.append([q,dict(next='explanation' if end==0x468148 else 'return',pronoun=pronoun,events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-remark-explanation.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalRemarkExplanationGate} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const id in q.state.actors)q.state.actors[id]=Uint8Array.from(q.state.actors[id]);for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);const got=originalRemarkExplanationGate(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native explanation-gate cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-remark-explanation.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
