"""Original fee-unit assessment with a controlled speech boundary."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
u.mem_write(0x426be5,p.get_data(0x26be5,0xad));u.mem_write(0x40c1f0,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def hook(u,a,size,data):
 if a==0x40c1f0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))))
  if q['mutation']:put(0x4c1848,77)
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for mood in [-32768,-11,-10,-1,0,1,4,10,32767]:
 for i in range(128):
  actor=bytearray(256);struct.pack_into('<ii',actor,0,1024,3072);struct.pack_into('<h',actor,0xa4,mood);actor[0x21]=1
  hole=bytearray(520);struct.pack_into('<I',hole,0,i%4);bonus=[0,1,-3,2147483647][i//32];mode=i//8%4;tier=i%8
  q=dict(actorId=0,reactionMode=mode,feeBonus=bonus,profileTiers={'0':tier},holeRecords={'2':list(hole)},mutation=bool(i%3==0),state=dict(actors={'0':list(actor)},feeUnits=99))
  u.mem_write(0x577f08,bytes(actor));u.mem_write(0x5744f8+1040,bytes(hole));u.mem_write(0x583432,bytes([tier]));put(0x542c04,mode);put(0x542be8,bonus);put(0x4c1848,99)
  u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);events=[];u.emu_start(0x426be5,0x426c92,count=500)
  state=json.loads(json.dumps(q['state']));state['feeUnits']=struct.unpack('<i',u.mem_read(0x4c1848,4))[0];rows.append([q,dict(state=state,events=events)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalFeeAssessment} from MODULE;for(const [q,out] of JSON.parse(readFileSync(0,'utf8'))){for(const s of [q.state,out.state])s.actors[0]=Uint8Array.from(s.actors[0]);q.holeRecords[2]=Uint8Array.from(q.holeRecords[2]);const r=originalFeeAssessment(q,(e,s)=>({...s,feeUnits:q.mutation?77:s.feeUnits}));if(!isDeepStrictEqual(r,out))throw Error(JSON.stringify({q,out,r}));}""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-fee-assessment.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
print(len(rows),'native fee assessments matched')
(root/'simgolf-reborn/scene/tests/fixtures/original-fee-assessment.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
