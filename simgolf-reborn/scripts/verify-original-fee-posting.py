"""Original fee posting including real floating money-notice helper."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x426e12,0x59),(0x40c580,0x76)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v&((1<<(8*struct.calcsize(fmt)))-1)))
def get(a,fmt='<i'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def hook(u,a,size,data):
 if a==0x40c580:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))))
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for units in [-2147483648,-32769,-10,-1,0,1,10,32767,2147483647]:
 for i in range(64):
  actor=bytearray(256);struct.pack_into('<ii',actor,0,-1024,3072);actor[0x21]=i%3;hole=bytearray(520);struct.pack_into('<i',hole,0x1fc,2147483647 if i%2 else -2147483648)
  notices=[dict(x=j,z=j+10,units=j+20,ticks=j+30) for j in range(8)];ledger=i%4
  q=dict(actorId=0,globalFlags=0x1000000 if i%3==0 else 0,state=dict(actors={'0':list(actor)},feeUnits=units,totalFeeUnits=2147483647 if i%2 else -2147483648,holeRecords={str(i%3):list(hole)},feeLedgerIndex=ledger,feeLedger={str(j):32767 if j%2 else -32768 for j in range(4)},moneyNoticeIndex=i%8,moneyNotices=notices))
  s=q['state'];u.mem_write(0x577f08,bytes(actor));u.mem_write(0x5744f8+(i%3)*520,bytes(hole));put(0x570a24,s['totalFeeUnits']);put(0x5a5784,ledger,'<H');put(0x599600,i%8);put(0x59d208,q['globalFlags'])
  for j in range(4):put(0x582c60+j*20,s['feeLedger'][str(j)],'<H')
  for j,n in enumerate(notices):
   for key,a in [('x',0x541ee8),('z',0x541f08),('units',0x541ce8),('ticks',0x541e10)]:put(a+j*4,n[key])
  u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ECX,units&0xffffffff);events=[];u.emu_start(0x426e12,0x426e6b,count=300)
  out=json.loads(json.dumps(s));out['totalFeeUnits']=get(0x570a24);out['holeRecords'][str(i%3)]=list(u.mem_read(0x5744f8+(i%3)*520,520));out['feeLedger']={str(j):get(0x582c60+j*20,'<h') for j in range(4)};out['moneyNoticeIndex']=get(0x599600)
  out['moneyNotices']=[{key:get(a+j*4) for key,a in [('x',0x541ee8),('z',0x541f08),('units',0x541ce8),('ticks',0x541e10)]} for j in range(8)]
  rows.append([q,dict(state=out,events=events)])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalFeePosting} from MODULE;for(const [q,out] of JSON.parse(readFileSync(0,'utf8'))){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}const r=originalFeePosting(q);if(!isDeepStrictEqual(r,out))throw Error(JSON.stringify({q,out,r}));}""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-fee-posting.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True);print(len(rows),'native fee postings matched')
(root/'simgolf-reborn/scene/tests/fixtures/original-fee-posting.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
