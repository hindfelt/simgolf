"""Contiguous phrase entry, standard selection and substitution; dispatch, phrase generation and display with actual names; controlled location/CRT."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EBX,UC_X86_REG_EDX,UC_X86_REG_EBP,UC_X86_REG_EAX,UC_X86_REG_EDI,UC_X86_REG_ESI
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x800000,0x40000);u.mem_map(0x100000,0x8000)
for a,n in [(0x4672d0,0xd9a),(0x469080,0xdd),(0x4a0000,1),(0x466a20,0x19),(0x466a00,0x20),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x406b20,0x1c9),(0x466fb0,0x320),(0x46c104,58),(0x45b090,0xbd),(0x466440,0x592),(0x469250,0xd4),(0x407050,0xc0),(0x45b2c0,0x55),(0x40a6c0,0xdc),(0x46c140,0x2c),(0x466e30,0x6c),(0x469330,0x3008),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
events=[];position=0;stage="phrase";dispatchEvents=[];phraseEvents=[];displayEvents=[];preparationEvents=[]
def read(a):return bytes(u.mem_read(a,512)).split(b"\0")[0].decode("ascii")
def get(a,fmt='<I'):return struct.unpack(fmt,u.mem_read(a,struct.calcsize(fmt)))[0]
def reactionState(h,k):
 return dict(seed=get(0x820454),worldDirty=get(0x542c14,'<i'),holeTotal=get(0x574658+h*520,'<h'),remarkCount=get(0x5745d8+h*520+k*2,'<H'),remarkValue=get(0x57466c+h*520+k*2,'<H'),tileFlags=get(0x53ba00+106,'<H'),tileGrowth=get(0x577254+53,'<B'),positive=get(0x5a4dc0+53,'<B'),negative=get(0x56b234+53,'<B'))
def hook(u,a,size,data):
 global position,stage,events,advanced,voiceOffset
 if a==0x467502:
  advanced=True;voiceOffset=u.reg_read(UC_X86_REG_ESI);stage='reaction';events=reactionEvents
  h=get(0x577f08+id*256+0x21,'<b');k=get(0x102128,'<i');q['reactionContext']=dict(difficulty=q['originalMode'],reactionMode=i%3,selectedActorId=id if i%2 else -1,terrainCode=2,state=reactionState(h,k));return
 if a in [0x447a30,0x4a0000]:
  sp=u.reg_read(UC_X86_REG_ESP);n=5 if a==0x447a30 else 1;events.append(dict(address=a,args=list(struct.unpack('<'+'i'*n,u.mem_read(sp+4,n*4)))));return
 if a==0x469075:u.emu_stop();return
 if a==0x467408:stage='preparation';events=preparationEvents;return
 if a==0x40c1f0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))));return
 if a in [0x469330,0x406b20]:
  sp=u.reg_read(UC_X86_REG_ESP);n=4 if a==0x469330 else 2;dispatchEvents.append(dict(address=a,args=list(struct.unpack('<'+'i'*n,u.mem_read(sp+4,n*4)))));stage='phrase' if n==4 else 'display';events=phraseEvents if n==4 else displayEvents;return
 if a==0x466440:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<iiii',u.mem_read(sp+4,16)))));return
 if a==0x4a58bd:
  sp=u.reg_read(UC_X86_REG_ESP);path,mode=struct.unpack('<II',u.mem_read(sp+4,8));events.append(dict(kind='open',path=read(path),mode=read(mode)));position=0;u.reg_write(UC_X86_REG_EAX,0 if q['resourceLines'] is None else 0x101000);return
 if a==0x4a5d5e:
  sp=u.reg_read(UC_X86_REG_ESP);buffer,n,handle=struct.unpack('<III',u.mem_read(sp+4,12));assert n==250 and handle==0x101000;events.append(dict(kind='read',maxBytes=n))
  if position>=len(q['resourceLines']):u.reg_write(UC_X86_REG_EAX,0)
  else:u.mem_write(buffer,q['resourceLines'][position].encode()+b'\0');position+=1;u.reg_write(UC_X86_REG_EAX,buffer)
  return
 if a==0x4a580f:events.append(dict(kind='close'));u.reg_write(UC_X86_REG_EAX,0);return
 if a==0x469250:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<ii',u.mem_read(sp+4,8)))));return
 if a==0x4a5c60:
  sp=u.reg_read(UC_X86_REG_ESP);pointer,needle=struct.unpack('<II',u.mem_read(sp+4,8));index=read(pointer).find(read(needle));u.reg_write(UC_X86_REG_EAX,0 if index<0 else pointer+index);return
 if a==0x4acb95:
  sp=u.reg_read(UC_X86_REG_ESP);args=list(struct.unpack('<iii',u.mem_read(sp+4,12)));
  if stage!='display':events.append(dict(address=a,args=args))
  u.mem_write(args[1],str(args[0]).encode()+b'\0');u.reg_write(UC_X86_REG_EAX,args[1]);return
 if a==0x466fb0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=list(struct.unpack('<ii',u.mem_read(sp+4,8)))));return
 if a not in [0x407050,0x45b2c0,0x40a6c0,0x46c140,0x466e30,0x466fb0,0x4074d0]:return
 if a in [0x407050,0x45b2c0,0x40a6c0,0x466e30,0x46c140]:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4,4))[0]]));return
 sp=u.reg_read(UC_X86_REG_ESP);args=list(struct.unpack('<'+'i'*(2 if a==0x466fb0 else 3),u.mem_read(sp+4,8 if a==0x466fb0 else 12)));events.append(dict(address=a,args=args))
 text=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii')+('Name'+str(args[0]) if a==0x466fb0 else 'Place'+str(args[2]))
 u.mem_write(0x518f78,text.encode()+b'\0');put(0x589be8,12345)
for a in [0x447a30,0x40c1f0,0x4a5c60,0x4a58bd,0x4a5d5e,0x4a580f,0x4acb95,0x4074d0]:u.mem_write(a,b'\xc3')
u.hook_add(UC_HOOK_CODE,hook)
rows=[]
kinds=[50,19,23,1,61,59,54,7,30,58,11,3,28,35,10,22,60,49,62,5,13,37,38,39,51,52,53,2,4,26,31,34,40,42,44,6,8,9,12,14,15,16,17,18,20,21,24,25,27,29,32,33,43,45,46,48,55,56,57,36,41,47,63,64,65,0,-1,66,-2147483648]
for kind in kinds:
 for i in range(2048 if kind==50 else 4096 if kind in [19,23] else 640 if kind==59 else 384):
  id=152 if kind in [19,23] and i%17==16 else i%16;record=[0]*256;record[0xa2:0xa4]=list(struct.pack('<h',id^1));
  if kind==7:record[0x12]=(i//5)%256
  record[0x18]=(i*17)%256;record[0xb6]=i%256
  profile=[-32768,-17,-8,-1,0,1,2,3,4,5,6,7,8,32767][i%14];record[0xb6:0xb8]=list(struct.pack('<h',profile))
  if i<128:record[0xb6:0xb8]=[i,0]
  if kind in [59,28,39,49,62]:record[0xb6:0xb8]=[i%8,0]
  if kind in [2,3,4,11,26,28,5,13,37,38]:
   record[0xae:0xb0]=list(struct.pack('<h',[-32768,-3,-1,0,1,2,3,4,5,32767][i%10]));record[0xa2:0xa4]=list(struct.pack('<h',id^1))
  prefix=['','Near ','Start\0ignored'][i%3];mode=[-1,0,1,2,2147483647][i%5];value=[-1,0,1,2,256][i%5]
  if i<128:value=[-1,0,1,256][i%4]
  q=dict(kind=kind,actorId=id,value=value,originalMode=mode,state=dict(sourceText=prefix,remarkStyle=i,redirected=bool(i%2),actors={str(id):record}))
  if kind==50:
   file=[-1,0,1,2,6,7][i%6];value=[-2147483648,-17,-1,0,1,2,3,15,16,17,18,33,49,2147483647][(i//6)%14];q['value']=value;record[0xb0:0xb2]=list(struct.pack('<h',file));record[0x12]=(record[0x12]&239)|(((i//84)%2)<<4)
   slot=i%8;cache=[dict(fileId=-9,section=-8,variant=-7,text='Old '+str(j)) for j in range(8)]
   if i%3==0:cache[(slot+3)%8]=dict(fileId=file,section=value&15,variant=value>>4,text='Cached\nAlternative')
   q['state'].update(resourceCacheIndex=slot,resourceCache=cache);q.update(resourceFlags=0x10000000 if i%2 else 0,themeName='Current',resourceFileNames={str(file):'sample.txt'},resourceLines=None if i%13==0 else ['First\n',' A\n',' B\n',' C\n','Second\n',' D\n',' E\n','Third\n',' F\n'])
   for j,r in enumerate(cache):u.mem_write(0x8358e0+j*268,struct.pack('<iii',r['fileId'],r['section'],r['variant'])+r['text'].encode()+b'\0')
   put(0x8358d8,slot);put(0x59d208,q['resourceFlags']);u.mem_write(0x566238,b'Current\0');u.mem_write(0x539364+50*file,b'sample.txt\0')
  if kind in [19,23]:
   h=i%18;q['holeIndex']=h;par=4 if i<3072 else [3,4,5,127,128,255][i%6];stroke=(par+[-5,-4,-3,-2,-1,0,1,2,3,4][i%10])&255;record[0x23+h]=stroke;record[0x19]=(i//11)%8;record[0xae]=[0,2,4,3][(i//7)%4];partner=id^1;record[0xa2:0xa4]=list(struct.pack('<h',partner));other=[0]*256;other[0x23+h]=(i//15)%12;q['state']['actors'][str(partner)]=other;u.mem_write(0x577f08+partner*256,bytes(other));current=[0]*520;current[8]=par;following=[0]*520;flags=[0,4,8,12,256,512,1024,1792,260,520,1036,1804][(i//10)%12];following[:4]=list(struct.pack('<I',flags));q['holeRecords']={str(h):current,str(h+1):following};u.mem_write(0x5744f8+h*520,bytes(current));u.mem_write(0x5744f8+(h+1)*520,bytes(following));u.reg_write(UC_X86_REG_EBP,h);q['value']=value=[-1,0,1,2,3,4,5,6,7,8,127,128][(i//13)%12]
  if kind==1:
   record[0xb6:0xb8]=[i%4,0];record[0xae]=(i//4)%2;record[0xa2:0xa4]=list(struct.pack('<h',id^1));other=[0]*256;otherProfile=(i//8)%8;other[0xb6]=otherProfile;q['state']['actors'][str(id^1)]=other;u.mem_write(0x577f08+(id^1)*256,bytes(other));pr=[0]*560;pr[0x21]=i%256;q['profileRecords']={str(otherProfile):pr};u.mem_write(0x4d5040+otherProfile*560,bytes(pr))
  if kind==61:q['value']=value=[-2147483648,-1,0,2,3,4,5,6,7,8,2147483647][(i//2)%11]
  if kind==59:
   h=i%18;q['holeIndex']=h;q['mutateProfile']=i>=384;profile=i%8;history=[0]*44;history[h]=(i//72)%2;history[19+h]=i%256;q['profileHistory']={str(profile):history};u.mem_write(0x583433+44*profile,bytes(history));records={str(h):[0]*520,str(h+1):[0]*520};records[str(h)][8]=[3,4,5][(i//9)%3];records[str(h+1)][0]=(i//18)%4;q['holeRecords']=records
   for j,r in records.items():u.mem_write(0x5744f8+int(j)*520,bytes(r))
   offset=[-1,0][(i//144)%2];q['holeNameOffsets']={str(h):offset};q['holeNameStrings']={str(offset):'Custom hole'};u.mem_write(0x59c26c+2*h,struct.pack('<h',offset));u.mem_write(0x56e700+offset,b'Custom hole\0');u.reg_write(UC_X86_REG_EBP,h)
  if kind==54:q['value']=value=[-2147483648,-1,*range(15),2147483647][i%18]
  if kind==30:
   h=i%18;q['holeIndex']=h;records={str(j):[0]*520 for j in [h-1,h,h+1]};records[str(h)][0]=[0,32,64,96][i%4];records[str(h+1)][0]=[0,32,64,96][(i//4)%4];par=[0,3,4,5,127,128,255][(i//16)%7];records[str(h)][8]=par;records[str(h-1)][8]=par if (i//112)%2 else (par+1)%256;q['holeRecords']=records
   for j,r in records.items():u.mem_write(0x5744f8+int(j)*520,bytes(r))
   u.reg_write(UC_X86_REG_EBP,h)
  if kind in [10,22,60]:
   value=i%23;q['value']=value;name=['tree','rocks','ROCKS','grass','s','','pond\0ignored'][i%7]
   if kind==22:
    q['objectNames']={str(value):name};u.mem_write(0x55c648+37*value,name.encode()+b'\0')
   else:
    term=dict(name=name,type=[0,13,269,-243,255][(i//7)%5],precedingByte=[0,115,255][(i//35)%3]);q['terms']={str(value):term}
    address=0x576da0+48*value;u.mem_write(address,name.encode()+b'\0');u.mem_write(address+38,bytes([term['type']&255]));u.mem_write(address-1,bytes([term['precedingByte']]))
  if kind in [28,39,49,62]:
   profile=[0]*560;profile[0x21]=i%256;profile[0x22]=i%20;name=('Profile '+str(i%8)).encode();profile[:len(name)]=name;q['profileRecords']={str(i%8):profile};u.mem_write(0x4d5040+(i%8)*560,bytes(profile))
  if kind==62:
   q['profileRemarks']=['Profile line '+str(j) for j in range(40)]
   for j,line in enumerate(q['profileRemarks']):u.mem_write(0x4d45a4+68*j,line.encode()+b'\0')
  if kind==35:
   target=[-2147483648,-321,-320,-319,-81,-80,-79,-1,0,1,79,80,81,159,160,239,240,319,320,2147483647][i%20];clock=(target-45*id)&0xffffffff;q['originalClock']=clock if clock<2147483648 else clock-4294967296;put(0x831828,q['originalClock'])
  if kind in [51,52,53]:
   q['originalClock']=[-2147483648,-17,-1,0,1,7,8,15,2147483647][i%9];q['facilityLevels']={name:[-1,0,1,2,3,4,2147483647][(i//9+j)%7] for j,name in enumerate(['drivingRange','proShop','puttingGreen'])}
   put(0x831828,q['originalClock'])
   for name,address in [('drivingRange',0x5a76a8),('proShop',0x5a76a0),('puttingGreen',0x5a7698)]:put(address,q['facilityLevels'][name])
  if kind<1 or kind>65 or value not in [-1,0,1,2,3]:continue
  if any(not 0<=struct.unpack('<h',bytes(r[0xb6:0xb8]))[0]<8 for r in q['state']['actors'].values()):continue
  q['mutateProfile']=False
  if str(id^1) not in q['state']['actors']:q['state']['actors'][str(id^1)]=[0]*256
  for j,r in q['state']['actors'].items():u.mem_write(0x577f08+int(j)*256,bytes(r))
  profileId=struct.unpack('<h',bytes(record[0xb6:0xb8]))[0];q.setdefault('profileRecords',{}).setdefault(str(profileId),[0]*560)
  for j,r in q['profileRecords'].items():u.mem_write(0x4d5040+int(j)*560,bytes(r))
  record[0x70]=35 if i%3==0 else 0
  q['names']=dict(profileNames=['Golfer '+str(j) for j in range(8)],staffNames=['Staff '+str(j) for j in range(8)],clubName='Willow',clubSequence=i%10,secondaryName='Grove')
  for j,name in enumerate(q['names']['profileNames']):u.mem_write(0x4d5050+j*560,name.encode()+b'\0')
  for j,name in enumerate(q['names']['staffNames']):u.mem_write(0x58c7a0+j*56,name.encode()+b'\0')
  u.mem_write(0x106000,b'Willow\0');u.mem_write(0x106100,b'Grove\0');put(0x4c1c08,0x106000);put(0x4c1c10,0x106100);put(0x539360,i%10)
  q['combined']=q.get('holeIndex',1)*11;q['requestCodes']=[254,255];q['profilePhrases']=[]
  if value!=-1:
   term=q.get('terms',{}).get(str(value),dict(name='Ground',alternate='Tree',type=0));term.setdefault('alternate','Tree');q.setdefault('terms',{})[str(value)]=term
   u.mem_write(0x576da0+48*value,term['name'].encode()+b'\0');u.mem_write(0x576db0+48*value,term['alternate'].encode()+b'\0');u.mem_write(0x576dc6+48*value,bytes([term['type']&255]));q['labels']=['Label'+str(j) for j in range(4)]
   for j,label in enumerate(q['labels']):u.mem_write(0x4c0990+18*j,label.encode()+b'\0')
  # Some runs select a personal override containing every substitution marker.
  if i%7==0 and id<152:
   profile=struct.unpack('<h',bytes(record[0xb6:0xb8]))[0]
   if profile>=0 and profile<128 and 0<=kind<128:
    q['requestCodes']=[kind,255];q['profilePhrases']={str(profile):['MYNAME PARTNER DATA']};u.mem_write(0x542c20+profile*1250,b'MYNAME PARTNER DATA\0')
  record[0x21]=q['combined']//11;record[0x22]=[0,1,9,10,127][i%5]
  q['globalFlags']=q.get('resourceFlags',0)|(0x2000000 if i%13==0 else 0);put(0x59d208,q['globalFlags'])
  if kind==19:
   h=q['combined']//11;current=q['holeRecords'][str(h)];current[0x28:0x2c]=list(struct.pack('<i',[9,10,11][i%3]));u.mem_write(0x5744f8+h*520,bytes(current))
  record[:8]=list(struct.pack('<ii',1024,3072));h=record[0x21]
  put(0x820454,123+i);put(0x542c14,0);put(0x542c04,i%3);put(0x5a4440,id if i%2 else -1)
  for j in range(66):
   u.mem_write(0x5745d8+h*520+j*2,struct.pack('<H',i%7));u.mem_write(0x57466c+h*520+j*2,struct.pack('<H',i%17))
  for a,v in [(0x570d38+53,2),(0x577254+53,0),(0x5a4dc0+53,0),(0x56b234+53,0)]:u.mem_write(a,bytes([v]))
  u.mem_write(0x53ba00+106,struct.pack('<H',0))
  q['state'].update(priority=[0,1,127,128,255][i%5],displayText='Previous display',requestValues=[0]*66)
  u.mem_write(0x568258,b'Previous display\0');u.mem_write(0x5a8718,bytes([q['state']['priority']]))
  for j in range(66):put(0x836460+j*4,0)
  u.mem_write(0x4c1d00,bytes(q['requestCodes']))
  u.mem_write(0x577f08+id*256,bytes(record));u.mem_write(0x518f78,prefix.encode()+b'\0');put(0x589be8,i);put(0x820344,mode);put(0x53f8b8,int(q['state']['redirected']));before=bytes(u.mem_read(0x518f78,512));events=[]
  u.reg_write(UC_X86_REG_ESP,0x102000);put(0x102000+0x4e0,kind);put(0x102000+0x4e4,value);put(0x102000+0x4ec,id);u.reg_write(UC_X86_REG_EBX,id);u.reg_write(UC_X86_REG_EDX,kind&0xffffffff)
  dispatchEvents=[];phraseEvents=[];displayEvents=[];preparationEvents=[];reactionEvents=[];advanced=False;voiceOffset=None;put(0x102120,0x401000);put(0x102124,id);put(0x102128,kind);put(0x10212c,value);u.reg_write(UC_X86_REG_ESP,0x102120);u.emu_start(0x4672d0,0x46806a,count=40000);assert u.reg_read(UC_X86_REG_EIP) in [0x46806a,0x469075];finished=u.reg_read(UC_X86_REG_EIP)==0x46806a;allowed=bool(dispatchEvents)
  expected=json.loads(json.dumps(q['state']));expected['actors'][str(id)]=list(u.mem_read(0x577f08+id*256,256));expected['sourceText']=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('ascii');expected['remarkStyle']=struct.unpack('<I',u.mem_read(0x589be8,4))[0]
  # With no appends, the JS buffer may retain data beyond C-string termination.
  if bytes(u.mem_read(0x518f78,512))==before:expected['sourceText']=prefix
  if kind==50:
   expected['resourceCacheIndex']=struct.unpack('<h',u.mem_read(0x8358d8,2))[0];expected['resourceCache']=[]
   for j in range(8):
    a=0x8358e0+j*268;f,s,v=struct.unpack('<iii',u.mem_read(a,12));expected['resourceCache'].append(dict(fileId=f,section=s,variant=v,text=read(a+12)))
  expected['redirected']=bool(struct.unpack('<I',u.mem_read(0x53f8b8,4))[0])
  expected['actors']={j:list(u.mem_read(0x577f08+int(j)*256,256)) for j in q['state']['actors']};expected['priority']=u.mem_read(0x5a8718,1)[0];expected['displayText']=read(0x568258);expected['requestValues']=[struct.unpack('<i',u.mem_read(0x836460+j*4,4))[0] for j in range(66)]
  receiver=struct.unpack('<h',bytes(expected['actors'][str(id)][0xa2:0xa4]))[0] if expected['redirected'] else id
  reaction=None
  if advanced:
   k=dispatchEvents[0]['args'][0];h=record[0x21];rs=reactionState(h,k);rs['actor']=expected['actors'][str(id)];rs['profiles']={j:r[0x20] for j,r in q['profileRecords'].items()};rs['profileVoiceBytes']={j:r[0x21] for j,r in q['profileRecords'].items()};rs['holeBytes']={str(j)+':'+str(n):v for j,r in q.get('profileHistory',{}).items() for n,v in enumerate(r)}
   delta=u.reg_read(UC_X86_REG_EBX);delta=delta if delta<2147483648 else delta-4294967296
   reaction=dict(state=rs,next='continue' if finished else 'return',delta=delta,randomDraws=1 if finished else 0,events=reactionEvents,selectedDelta=get(0x102018,'<i') if finished else 0)
  rows.append([q,dict(state=expected,events=dispatchEvents,phraseEvents=phraseEvents,displayEvents=displayEvents,receiver=receiver if allowed else None,allowed=allowed,kind=dispatchEvents[0]['args'][0] if allowed else kind,next='continue' if finished else 'return',before=list(u.mem_read(0x102020,256)) if advanced else None,voiceOffset=voiceOffset,preparationEvents=preparationEvents,reaction=reaction)])
module=(root/'simgolf-reborn/scene/src/simulation/original-reacted-remark.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalReactedRemark} from MODULE;import {originalActorName} from NAMES;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){if(q.profileHistory)for(const id in q.profileHistory)q.profileHistory[id]=Uint8Array.from(q.profileHistory[id]);if(q.holeRecords)for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);if(q.profileRecords)for(const id in q.profileRecords)q.profileRecords[id]=Uint8Array.from(q.profileRecords[id]);for(const s of [q.state,expected.state])for(const id in s.actors)s.actors[id]=Uint8Array.from(s.actors[id]);if(expected.before)expected.before=Uint8Array.from(expected.before);if(expected.reaction)expected.reaction.state.actor=Uint8Array.from(expected.reaction.state.actor);const got=originalReactedRemark(q,(e,s)=>{if(e.address===0x466fb0){s.sourceText=originalActorName({...q.names,actorId:e.args[0],actor:s.actors[e.args[0]],sourceText:s.sourceText,appendComma:!!e.args[1]});return s;}return {...s,remarkStyle:12345,sourceText:s.sourceText.split('\\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[2])};},()=>q.resourceLines,(e,s)=>s,()=>q.reactionContext,(e,s)=>({state:s,result:0}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({kind:q.kind,value:q.value,expected:{...expected,state:{...expected.state,actors:null}},got:{...got,state:{...got.state,actors:null}}}));}console.log(`${rows.length} native reacted remark cases matched`);""".replace('MODULE',json.dumps(module)).replace('NAMES',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-actor-name.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
# Retain each combination that changes text/style within each dispatch case.
seen=set();fixture=[]
for row in rows:
 q,out=row;key=(q['kind'],out['allowed'],out['kind'],out['next'],out['voiceOffset'],out['state']['sourceText'],out['state']['remarkStyle'],tuple(q['requestCodes']))
 if key not in seen:seen.add(key);fixture.append(row)
(root/'simgolf-reborn/scene/tests/fixtures/original-reacted-native.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
