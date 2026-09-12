"""Native score recording; actual read-only comparison helper included."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x426b10,0xd5),(0x405e80,0xfd),(0x466a00,0x20)]:u.mem_write(a,p.get_data(a-0x400000,n))
def hook(u,a,size,data):
 if a==0x405e80:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<ii',u.mem_read(sp+4,8)))))
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for i in range(576):
 actor=bytearray(256);actor[0x18]=[0,0,32][i%3];actor[0x19]=i%16;actor[0x21]=i%18;actor[0x22]=[-128,-1,0,1,9,10,127][i%7]&255;actor[0xba]=i%4
 hole=bytearray(520);hole[8]=4;performance=[0]*1600
 q=dict(actorId=0,state=dict(actors={'0':list(actor)},holeRecords={str(i%18):list(hole)},performance=performance))
 u.mem_write(0x577f08,bytes(actor));u.mem_write(0x5744f8+(i%18)*520,bytes(hole));u.mem_write(0x5698e0,bytes(6400));u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);events=[];u.emu_start(0x426b10,0x426be5,count=4000)
 out=dict(actors={'0':list(u.mem_read(0x577f08,256))},holeRecords={str(i%18):list(u.mem_read(0x5744f8+(i%18)*520,520))},performance=list(struct.unpack('<1600i',u.mem_read(0x5698e0,6400))))
 rows.append([q,dict(state=out,events=events)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalHoleCompletionStats} from MODULE;for(const [q,out] of JSON.parse(readFileSync(0,'utf8'))){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);s.performance=Int32Array.from(s.performance);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}const got=originalHoleCompletionStats(q);if(!isDeepStrictEqual(got,out))throw Error(JSON.stringify({q,out,got}));}""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-hole-completion-stats.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True);print(len(rows),'native completion-stat cases matched')
(root/'simgolf-reborn/scene/tests/fixtures/original-hole-completion-stats.json').write_text(json.dumps(rows[:144],separators=(',',':'))+'\n')
