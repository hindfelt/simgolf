"""Continuous fee assessment through settlement; controlled speech/name/formatting boundaries."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ECX,UC_X86_REG_EBX,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000);u.mem_map(0x820000,0x1000)
for a,n in [(0x426be5,0x286),(0x40c580,0x76),(0x40c7f0,0xf7),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
for a in [0x40c1f0,0x466fb0,0x4acb95]:u.mem_write(a,b'\xc3')
def text(a,v):u.mem_write(a,v.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,1024)).split(b'\0')[0].decode()
def put(a,v,fmt='<I'):u.mem_write(a,struct.pack(fmt,v&((1<<(8*struct.calcsize(fmt)))-1)))
def get(a,fmt='<i'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def hook(u,a,size,data):
 if a==0x40c1f0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))))
  if q['speechMutation']:put(0x4c1848,77);put(0x820454,999)
  return
 if a==0x466fb0:
  events.append(dict(address=a,args=[0,0]));text(0x518f78,'Gary');return
 if a==0x4acb95:
  sp=u.reg_read(UC_X86_REG_ESP);v,buffer,base=struct.unpack('<iii',u.mem_read(sp+4,12));assert base==10;text(buffer,str(v));u.reg_write(UC_X86_REG_EAX,buffer);return
 if a==0x40c7f0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iii',u.mem_read(sp+4,12)))));return
 if a==0x40c580:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))))
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for units in [-2147483648,-32769,-10,-1,0,1,10,32767,2147483647]:
 for i in range(128):
  actor=bytearray(256);struct.pack_into('<ii',actor,0,-1024,3072);actor[0x21]=i%3;hole=bytearray(520);struct.pack_into('<i',hole,0x1fc,2147483647 if i%2 else -2147483648)
  notices=[dict(x=j,z=j+10,units=j+20,ticks=j+30) for j in range(8)];ledger=(i//4)%4
  q=dict(actorId=0,globalFlags=(0x1000000 if i%3==0 else 0)|(0x200000 if i%7==0 else 0),names=dict(profileNames=["Gary"]),difficulty=i%3,state=dict(actors={'0':list(actor)},feeUnits=units,cashUnits=2147483647 if i%2 else -2147483648,holeRecords={str(i%3):list(hole)},feeLedgerIndex=ledger,feeLedger={str(j):0 if i%2==0 else 32767 for j in range(4)},moneyNoticeIndex=i%8,moneyNotices=notices))
  struct.pack_into('<h',actor,0xa4,((units+32768)%65536)-32768);q['state']['actors']['0']=list(actor)
  following=bytearray(520);struct.pack_into('<I',following,0,i%4);q['state']['holeRecords'][str(i%3+1)]=list(following);u.mem_write(0x5744f8+(i%3+1)*520,bytes(following))
  q.update(holeRecords=q['state']['holeRecords'],profileTiers={'0':i%8},reactionMode=(i//8)%4,feeBonus=[0,1,-3,2147483647][(i//32)%4],speechMutation=bool(i%3==0))
  put(0x542c04,q['reactionMode']);put(0x542be8,q['feeBonus']);u.mem_write(0x583432,bytes([i%8]))
  q['state'].update(sourceText='Previous',feeMessageActor=9,feeTutorialStage=7,seed=123,popupActive=i%2,popupPending=i%3,popupMode=3 if i%5==0 else 0,popupStyle=0,popupActor=-1,popupLifetime=9,popupDuration=23,popupX=7,popupY=11,popupText='Previous popup')
  for key,a in [('feeUnits',0x4c1848),('feeMessageActor',0x4c1dfc),('feeTutorialStage',0x5a8714),('seed',0x820454),('popupPending',0x53ce64),('popupMode',0x566a0c),('popupStyle',0x5a1f38),('popupActor',0x4c1df8),('popupLifetime',0x5a5b8c),('popupDuration',0x568154),('popupX',0x56bbf8),('popupY',0x56bbfc)]:put(a,q['state'][key])
  u.mem_write(0x568148,bytes([q['state']['popupActive']]));text(0x5a5788,'Previous popup');text(0x518f78,'Previous');put(0x820344,q['difficulty'])
  s=q['state'];u.mem_write(0x577f08,bytes(actor));u.mem_write(0x5744f8+(i%3)*520,bytes(hole));put(0x570a24,s['cashUnits']);put(0x5a5784,ledger,'<H');put(0x599600,i%8);put(0x59d208,q['globalFlags'])
  for j in range(4):put(0x582c60+j*20,s['feeLedger'][str(j)],'<H')
  for j,n in enumerate(notices):
   for key,a in [('x',0x541ee8),('z',0x541f08),('units',0x541ce8),('ticks',0x541e10)]:put(a+j*4,n[key])
  u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,0);u.reg_write(UC_X86_REG_ECX,units&0xffffffff);u.reg_write(UC_X86_REG_EBX,0);events=[];u.emu_start(0x426be5,0x426e6b,count=4000)
  out=json.loads(json.dumps(s));out['cashUnits']=get(0x570a24);out['holeRecords'][str(i%3)]=list(u.mem_read(0x5744f8+(i%3)*520,520));out['feeLedger']={str(j):get(0x582c60+j*20,'<h') for j in range(4)};out['moneyNoticeIndex']=get(0x599600)
  out['moneyNotices']=[{key:get(a+j*4) for key,a in [('x',0x541ee8),('z',0x541f08),('units',0x541ce8),('ticks',0x541e10)]} for j in range(8)]
  for key,a in [('feeMessageActor',0x4c1dfc),('feeTutorialStage',0x5a8714),('seed',0x820454),('popupPending',0x53ce64),('popupMode',0x566a0c),('popupStyle',0x5a1f38),('popupLifetime',0x5a5b8c),('popupX',0x56bbf8),('popupY',0x56bbfc)]:out[key]=get(a,'<I')
  out['feeUnits']=get(0x4c1848)
  out['popupActor']=get(0x4c1df8);out['popupDuration']=get(0x568154);out['popupActive']=get(0x568148,'<B');out['sourceText']=read(0x518f78);out['popupText']=read(0x5a5788)
  rows.append([q,dict(state=out,events=events,popupRandomDraws=2 if any(e['address']==0x40c7f0 for e in events) and q['state']['popupMode']!=3 else 0,posted=not bool(q['globalFlags']&0x200000))])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalCompleteFee} from MODULE;for(const [q,out] of JSON.parse(readFileSync(0,'utf8'))){for(const s of [q.state,out.state]){s.actors[0]=Uint8Array.from(s.actors[0]);for(const id in s.holeRecords)s.holeRecords[id]=Uint8Array.from(s.holeRecords[id]);}for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);const r=originalCompleteFee(q,(e,s)=>q.speechMutation?{...s,feeUnits:77,seed:999}:s);if(!isDeepStrictEqual(r,out))throw Error(JSON.stringify({q,out,r}));}""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-complete-fee.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True);print(len(rows),'native complete fees matched')
(root/'simgolf-reborn/scene/tests/fixtures/original-complete-fee.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
